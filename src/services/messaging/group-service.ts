/**
 * Group Service - Manages group conversation operations
 * Feature 010: Group Chats
 *
 * Responsibilities:
 * - Create group conversations
 * - Add/remove members
 * - Transfer ownership
 * - Upgrade 1-to-1 to group
 * - Leave group
 * - Delete group
 */

import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import { GroupKeyService } from '@/services/messaging/group-key-service';
import { keyManagementService } from '@/services/messaging/key-service';
import { createLogger } from '@/lib/logger';
import type {
  CreateGroupInput,
  AddMembersInput,
  AddMembersResult,
  TransferOwnershipInput,
  UpgradeToGroupInput,
  GroupConversation,
  ConversationMember,
} from '@/types/messaging';
import {
  GROUP_CONSTRAINTS,
  MembershipError,
  GroupError,
  AuthenticationError,
  ValidationError,
} from '@/types/messaging';

const logger = createLogger('messaging:group');

/**
 * Result of group creation including conversation and members
 */
export interface CreateGroupResult {
  conversation: GroupConversation;
  members: ConversationMember[];
}

/**
 * GroupService handles all group conversation operations
 */
export class GroupService {
  private supabase = createClient();
  private groupKeyService = new GroupKeyService();

  /**
   * Create a new group conversation
   * T023: Validate members, create conversation with is_group=true, add conversation_members entries
   * T024: Generate key, encrypt for each member, store in group_keys
   * T025: Integrate key distribution into createGroup() flow
   *
   * @param input - Group creation parameters
   * @returns Created group conversation with members
   * @throws GroupError if creation fails
   * @throws MembershipError if member validation fails
   * @throws AuthenticationError if not authenticated
   */
  async createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to create a group');
    }

    const { name, member_ids } = input;

    // Validation: Check member count
    if (!member_ids || member_ids.length === 0) {
      throw new MembershipError(
        `Group must have at least ${GROUP_CONSTRAINTS.MIN_MEMBERS - 1} other members`,
        'AT_CAPACITY'
      );
    }

    // Total members = creator + member_ids
    const totalMembers = member_ids.length + 1;
    if (totalMembers > GROUP_CONSTRAINTS.MAX_MEMBERS) {
      throw new MembershipError(
        `Group cannot exceed ${GROUP_CONSTRAINTS.MAX_MEMBERS} members`,
        'AT_CAPACITY'
      );
    }

    // Validation: Check for duplicates
    const uniqueMembers = new Set(member_ids);
    if (uniqueMembers.size !== member_ids.length) {
      throw new ValidationError('Duplicate member IDs provided', 'member_ids');
    }

    // Validation: Check self not in member list
    if (member_ids.includes(user.id)) {
      throw new ValidationError(
        'Cannot add yourself as a member',
        'member_ids'
      );
    }

    // Validation: Check name length if provided
    if (name && name.length > GROUP_CONSTRAINTS.MAX_NAME_LENGTH) {
      throw new ValidationError(
        `Group name cannot exceed ${GROUP_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
        'name'
      );
    }

    // Validation: Check all members are connected to creator
    const connectedUserIds = await this.getConnectedUserIds(
      user.id,
      member_ids
    );
    const unconnectedMembers = member_ids.filter(
      (id) => !connectedUserIds.has(id)
    );
    if (unconnectedMembers.length > 0) {
      throw new MembershipError(
        'All members must be connected to you',
        'NOT_CONNECTED'
      );
    }

    // Validation: Check creator has encryption keys loaded
    const currentKeys = keyManagementService.getCurrentKeys();
    if (!currentKeys) {
      throw new GroupError(
        'Encryption keys not available. Please unlock messaging first.'
      );
    }

    // Validation: Check all members have public keys (messaging set up)
    const memberKeyCheck = await this.validateMembersHaveKeys(member_ids);
    if (memberKeyCheck.missingKeys.length > 0) {
      throw new MembershipError(
        `Cannot create group: ${memberKeyCheck.missingKeys.length} member(s) have not set up messaging yet`,
        'NOT_CONNECTED'
      );
    }

    const msgClient = createMessagingClient(this.supabase);

    try {
      // Create group conversation
      const { data: conversation, error: convError } = await msgClient
        .from('conversations')
        .insert({
          is_group: true,
          group_name: name || null,
          created_by: user.id,
          current_key_version: 1,
          // participant_1_id and participant_2_id are NULL for groups
        })
        .select(
          'id, is_group, group_name, created_by, current_key_version, created_at, last_message_at'
        )
        .single();

      if (convError || !conversation) {
        throw new GroupError('Failed to create group conversation', convError);
      }

      // Create member entries (owner + members)
      const memberEntries = [
        // Creator as owner
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner' as const,
          key_version_joined: 1,
          key_status: 'active' as const,
        },
        // Other members
        ...member_ids.map((memberId) => ({
          conversation_id: conversation.id,
          user_id: memberId,
          role: 'member' as const,
          key_version_joined: 1,
          key_status: 'active' as const,
        })),
      ];

      const { data: members, error: membersError } = await msgClient
        .from('conversation_members')
        .insert(memberEntries)
        .select(
          'id, conversation_id, user_id, role, joined_at, left_at, key_version_joined, key_status, archived, muted'
        );

      if (membersError || !members) {
        // Rollback: delete conversation
        await msgClient
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
        throw new GroupError('Failed to add group members', membersError);
      }

      // T024-T025: Distribute group key to all members
      const keyResult = await this.groupKeyService.distributeGroupKey(
        conversation.id,
        members as ConversationMember[],
        1 // Initial key version
      );

      // If no members received keys, fail the entire operation and rollback
      if (keyResult.successful.length === 0) {
        logger.error('Failed to distribute group key to any members', {
          conversationId: conversation.id,
          pending: keyResult.pending,
        });
        // Rollback: delete the conversation (cascade deletes members)
        await msgClient
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
        throw new GroupError(
          'Failed to distribute encryption keys. Please try again.'
        );
      }

      // If some members are pending, log warning but continue
      if (keyResult.pending.length > 0) {
        logger.warn('Some members marked pending for key distribution', {
          conversationId: conversation.id,
          pending: keyResult.pending,
          successful: keyResult.successful,
        });
        // Update pending members' key_status
        await msgClient
          .from('conversation_members')
          .update({ key_status: 'pending' })
          .eq('conversation_id', conversation.id)
          .in('user_id', keyResult.pending);
      }

      logger.info('Group created', {
        conversationId: conversation.id,
        memberCount: members.length,
        groupName: name,
      });

      return {
        conversation: {
          id: conversation.id,
          is_group: true,
          group_name: conversation.group_name,
          created_by: conversation.created_by || user.id, // Guaranteed to exist since we just created it
          current_key_version: conversation.current_key_version,
          last_message_at: conversation.last_message_at,
          created_at: conversation.created_at,
        },
        members: members as ConversationMember[],
      };
    } catch (error) {
      if (
        error instanceof GroupError ||
        error instanceof MembershipError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new GroupError('Failed to create group', error);
    }
  }

  /**
   * Get user IDs that have accepted connections with the current user
   * @private
   */
  private async getConnectedUserIds(
    currentUserId: string,
    targetUserIds: string[]
  ): Promise<Set<string>> {
    const { data: connections, error } = await this.supabase
      .from('user_connections')
      .select('requester_id, addressee_id')
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.in.(${targetUserIds.join(',')})),` +
          `and(addressee_id.eq.${currentUserId},requester_id.in.(${targetUserIds.join(',')}))`
      )
      .eq('status', 'accepted');

    if (error) {
      throw new GroupError('Failed to verify connections', error);
    }

    const connectedIds = new Set<string>();
    for (const conn of connections || []) {
      if (conn.requester_id === currentUserId) {
        connectedIds.add(conn.addressee_id);
      } else {
        connectedIds.add(conn.requester_id);
      }
    }

    return connectedIds;
  }

  /**
   * Validate that all members have encryption keys set up
   * @private
   */
  private async validateMembersHaveKeys(memberIds: string[]): Promise<{
    hasKeys: string[];
    missingKeys: string[];
  }> {
    const { data: keys, error } = await this.supabase
      .from('user_encryption_keys')
      .select('user_id')
      .in('user_id', memberIds);

    if (error) {
      logger.error('Failed to check member encryption keys', { error });
      throw new GroupError('Failed to verify member encryption status', error);
    }

    const usersWithKeys = new Set(keys?.map((k) => k.user_id) || []);
    return {
      hasKeys: memberIds.filter((id) => usersWithKeys.has(id)),
      missingKeys: memberIds.filter((id) => !usersWithKeys.has(id)),
    };
  }

  /**
   * Add members to an existing group
   * @param input - Add members parameters
   * @returns Result with added and pending members
   * @throws MembershipError if validation fails
   */
  async addMembers(input: AddMembersInput): Promise<AddMembersResult> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to add members');
    }

    const { conversation_id, member_ids } = input;

    // Verify current user is owner or member (depending on group settings)
    const isOwner = await this.isOwner(conversation_id, user.id);
    if (!isOwner) {
      throw new MembershipError(
        'Only the group owner can add members',
        'NOT_OWNER'
      );
    }

    // Validation: Check member list not empty
    if (!member_ids || member_ids.length === 0) {
      throw new ValidationError(
        'Must provide at least one member to add',
        'member_ids'
      );
    }

    // Validation: Check for duplicates
    const uniqueMembers = new Set(member_ids);
    if (uniqueMembers.size !== member_ids.length) {
      throw new ValidationError('Duplicate member IDs provided', 'member_ids');
    }

    // Validation: Check self not in member list
    if (member_ids.includes(user.id)) {
      throw new ValidationError(
        'Cannot add yourself as a member',
        'member_ids'
      );
    }

    // Get current member count
    const currentCount = await this.getMemberCount(conversation_id);
    const totalAfterAdd = currentCount + member_ids.length;
    if (totalAfterAdd > GROUP_CONSTRAINTS.MAX_MEMBERS) {
      throw new MembershipError(
        `Cannot exceed ${GROUP_CONSTRAINTS.MAX_MEMBERS} members. Currently ${currentCount}, trying to add ${member_ids.length}.`,
        'AT_CAPACITY'
      );
    }

    // Validation: Check all new members are connected to adder
    const connectedUserIds = await this.getConnectedUserIds(
      user.id,
      member_ids
    );
    const unconnectedMembers = member_ids.filter(
      (id) => !connectedUserIds.has(id)
    );
    if (unconnectedMembers.length > 0) {
      throw new MembershipError(
        'All members must be connected to you',
        'NOT_CONNECTED'
      );
    }

    // Check which are already members
    const msgClient = createMessagingClient(this.supabase);
    const { data: existingMembers } = await msgClient
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .in('user_id', member_ids)
      .is('left_at', null);

    const alreadyMembers = new Set(
      (existingMembers || []).map((m) => m.user_id)
    );
    const newMemberIds = member_ids.filter((id) => !alreadyMembers.has(id));

    if (newMemberIds.length === 0) {
      // All members already exist, return empty result
      return { added: [], pending: [], new_key_version: 0 };
    }

    // Get current key version
    const { data: conv } = await msgClient
      .from('conversations')
      .select('current_key_version')
      .eq('id', conversation_id)
      .single();

    const keyVersion = conv?.current_key_version || 1;

    // Add new members
    const memberEntries = newMemberIds.map((memberId) => ({
      conversation_id,
      user_id: memberId,
      role: 'member' as const,
      key_version_joined: keyVersion,
      key_status: 'pending' as const,
    }));

    const { data: addedMembers, error: insertError } = await msgClient
      .from('conversation_members')
      .insert(memberEntries)
      .select(
        'id, conversation_id, user_id, role, joined_at, left_at, key_version_joined, key_status, archived, muted'
      );

    if (insertError) {
      throw new GroupError('Failed to add members', insertError);
    }

    // Distribute keys to new members
    const keyResult = await this.groupKeyService.distributeGroupKey(
      conversation_id,
      addedMembers as ConversationMember[],
      keyVersion
    );

    // Update successfully keyed members
    if (keyResult.successful.length > 0) {
      await msgClient
        .from('conversation_members')
        .update({ key_status: 'active' })
        .eq('conversation_id', conversation_id)
        .in('user_id', keyResult.successful);
    }

    logger.info('Members added to group', {
      conversationId: conversation_id,
      addedCount: newMemberIds.length,
      successfulKeys: keyResult.successful.length,
      pendingKeys: keyResult.pending.length,
    });

    return {
      added: keyResult.successful,
      pending: keyResult.pending,
      new_key_version: keyVersion,
    };
  }

  /**
   * Remove a member from a group (owner only)
   * @param conversationId - Group ID
   * @param userId - User to remove
   * @throws MembershipError if not owner or user not found
   */
  async removeMember(conversationId: string, userId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to remove members');
    }

    // Verify current user is owner
    const isOwner = await this.isOwner(conversationId, user.id);
    if (!isOwner) {
      throw new MembershipError(
        'Only the group owner can remove members',
        'NOT_OWNER'
      );
    }

    // Cannot remove yourself (use leaveGroup instead)
    if (userId === user.id) {
      throw new ValidationError(
        'Cannot remove yourself. Use leaveGroup instead.',
        'userId'
      );
    }

    // Verify target is a member
    const isMember = await this.isMember(conversationId, userId);
    if (!isMember) {
      throw new MembershipError(
        'User is not a member of this group',
        'NOT_MEMBER'
      );
    }

    const msgClient = createMessagingClient(this.supabase);

    // Mark member as left (soft delete) - set key_status to pending as revoked is not a valid value
    const { error } = await msgClient
      .from('conversation_members')
      .update({ left_at: new Date().toISOString(), key_status: 'pending' })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw new GroupError('Failed to remove member', error);
    }

    logger.info('Member removed from group', {
      conversationId,
      removedUserId: userId,
      removedBy: user.id,
    });
  }

  /**
   * Leave a group voluntarily
   * @param conversationId - Group ID
   * @throws MembershipError if owner without transfer
   */
  async leaveGroup(conversationId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to leave group');
    }

    // Verify user is a member
    const isMember = await this.isMember(conversationId, user.id);
    if (!isMember) {
      throw new MembershipError(
        'You are not a member of this group',
        'NOT_MEMBER'
      );
    }

    // Check if user is owner
    const isOwner = await this.isOwner(conversationId, user.id);
    if (isOwner) {
      // Owner must transfer ownership first or delete the group
      const memberCount = await this.getMemberCount(conversationId);
      if (memberCount > 1) {
        throw new MembershipError(
          'You must transfer ownership before leaving, or delete the group',
          'NOT_OWNER' // Closest valid code - owner cannot leave without transferring
        );
      }
      // If owner is last member, delete the group
      await this.deleteGroup(conversationId);
      return;
    }

    const msgClient = createMessagingClient(this.supabase);

    // Mark member as left (soft delete)
    const { error } = await msgClient
      .from('conversation_members')
      .update({ left_at: new Date().toISOString(), key_status: 'pending' })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      throw new GroupError('Failed to leave group', error);
    }

    logger.info('User left group', { conversationId, userId: user.id });
  }

  /**
   * Transfer group ownership to another member
   * @param input - Transfer parameters
   * @throws MembershipError if not owner or target not member
   */
  async transferOwnership(input: TransferOwnershipInput): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to transfer ownership'
      );
    }

    const { conversation_id, new_owner_id } = input;

    // Verify current user is owner
    const isOwner = await this.isOwner(conversation_id, user.id);
    if (!isOwner) {
      throw new MembershipError(
        'Only the group owner can transfer ownership',
        'NOT_OWNER'
      );
    }

    // Verify new owner is a member
    const isMember = await this.isMember(conversation_id, new_owner_id);
    if (!isMember) {
      throw new MembershipError(
        'New owner must be a member of the group',
        'NOT_MEMBER'
      );
    }

    // Cannot transfer to self
    if (new_owner_id === user.id) {
      throw new ValidationError(
        'Cannot transfer ownership to yourself',
        'new_owner_id'
      );
    }

    const msgClient = createMessagingClient(this.supabase);

    // Update old owner to member
    const { error: demoteError } = await msgClient
      .from('conversation_members')
      .update({ role: 'member' })
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id);

    if (demoteError) {
      throw new GroupError('Failed to transfer ownership', demoteError);
    }

    // Update new owner
    const { error: promoteError } = await msgClient
      .from('conversation_members')
      .update({ role: 'owner' })
      .eq('conversation_id', conversation_id)
      .eq('user_id', new_owner_id);

    if (promoteError) {
      // Rollback - restore old owner
      await msgClient
        .from('conversation_members')
        .update({ role: 'owner' })
        .eq('conversation_id', conversation_id)
        .eq('user_id', user.id);
      throw new GroupError('Failed to transfer ownership', promoteError);
    }

    logger.info('Group ownership transferred', {
      conversationId: conversation_id,
      fromUserId: user.id,
      toUserId: new_owner_id,
    });
  }

  /**
   * Upgrade a 1-to-1 conversation to a group
   * @param input - Upgrade parameters
   * @returns Upgraded group conversation
   */
  async upgradeToGroup(input: UpgradeToGroupInput): Promise<GroupConversation> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to upgrade conversation'
      );
    }

    const { conversation_id, name, member_ids: additionalMemberIds } = input;

    const msgClient = createMessagingClient(this.supabase);

    // Get the current conversation
    const { data: conv, error: convError } = await msgClient
      .from('conversations')
      .select('id, is_group, participant_1_id, participant_2_id, created_by')
      .eq('id', conversation_id)
      .single();

    if (convError || !conv) {
      throw new GroupError('Conversation not found', convError);
    }

    if (conv.is_group) {
      throw new ValidationError(
        'Conversation is already a group',
        'conversation_id'
      );
    }

    // Verify user is a participant
    if (
      conv.participant_1_id !== user.id &&
      conv.participant_2_id !== user.id
    ) {
      throw new MembershipError(
        'You are not a participant in this conversation',
        'NOT_MEMBER'
      );
    }

    const otherParticipantId =
      conv.participant_1_id === user.id
        ? conv.participant_2_id
        : conv.participant_1_id;

    // Collect all member IDs (current participants + additional)
    const allMemberIds = [
      otherParticipantId,
      ...(additionalMemberIds || []),
    ].filter(Boolean) as string[];

    // Validate total member count
    const totalMembers = allMemberIds.length + 1; // +1 for current user
    if (totalMembers > GROUP_CONSTRAINTS.MAX_MEMBERS) {
      throw new MembershipError(
        `Group cannot exceed ${GROUP_CONSTRAINTS.MAX_MEMBERS} members`,
        'AT_CAPACITY'
      );
    }

    // Update conversation to group
    const { data: updatedConv, error: updateError } = await msgClient
      .from('conversations')
      .update({
        is_group: true,
        group_name: name || null,
        created_by: user.id,
        current_key_version: 1,
        // Clear 1-to-1 fields
        participant_1_id: null,
        participant_2_id: null,
      })
      .eq('id', conversation_id)
      .select(
        'id, is_group, group_name, created_by, current_key_version, last_message_at, created_at'
      )
      .single();

    if (updateError || !updatedConv) {
      throw new GroupError('Failed to upgrade conversation', updateError);
    }

    // Create member entries (owner + other participants + additional members)
    const memberEntries = [
      // Current user as owner
      {
        conversation_id,
        user_id: user.id,
        role: 'owner' as const,
        key_version_joined: 1,
        key_status: 'active' as const,
      },
      // All other members
      ...allMemberIds.map((memberId) => ({
        conversation_id,
        user_id: memberId,
        role: 'member' as const,
        key_version_joined: 1,
        key_status: 'pending' as const,
      })),
    ];

    const { data: members, error: membersError } = await msgClient
      .from('conversation_members')
      .insert(memberEntries)
      .select(
        'id, conversation_id, user_id, role, joined_at, left_at, key_version_joined, key_status, archived, muted'
      );

    if (membersError) {
      // Rollback - revert to 1-to-1
      await msgClient
        .from('conversations')
        .update({
          is_group: false,
          group_name: null,
          created_by: null,
          participant_1_id: user.id,
          participant_2_id: otherParticipantId,
        })
        .eq('id', conversation_id);
      throw new GroupError('Failed to create member entries', membersError);
    }

    // Distribute group keys
    const keyResult = await this.groupKeyService.distributeGroupKey(
      conversation_id,
      members as ConversationMember[],
      1
    );

    // Update key status for successful members
    if (keyResult.successful.length > 0) {
      await msgClient
        .from('conversation_members')
        .update({ key_status: 'active' })
        .eq('conversation_id', conversation_id)
        .in('user_id', keyResult.successful);
    }

    logger.info('Conversation upgraded to group', {
      conversationId: conversation_id,
      memberCount: memberEntries.length,
      groupName: name,
    });

    return {
      id: updatedConv.id,
      is_group: true,
      group_name: updatedConv.group_name,
      created_by: updatedConv.created_by || user.id,
      current_key_version: updatedConv.current_key_version,
      last_message_at: updatedConv.last_message_at,
      created_at: updatedConv.created_at,
    };
  }

  /**
   * Delete a group (owner only)
   * @param conversationId - Group ID
   * @throws MembershipError if not owner
   */
  async deleteGroup(conversationId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to delete group');
    }

    // Verify user is owner
    const isOwner = await this.isOwner(conversationId, user.id);
    if (!isOwner) {
      throw new MembershipError(
        'Only the group owner can delete the group',
        'NOT_OWNER'
      );
    }

    const msgClient = createMessagingClient(this.supabase);

    // Delete conversation (cascade will delete members, messages, keys)
    const { error } = await msgClient
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw new GroupError('Failed to delete group', error);
    }

    logger.info('Group deleted', { conversationId, deletedBy: user.id });
  }

  /**
   * Rename a group (owner only)
   * @param conversationId - Group ID
   * @param newName - New group name
   * @throws MembershipError if not owner
   */
  async renameGroup(conversationId: string, newName: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to rename group');
    }

    // Verify user is owner
    const isOwner = await this.isOwner(conversationId, user.id);
    if (!isOwner) {
      throw new MembershipError(
        'Only the group owner can rename the group',
        'NOT_OWNER'
      );
    }

    // Validate name length
    if (newName && newName.length > GROUP_CONSTRAINTS.MAX_NAME_LENGTH) {
      throw new ValidationError(
        `Group name cannot exceed ${GROUP_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
        'name'
      );
    }

    const msgClient = createMessagingClient(this.supabase);
    const { error } = await msgClient
      .from('conversations')
      .update({ group_name: newName || null })
      .eq('id', conversationId);

    if (error) {
      throw new GroupError('Failed to rename group', error);
    }

    logger.info('Group renamed', { conversationId, newName });
  }

  /**
   * Get group members
   * @param conversationId - Group ID
   * @returns List of members with profiles
   */
  async getMembers(conversationId: string): Promise<ConversationMember[]> {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to view members');
    }

    // Verify user is a member of this group
    const isMember = await this.isMember(conversationId, user.id);
    if (!isMember) {
      throw new MembershipError(
        'You are not a member of this group',
        'NOT_MEMBER'
      );
    }

    const msgClient = createMessagingClient(this.supabase);
    const { data: members, error } = await msgClient
      .from('conversation_members')
      .select(
        'id, conversation_id, user_id, role, joined_at, left_at, key_version_joined, key_status, archived, muted'
      )
      .eq('conversation_id', conversationId)
      .is('left_at', null);

    if (error) {
      throw new GroupError('Failed to fetch group members', error);
    }

    return (members || []) as ConversationMember[];
  }

  /**
   * Check if user is a member of the group
   * @param conversationId - Group ID
   * @param userId - User ID
   * @returns True if active member
   */
  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    return !!data;
  }

  /**
   * Check if user is the group owner
   * @param conversationId - Group ID
   * @param userId - User ID
   * @returns True if owner
   */
  async isOwner(conversationId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    return data?.role === 'owner';
  }

  /**
   * Get member count for a group
   * @param conversationId - Group ID
   * @returns Number of active members
   */
  async getMemberCount(conversationId: string): Promise<number> {
    const { count } = await this.supabase
      .from('conversation_members')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .is('left_at', null);

    return count ?? 0;
  }

  /**
   * Generate auto-name from member display names
   * @param members - Member profiles
   * @returns Generated name like "Alice, Bob, Carol" or "Alice, Bob +5 others"
   */
  generateAutoName(members: { display_name: string | null }[]): string {
    const names = members
      .map((m) => m.display_name || 'Unknown')
      .filter(Boolean)
      .slice(0, 3);

    if (members.length <= 3) {
      return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${members.length - 2} others`;
  }
}

// Export singleton instance
export const groupService = new GroupService();

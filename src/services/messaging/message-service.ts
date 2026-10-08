/**
 * Message Service for Encrypted Messaging
 * Tasks: T060-T065
 *
 * Handles encrypted message operations:
 * - Send encrypted messages to connections
 * - Retrieve and decrypt message history
 * - Mark messages as read/delivered
 */

import { createClient } from '@/lib/supabase/client';
import { encryptionService } from '@/lib/messaging/encryption';
import { keyManagementService } from './key-service';
import { offlineQueueService } from '@/lib/offline-queue';
import { cacheService } from '@/lib/messaging/cache';
import { createLogger } from '@/lib/logger';
import {
  createMessagingClient,
  type ConversationRow,
  type MessageRow,
} from '@/lib/supabase/messaging-client';
import type {
  SendMessageInput,
  SendMessageResult,
  Message,
  MessageHistory,
  DecryptedMessage,
  UserProfile,
  EditMessageInput,
} from '@/types/messaging';
import {
  AuthenticationError,
  EncryptionError,
  EncryptionLockedError,
  ConnectionError,
  ValidationError,
  MESSAGE_CONSTRAINTS,
} from '@/types/messaging';

const logger = createLogger('messaging:messages');

/**
 * Detect RLS/permission errors from Supabase read-replica lag.
 * These are transient: the conversation exists on the primary but
 * hasn't replicated yet, so the RLS policy denies the INSERT.
 */
function isRLSError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  // PostgreSQL 42501 = insufficient_privilege (RLS denial)
  if (err.code === '42501') return true;
  // PostgreSQL 23503 = foreign_key_violation (conversation not on replica)
  if (err.code === '23503') return true;
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  if (msg.includes('row-level security')) return true;
  if (msg.includes('violates foreign key constraint')) return true;
  // Supabase PostgREST returns PGRST116 when .single() gets 0 rows.
  // This happens when RLS silently blocks an INSERT — the row is never
  // created, so .select().single() finds nothing.
  if (err.code === 'PGRST116') return true;
  // Catch-all: permission denied variants
  if (msg.includes('permission denied')) return true;
  if (msg.includes('insufficient_privilege')) return true;
  return false;
}

/**
 * Does this message describe a failed fetch, in ANY engine?
 *
 * The three engines word it differently, and missing one silently disables
 * every retry/queue path on that browser:
 *   Chromium  "TypeError: Failed to fetch"
 *   Firefox   "TypeError: NetworkError when attempting to fetch resource."
 *   WebKit    "TypeError: Load failed"          <-- matches neither of the
 *                                                   substrings used before
 * Kept as one predicate so a fourth wording only has to be added once.
 */
function looksLikeFetchFailure(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('load failed')
  );
}

/**
 * Detect transient fetch/network errors that should be retried.
 * Under CI load, Supabase REST API can time out at the fetch layer. These are
 * NOT RLS errors (no .code property) but are equally transient.
 */
function isTransientFetchError(error: unknown): boolean {
  // Both branches share one predicate. They used to differ — the TypeError
  // branch matched 'fetch'/'network' while the object branch matched the
  // narrower 'failed to fetch'/'networkerror' — and neither covered WebKit.
  if (error instanceof TypeError) {
    return looksLikeFetchFailure(error.message);
  }
  if (!error || typeof error !== 'object') return false;

  // Judge the ORIGINAL, not the wrapper. The send path wraps failures as
  // `ConnectionError("Failed to send message: " + original.message, original)`,
  // which concatenates the database's own text into the wrapper — so string
  // matching the wrapper would happily find 'network' inside a constraint name
  // and undo the code gate below. Following `cause` keeps the gate effective
  // after wrapping.
  if (error instanceof Error && error.cause) {
    return isTransientFetchError(error.cause);
  }

  const err = error as Record<string, unknown>;

  // A PostgREST/Postgres rejection ALWAYS carries a code — a SQLSTATE like
  // '23505', or a 'PGRST***'. A fetch-layer failure carries `code: ''` and
  // `status: 0` (postgrest-js builds that envelope in its response .catch).
  // So a non-empty code proves the server answered and refused us, which is
  // never a transport failure no matter what the message happens to contain.
  //
  // Without this gate the predicate is correct only by naming coincidence: it
  // matches 'fetch'/'network' ANYWHERE in the message, and nothing stops a
  // future migration adding, say, a `check_network_*` constraint or a
  // `network_id` column — whose violation message would then be classified as
  // a network failure and silently queued. That failure mode is nasty:
  // `queued: true` shows no error banner at all, the optimistic bubble sits
  // there looking sent, and useOfflineQueue polls every 3s forever because
  // failed rows never clear queueCount.
  //
  // Checked at time of writing: no identifier in the schema contains 'network'
  // or 'fetch'. This makes that a guarantee instead of a coincidence.
  if (typeof err.code === 'string' && err.code !== '') return false;

  return typeof err.message === 'string' && looksLikeFetchFailure(err.message);
}

/**
 * Detect genuine network/offline errors that warrant offline queuing.
 */
function isNetworkError(error: unknown): boolean {
  // `window`, not `navigator`: Node 21+ has a global navigator without
  // `onLine`, so the old guard passed on the server and `!undefined` made
  // EVERY error look like a network error during SSR.
  if (typeof window !== 'undefined' && !window.navigator.onLine) return true;

  // Delegate rather than re-implement. This used to test only
  // `error instanceof TypeError`, while its sibling also matched an object
  // whose `.message` names a fetch failure — and that gap silently discarded
  // users' messages.
  //
  // supabase-js never throws on a failed fetch: postgrest-js catches it and
  // RETURNS `{ error: { message: "TypeError: Failed to fetch", ... }, status: 0 }`
  // (PostgrestBuilder, the `.catch` on the response promise). So when the
  // network drops while `navigator.onLine` is still true — a captive portal, a
  // dropped tunnel, a proxy 500ing — the INSERT sees that object,
  // isTransientFetchError sends it into the RLS-retry loop, the retry aborts
  // too, and because the retry error has no `.code` and is not an RLS error it
  // throws `ConnectionError("Failed to send message: <fetch error>")` on the
  // FIRST inner retry — about two seconds in, not after the retry budget is
  // spent.
  //
  // That ConnectionError is not a TypeError, so the old check returned false,
  // the message was never queued, and messages/page.tsx then deleted the
  // optimistic bubble in its catch — the user's typed text vanished with only
  // an error banner. The offline queue exists precisely for this case and was
  // unreachable in it.
  //
  // isTransientFetchError matches on `.message`, so it recognises both the raw
  // object and the wrapped ConnectionError. Keeping one implementation means
  // "should we retry this?" and "should we queue this?" cannot drift apart
  // again.
  return isTransientFetchError(error);
}

export class MessageService {
  /**
   * Send an encrypted message to a connection
   * Task: T061, T157 (updated for offline queue)
   *
   * Flow:
   * 1. Check if online (navigator.onLine)
   * 2. Initialize sender's keys if needed (lazy generation)
   * 3. Get recipient's public key
   * 4. Encrypt message content
   * 5. If offline: queue message for later sync
   * 6. If online: insert encrypted message to database
   * 7. On send failure: queue message with retry
   * 8. Return result
   *
   * @param input - SendMessageInput
   * @returns Promise<SendMessageResult> - Message and queued status
   * @throws AuthenticationError if not authenticated
   * @throws ValidationError if message invalid or recipient has no keys
   * @throws EncryptionError if encryption fails
   */
  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Validate message content
    const content = input.content.trim();

    if (content.length < MESSAGE_CONSTRAINTS.MIN_LENGTH) {
      throw new ValidationError('Message cannot be empty', 'content');
    }

    if (content.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      throw new ValidationError(
        `Message cannot exceed ${MESSAGE_CONSTRAINTS.MAX_LENGTH} characters`,
        'content'
      );
    }

    // Check offline BEFORE any network requests (Bug fix: sendMessage previously
    // made DB queries before checking navigator.onLine, causing errors that wiped
    // optimistic messages from the UI)
    if (!navigator.onLine) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new AuthenticationError('You must be signed in to send messages');
      }

      const messageId = crypto.randomUUID();
      await offlineQueueService.queueMessage({
        id: messageId,
        conversation_id: input.conversation_id,
        sender_id: session.user.id,
        encrypted_content: '',
        initialization_vector: '',
        plaintext_content: content,
      });

      // Notify the useOfflineQueue hook so it can refresh state and trigger sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('offline-queue-updated'));
      }

      const queuedMessage: Message = {
        id: messageId,
        conversation_id: input.conversation_id,
        sender_id: session.user.id,
        encrypted_content: '',
        initialization_vector: '',
        sequence_number: 0,
        deleted: false,
        edited: false,
        edited_at: null,
        delivered_at: null,
        read_at: null,
        created_at: new Date().toISOString(),
        key_version: 1,
        is_system_message: false,
        system_message_type: null,
      };

      return { message: queuedMessage, queued: true };
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to send messages');
    }

    try {
      // Breadcrumbs for diagnosing silent sendMessage failures.
      //
      // These used to call console.error directly, deliberately bypassing the
      // logger because "production logger silences warn/info" — which meant 13
      // console.error lines in every user's console on every successful send.
      // Diagnostics are a debug concern; if they need to be visible in CI, raise
      // the logger's level there rather than shouting at users.
      const sendTs = Date.now();
      const logStep = (step: string) =>
        logger.debug(`[sendMessage:${sendTs}] ${step}`);

      logStep('1-ensureKeys');
      // Get sender's derived keys. ensureKeys() restores from localStorage
      // if memory is empty (races with page-mount restore effect).
      const senderKeys = await keyManagementService.ensureKeys(user.id);
      if (!senderKeys) {
        throw new EncryptionLockedError(
          'Your encryption keys are not available. Please sign in again to send messages.'
        );
      }
      logStep('2-ensureKeys-ok');

      // Get conversation details with timeout — under 18-shard CI load,
      // the Supabase REST API can hang indefinitely instead of returning
      // an error. Without a timeout, sendMessage() blocks for the full
      // test timeout (45-90s) while the optimistic message stays in the UI.
      logStep('3-conversation-query');
      const QUERY_TIMEOUT = 15000;
      const conversationQuery = msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id, is_group')
        .eq('id', input.conversation_id)
        .single();

      const { data: conversation, error: convError } = await Promise.race([
        conversationQuery,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Conversation query timed out after 15s')),
            QUERY_TIMEOUT
          )
        ),
      ]);

      if (convError || !conversation) {
        logStep(`4-conversation-FAIL: ${convError?.message || 'no data'}`);

        // Do not blame the conversation for a network fault. This lookup sits
        // OUTSIDE the inner try that owns the offline-queue decision, so a
        // fetch failure here used to surface as "Conversation not found" — a
        // confident, wrong diagnosis — and messages/page.tsx then deleted the
        // user's optimistic bubble.
        //
        // The message is not queued here on purpose: it has not been encrypted
        // yet (encryption needs the recipient key fetched further down), so
        // queuing would write PLAINTEXT to IndexedDB. That is the exposure in
        // GHSA-94f4-7f3v-g4g5, and widening a live security finding to fix a
        // UX bug is the wrong trade. The page keeps the text in the composer
        // instead, so nothing is lost and nothing is persisted in the clear.
        if (isTransientFetchError(convError)) {
          throw new ConnectionError(
            'Could not reach the server. Check your connection and try again.',
            convError
          );
        }
        throw new ValidationError('Conversation not found', 'conversation_id');
      }
      logStep('4-conversation-ok');

      // For 1-to-1 conversations, determine recipient ID
      // Group conversations use symmetric encryption (handled separately in Phase 4)
      if (conversation.is_group) {
        throw new ValidationError(
          'Group message encryption not yet implemented',
          'conversation_id'
        );
      }

      const recipientId =
        conversation.participant_1_id === user.id
          ? conversation.participant_2_id
          : conversation.participant_1_id;

      if (!recipientId) {
        throw new ValidationError(
          'Invalid conversation: no recipient found',
          'conversation_id'
        );
      }

      // Get recipient's public key
      const recipientPublicKey =
        await keyManagementService.getUserPublicKey(recipientId);

      if (!recipientPublicKey) {
        logStep('6-recipientKey-MISSING');
        throw new ValidationError(
          "This person needs to sign in before you can message them. Messages cannot be delivered until they've logged in at least once to set up encryption.",
          'conversation_id'
        );
      }
      logStep('6-recipientKey-ok');

      // Import recipient's public key
      const recipientPublicKeyCrypto = await crypto.subtle.importKey(
        'jwk',
        recipientPublicKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        false,
        []
      );

      // Derive shared secret using sender's derived private key
      logStep('7-deriveSharedSecret');
      const sharedSecret = await encryptionService.deriveSharedSecret(
        senderKeys.privateKey,
        recipientPublicKeyCrypto
      );

      // Encrypt message content
      logStep('8-encryptMessage');
      const encrypted = await encryptionService.encryptMessage(
        content,
        sharedSecret
      );
      logStep('9-INSERT');

      // Online - attempt to send to database
      // (Offline case is handled at the top of sendMessage, before any network calls)
      //
      // Retry loop: two concurrent senders can read the same max sequence_number
      // and race to INSERT. The loser hits a unique-constraint violation (23505).
      // Re-read the max and retry instead of dropping the message.
      try {
        const MAX_SEQUENCE_RETRIES = 3;
        let message: Message | undefined;

        for (let attempt = 0; attempt < MAX_SEQUENCE_RETRIES; attempt++) {
          // Get next sequence number for this conversation
          const { data: lastMessage } = await msgClient
            .from('messages')
            .select('sequence_number')
            .eq('conversation_id', input.conversation_id)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single();

          const nextSequenceNumber = lastMessage
            ? lastMessage.sequence_number + 1
            : 1;

          // Insert encrypted message
          const { data, error: insertError } = await msgClient
            .from('messages')
            .insert({
              conversation_id: input.conversation_id,
              sender_id: user.id,
              encrypted_content: encrypted.ciphertext,
              initialization_vector: encrypted.iv,
              sequence_number: nextSequenceNumber,
              deleted: false,
              edited: false,
              // delivered_at left null — recipient marks as delivered when they receive it
            })
            .select()
            .single();

          if (!insertError) {
            logStep(`10-INSERT-ok: ${data?.id}`);
            message = data;
            break;
          }
          logStep(`10-INSERT-FAIL: ${insertError.code} ${insertError.message}`);

          // PostgreSQL 23505 = unique_violation (sequence number conflict)
          if (
            insertError.code === '23505' &&
            attempt < MAX_SEQUENCE_RETRIES - 1
          ) {
            logger.warn('Sequence number conflict, retrying', {
              attempt: attempt + 1,
              conversation_id: input.conversation_id,
            });
            await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
            continue;
          }

          // RLS/permission errors OR transient fetch failures — retry with
          // backoff. Under 18-shard CI load, the Supabase REST API can either:
          // 1. Return RLS errors (replica lag: conversation not replicated yet)
          // 2. Timeout with TypeError("Failed to fetch") (API overloaded)
          // Both are transient and resolve with exponential backoff (46s max).
          if (isRLSError(insertError) || isTransientFetchError(insertError)) {
            logger.warn('Transient error on INSERT, retrying with backoff', {
              code: insertError.code,
              message: insertError.message,
              conversation_id: input.conversation_id,
            });

            const MAX_RLS_RETRIES = 5;
            let rlsResolved = false;
            for (let rlsRetry = 0; rlsRetry < MAX_RLS_RETRIES; rlsRetry++) {
              const delay = Math.min(2000 * Math.pow(2, rlsRetry), 16000);
              await new Promise((r) => setTimeout(r, delay));
              logger.info(
                `RLS retry ${rlsRetry + 1}/${MAX_RLS_RETRIES} (waited ${delay}ms)`
              );

              const { data: lastMsg } = await msgClient
                .from('messages')
                .select('sequence_number')
                .eq('conversation_id', input.conversation_id)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .single();

              const retrySeq = lastMsg ? lastMsg.sequence_number + 1 : 1;

              const { data: retryData, error: retryErr } = await msgClient
                .from('messages')
                .insert({
                  conversation_id: input.conversation_id,
                  sender_id: user.id,
                  encrypted_content: encrypted.ciphertext,
                  initialization_vector: encrypted.iv,
                  sequence_number: retrySeq,
                  deleted: false,
                  edited: false,
                })
                .select()
                .single();

              if (!retryErr) {
                message = retryData;
                rlsResolved = true;
                logger.info('RLS retry succeeded', { attempt: rlsRetry + 1 });
                break;
              }

              if (retryErr.code === '23505') continue;
              if (!isRLSError(retryErr)) {
                // Carry the original as `cause`. The queue decision downstream
                // needs the PostgREST `code` to tell a dead socket from a
                // server rejection, and concatenating the message into a
                // wrapper throws that away.
                throw new ConnectionError(
                  'Failed to send message: ' + retryErr.message,
                  retryErr
                );
              }
            }

            if (rlsResolved) break;
            throw new ConnectionError(
              'Message send failed: conversation not accessible (read-replica lag exceeded retries)'
            );
          }

          // Non-retryable error or retries exhausted
          throw new ConnectionError(
            'Failed to send message: ' + insertError.message,
            insertError
          );
        }

        if (!message) {
          throw new ConnectionError(
            'Failed to send message after sequence retries'
          );
        }

        // Update conversation's last_message_at
        await msgClient
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', input.conversation_id);

        return {
          message,
          queued: false, // Not queued (successful send)
        };
      } catch (sendError) {
        // A genuine failure, so error level is right — but through the logger,
        // not raw console.
        logger.error('[sendMessage] INSERT failed', {
          error: sendError instanceof Error ? sendError.message : sendError,
        });

        // RLS retries are handled inside the sequence-retry loop above.
        // If we reach here, either all RLS retries were exhausted (ConnectionError)
        // or a non-retryable error occurred. Only handle offline queuing below.

        // Genuine network/offline errors — queue for later sync
        if (isNetworkError(sendError)) {
          const messageId = crypto.randomUUID();
          await offlineQueueService.queueMessage({
            id: messageId,
            conversation_id: input.conversation_id,
            sender_id: user.id,
            encrypted_content: encrypted.ciphertext,
            initialization_vector: encrypted.iv,
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('offline-queue-updated'));
          }

          const queuedMessage: Message = {
            id: messageId,
            conversation_id: input.conversation_id,
            sender_id: user.id,
            encrypted_content: encrypted.ciphertext,
            initialization_vector: encrypted.iv,
            sequence_number: 0,
            deleted: false,
            edited: false,
            edited_at: null,
            delivered_at: null,
            read_at: null,
            created_at: new Date().toISOString(),
            key_version: 1,
            is_system_message: false,
            system_message_type: null,
          };

          return {
            message: queuedMessage,
            queued: true,
          };
        }

        // Unknown error — re-throw so the UI can show an error
        throw sendError instanceof Error
          ? sendError
          : new ConnectionError('Failed to send message: ' + String(sendError));
      }
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        // ConnectionError must pass through, not be rewrapped. It is what the
        // conversation lookup and getUserPublicKey throw on a network fault,
        // and both of those sit outside the inner try that owns the queue
        // decision. Rewrapping them as a generic EncryptionError("Failed to
        // send message") discarded the fact that the network was the cause —
        // so the UI could not tell a transport problem from a crypto one, and
        // the user got a misleading error on top of a deleted message.
        error instanceof ConnectionError ||
        error instanceof EncryptionError ||
        error instanceof EncryptionLockedError
      ) {
        throw error;
      }
      throw new EncryptionError('Failed to send message', error);
    }
  }

  /**
   * Get message history for a conversation with pagination
   * Task: T062, T167 (updated with caching and offline support)
   *
   * Retrieves encrypted messages from the database and decrypts them for display.
   * Messages that fail to decrypt are shown with a placeholder text.
   *
   * Offline support:
   * - If online: fetch from database and cache results
   * - If offline: fallback to cached messages from IndexedDB
   *
   * @param conversationId - UUID of the conversation to fetch messages from
   * @param cursor - Sequence number to start from for pagination (null fetches latest messages)
   * @param limit - Maximum number of messages to fetch (default: 50, max: 50)
   * @returns Promise<MessageHistory> - Decrypted messages in chronological order with pagination info
   * @throws AuthenticationError if user is not signed in
   * @throws ValidationError if conversation not found
   * @throws EncryptionError if encryption keys cannot be initialized
   * @throws ConnectionError if database query fails
   *
   * @example
   * ```typescript
   * // Fetch latest 50 messages
   * const result = await messageService.getMessageHistory(conversationId);
   *
   * // Fetch next page
   * const nextPage = await messageService.getMessageHistory(
   *   conversationId,
   *   result.cursor,
   *   50
   * );
   * ```
   */
  async getMessageHistory(
    conversationId: string,
    cursor: number | null = null,
    limit: number = 50
  ): Promise<MessageHistory> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to view messages');
    }

    try {
      // Variables to hold messages across different code paths
      let messages: MessageRow[] = [];
      let hasMore: boolean = false;
      let messagesToDecrypt: MessageRow[] = [];

      // If offline, try to load from cache
      if (!navigator.onLine) {
        const cachedMessages = await cacheService.getCachedMessages(
          conversationId,
          limit
        );

        // If we have cached messages, return them (already in Message format)
        // Note: Cached messages are encrypted, so we still need to decrypt them
        // Fall through to normal decryption logic below with cached messages
        if (cachedMessages.length > 0) {
          // Use cached messages variable in place of database query result
          messages = cachedMessages;
          hasMore = false; // Can't determine has_more from cache
          messagesToDecrypt = messages;

          // Skip to decryption section (conversation and key fetching below)
        } else {
          // No cached messages and offline - return empty
          return {
            messages: [],
            has_more: false,
            cursor: null,
          };
        }
      }

      // Online - fetch from database
      if (navigator.onLine) {
        // Build query - include deleted messages so they show "[Message deleted]" placeholder
        let query = msgClient
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('sequence_number', { ascending: false })
          .limit(limit + 1); // Fetch one extra to check has_more

        // Add cursor if provided (pagination)
        if (cursor !== null) {
          query = query.lt('sequence_number', cursor);
        }

        const { data: fetchedMessages, error } = await query;

        if (error) {
          // Failed to fetch - try cache fallback
          const cachedMessages = await cacheService.getCachedMessages(
            conversationId,
            limit
          );

          if (cachedMessages.length > 0) {
            messages = cachedMessages;
            hasMore = false;
            messagesToDecrypt = messages;
          } else {
            throw new ConnectionError(
              'Failed to fetch messages: ' + error.message
            );
          }
        } else {
          // Successfully fetched from database
          messages = fetchedMessages;
          hasMore = messages && messages.length > limit;
          messagesToDecrypt = hasMore
            ? messages.slice(0, limit)
            : messages || [];

          // Cache the fetched messages for offline use
          if (messages && messages.length > 0) {
            await cacheService.cacheMessages(conversationId, messagesToDecrypt);
          }
        }
      }

      // Variables messages, hasMore, messagesToDecrypt are set above in either path

      // Get conversation details for decryption
      const { data: conversation } = await msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id, is_group')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        throw new ValidationError('Conversation not found', 'conversationId');
      }

      // Group conversations use symmetric encryption (handled separately in Phase 4)
      if (conversation.is_group) {
        throw new ValidationError(
          'Group message decryption not yet implemented',
          'conversationId'
        );
      }

      // Determine other participant (1-to-1 only)
      const otherParticipantId =
        conversation.participant_1_id === user.id
          ? conversation.participant_2_id
          : conversation.participant_1_id;

      if (!otherParticipantId) {
        throw new ValidationError(
          'Invalid conversation: no recipient found',
          'conversationId'
        );
      }

      // Get both users' profiles for display names
      const { data: profiles } = await msgClient
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', [user.id, otherParticipantId]);

      const profileMap = new Map<string, UserProfile>();
      profiles?.forEach((profile) => {
        profileMap.set(profile.id, profile as UserProfile);
      });

      // If no messages, just return empty array (no need for keys)
      if (messagesToDecrypt.length === 0) {
        return {
          messages: [],
          has_more: false,
          cursor: null,
        };
      }

      // Get private key for decryption. ensureKeys() restores from
      // localStorage if memory is empty (races with page-mount restore effect).
      logger.debug('Starting decryption', { conversationId });
      const currentKeys = await keyManagementService.ensureKeys(user.id);

      if (!currentKeys) {
        logger.error(
          'CRITICAL: Encryption keys not available - user needs to re-authenticate'
        );
        throw new EncryptionLockedError(
          'Your encryption keys are not available. Please sign in again to view messages.'
        );
      }

      logger.debug('Keys available in memory', { userId: user.id });

      // Get other participant's public key (retry for read-replica lag)
      logger.debug('Fetching public key for other user', {
        otherParticipantId,
      });
      let otherPublicKey =
        await keyManagementService.getUserPublicKey(otherParticipantId);

      // Supabase Cloud read replicas can lag 5-30s after key creation.
      // Retry with exponential backoff instead of returning empty array.
      if (!otherPublicKey) {
        for (let retryAttempt = 0; retryAttempt < 3; retryAttempt++) {
          const delay = (retryAttempt + 1) * 1000;
          logger.debug(
            `Public key not found, retry ${retryAttempt + 1}/3 in ${delay}ms`
          );
          await new Promise((r) => setTimeout(r, delay));
          otherPublicKey =
            await keyManagementService.getUserPublicKey(otherParticipantId);
          if (otherPublicKey) break;
        }
      }

      logger.debug('Other user public key', {
        status: otherPublicKey ? 'FOUND' : 'MISSING',
      });

      if (!otherPublicKey) {
        // Still no key after retries — return placeholder messages instead of
        // empty array. This preserves the message list in the UI and prevents
        // the polling fallback from silently losing all messages.
        logger.error(
          'Cannot decrypt - other user has no public key after retries',
          { otherParticipantId }
        );
        const nextCursor =
          messagesToDecrypt.length > 0
            ? messagesToDecrypt[messagesToDecrypt.length - 1].sequence_number
            : null;
        return {
          messages: messagesToDecrypt.map((msg) => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            content: 'Unable to decrypt — sender keys unavailable',
            sequence_number: msg.sequence_number,
            deleted: msg.deleted,
            edited: msg.edited,
            edited_at: msg.edited_at,
            delivered_at: msg.delivered_at,
            read_at: msg.read_at,
            created_at: msg.created_at,
            isOwn: msg.sender_id === user.id,
            senderName: 'Unknown',
          })),
          has_more: hasMore,
          cursor: nextCursor,
        };
      }

      logger.debug('Importing other user public key via crypto.subtle');
      const otherPublicKeyCrypto = await crypto.subtle.importKey(
        'jwk',
        otherPublicKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        false,
        []
      );
      logger.debug('Other user public key imported successfully');

      // Derive shared secret using our derived private key
      logger.debug('Deriving ECDH shared secret', {
        currentUser: user.id,
        otherParticipant: otherParticipantId,
      });
      const sharedSecret = await encryptionService.deriveSharedSecret(
        currentKeys.privateKey,
        otherPublicKeyCrypto
      );
      logger.debug('Shared secret derived successfully');

      // Decrypt all messages
      logger.debug('Decrypting messages', {
        count: messagesToDecrypt.length,
        currentUserId: user.id,
        otherParticipantId,
      });
      const decryptedMessages: DecryptedMessage[] = await Promise.all(
        messagesToDecrypt.map(async (msg) => {
          try {
            const content = await encryptionService.decryptMessage(
              msg.encrypted_content,
              msg.initialization_vector,
              sharedSecret
            );

            const senderProfile = profileMap.get(msg.sender_id);

            return {
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender_id: msg.sender_id,
              content,
              sequence_number: msg.sequence_number,
              deleted: msg.deleted,
              edited: msg.edited,
              edited_at: msg.edited_at,
              delivered_at: msg.delivered_at,
              read_at: msg.read_at,
              created_at: msg.created_at,
              isOwn: msg.sender_id === user.id,
              senderName:
                senderProfile?.display_name ||
                senderProfile?.username ||
                'Unknown',
            };
          } catch (decryptError) {
            // Log the decryption failure with details (but not sensitive data)
            const err = decryptError as Error;
            logger.error('Decryption FAILED for message', {
              messageId: msg.id,
              errorName: String(err.name || 'unknown'),
              errorMessage: String(err.message || 'no message'),
              senderId: msg.sender_id,
              contentLength: msg.encrypted_content?.length || 0,
              ivLength: msg.initialization_vector?.length || 0,
              createdAt: msg.created_at,
            });
            const senderProfile = profileMap.get(msg.sender_id);
            return {
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender_id: msg.sender_id,
              content: 'Encrypted with previous keys',
              sequence_number: msg.sequence_number,
              deleted: msg.deleted,
              edited: msg.edited,
              edited_at: msg.edited_at,
              delivered_at: msg.delivered_at,
              read_at: msg.read_at,
              created_at: msg.created_at,
              isOwn: msg.sender_id === user.id,
              senderName:
                senderProfile?.display_name ||
                senderProfile?.username ||
                'Unknown User',
              decryptionError: true,
            };
          }
        })
      );
      logger.debug('Completed decryption', { count: decryptedMessages.length });

      // Reverse to chronological order (oldest first)
      decryptedMessages.reverse();

      return {
        messages: decryptedMessages,
        has_more: hasMore,
        cursor:
          decryptedMessages.length > 0
            ? decryptedMessages[0].sequence_number
            : null,
      };
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof EncryptionError ||
        error instanceof EncryptionLockedError ||
        error instanceof ConnectionError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new EncryptionError('Failed to get message history', error);
    }
  }

  /**
   * Mark messages as read by updating their read_at timestamp
   * Task: T063
   *
   * Updates the read_at field for messages that haven't been read yet.
   * Only affects messages where read_at is currently null.
   * This operation is silent - errors won't be thrown to avoid disrupting message viewing.
   *
   * @param messageIds - Array of message UUIDs to mark as read
   * @returns Promise<void> - Completes silently, even if some messages fail to update
   * @throws AuthenticationError if user is not signed in
   * @throws ConnectionError if database update completely fails
   *
   * @example
   * ```typescript
   * // Mark unread messages as read when user views conversation
   * const unreadMessages = messages.filter(m => !m.isOwn && !m.read_at);
   * const messageIds = unreadMessages.map(m => m.id);
   * await messageService.markAsRead(messageIds);
   * ```
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to mark messages as read'
      );
    }

    if (messageIds.length === 0) {
      return;
    }

    logger.debug('markAsRead called', { count: messageIds.length });
    try {
      const now = new Date().toISOString();
      const { error, count } = await msgClient
        .from('messages')
        .update({ read_at: now, delivered_at: now })
        .in('id', messageIds)
        .is('read_at', null); // Only update if not already read

      if (error) {
        logger.error('markAsRead error', { error: error.message });
        throw new ConnectionError(
          'Failed to mark messages as read: ' + error.message
        );
      }
      logger.debug('markAsRead success', { updatedCount: count });
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ConnectionError
      ) {
        throw error;
      }
      throw new ConnectionError('Failed to mark messages as read', error);
    }
  }

  /**
   * Mark messages as delivered by setting delivered_at timestamp
   * Task: T111
   *
   * Sets delivered_at for messages that haven't been marked delivered yet.
   * Called when recipient's page loads messages from another user.
   *
   * @param messageIds - Array of message UUIDs to mark as delivered
   */
  async markAsDelivered(messageIds: string[]): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to mark messages as delivered'
      );
    }

    if (messageIds.length === 0) {
      return;
    }

    logger.debug('markAsDelivered called', { count: messageIds.length });
    try {
      const now = new Date().toISOString();
      const { error, count } = await msgClient
        .from('messages')
        .update({ delivered_at: now })
        .in('id', messageIds)
        .is('delivered_at', null); // Only update if not already delivered

      if (error) {
        logger.error('markAsDelivered error', { error: error.message });
      } else {
        logger.debug('markAsDelivered success', { updatedCount: count });
      }
    } catch (error) {
      // Silent failure — delivery receipts shouldn't break the UI
      logger.error('Failed to mark messages as delivered', { error });
    }
  }

  /**
   * Edit a message within the 15-minute window
   * Task: T105
   *
   * Re-encrypts the message content with new plaintext and updates the database.
   * Only allows editing if:
   * - User is the message sender
   * - Message is within 15-minute edit window
   * - Message is not deleted
   *
   * @param input - EditMessageInput with message_id and new_content
   * @returns Promise<void>
   * @throws AuthenticationError if user is not signed in
   * @throws ValidationError if message not found, not owned, or outside edit window
   * @throws EncryptionError if re-encryption fails
   * @throws ConnectionError if database update fails
   *
   * @example
   * ```typescript
   * await messageService.editMessage({
   *   message_id: '123e4567-e89b-12d3-a456-426614174000',
   *   new_content: 'Updated message text'
   * });
   * ```
   */
  async editMessage(input: {
    message_id: string;
    new_content: string;
  }): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Validate new content
    const content = input.new_content.trim();

    if (content.length < MESSAGE_CONSTRAINTS.MIN_LENGTH) {
      throw new ValidationError('Message cannot be empty', 'new_content');
    }

    if (content.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      throw new ValidationError(
        `Message cannot exceed ${MESSAGE_CONSTRAINTS.MAX_LENGTH} characters`,
        'new_content'
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to edit messages');
    }

    try {
      // Get the message to edit
      const { data: message, error: fetchError } = await msgClient
        .from('messages')
        .select('*')
        .eq('id', input.message_id)
        .single();

      if (fetchError || !message) {
        throw new ValidationError('Message not found', 'message_id');
      }

      // Verify ownership
      if (message.sender_id !== user.id) {
        throw new ValidationError(
          'You can only edit your own messages',
          'message_id'
        );
      }

      // Check if already deleted
      if (message.deleted) {
        throw new ValidationError(
          'Cannot edit a deleted message',
          'message_id'
        );
      }

      // Check 15-minute window
      const createdAt = new Date(message.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (diffMinutes > MESSAGE_CONSTRAINTS.EDIT_WINDOW_MINUTES) {
        throw new ValidationError(
          `Messages can only be edited within ${MESSAGE_CONSTRAINTS.EDIT_WINDOW_MINUTES} minutes`,
          'message_id'
        );
      }

      // Get conversation details for encryption
      const { data: conversation, error: convError } = await msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id, is_group')
        .eq('id', message.conversation_id)
        .single();

      if (convError || !conversation) {
        throw new ValidationError('Conversation not found', 'conversation_id');
      }

      // Group conversations use symmetric encryption (handled separately in Phase 4)
      if (conversation.is_group) {
        throw new ValidationError(
          'Group message editing not yet implemented',
          'conversation_id'
        );
      }

      // Determine recipient ID (1-to-1 only)
      const recipientId =
        conversation.participant_1_id === user.id
          ? conversation.participant_2_id
          : conversation.participant_1_id;

      if (!recipientId) {
        throw new ValidationError(
          'Invalid conversation: no recipient found',
          'conversation_id'
        );
      }

      // Get sender's derived keys. ensureKeys() restores from localStorage
      // if memory is empty (races with page-mount restore effect).
      const senderKeys = await keyManagementService.ensureKeys(user.id);
      if (!senderKeys) {
        throw new EncryptionLockedError(
          'Your encryption keys are not available. Please sign in again to edit messages.'
        );
      }

      // Get recipient's public key
      const recipientPublicKey =
        await keyManagementService.getUserPublicKey(recipientId);

      if (!recipientPublicKey) {
        throw new EncryptionError(
          'Cannot edit message: recipient encryption keys not available'
        );
      }

      // Import recipient's public key
      const recipientPublicKeyCrypto = await crypto.subtle.importKey(
        'jwk',
        recipientPublicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Derive shared secret using sender's derived private key
      const sharedSecret = await encryptionService.deriveSharedSecret(
        senderKeys.privateKey,
        recipientPublicKeyCrypto
      );

      // Encrypt new content
      const encrypted = await encryptionService.encryptMessage(
        content,
        sharedSecret
      );

      // Update message in database
      const { error: updateError } = await msgClient
        .from('messages')
        .update({
          encrypted_content: encrypted.ciphertext,
          initialization_vector: encrypted.iv,
          edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', input.message_id);

      if (updateError) {
        throw new ConnectionError(
          'Failed to update message: ' + updateError.message
        );
      }
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof EncryptionError ||
        error instanceof EncryptionLockedError ||
        error instanceof ConnectionError
      ) {
        throw error;
      }
      throw new EncryptionError('Failed to edit message', error);
    }
  }

  /**
   * Delete a message within the 15-minute window (soft delete)
   * Task: T106
   *
   * Marks a message as deleted without removing it from the database.
   * Only allows deletion if:
   * - User is the message sender
   * - Message is within 15-minute delete window
   * - Message is not already deleted
   *
   * @param message_id - UUID of the message to delete
   * @returns Promise<void>
   * @throws AuthenticationError if user is not signed in
   * @throws ValidationError if message not found, not owned, or outside delete window
   * @throws ConnectionError if database update fails
   *
   * @example
   * ```typescript
   * await messageService.deleteMessage('123e4567-e89b-12d3-a456-426614174000');
   * ```
   */
  async deleteMessage(message_id: string): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError('You must be signed in to delete messages');
    }

    try {
      // Get the message to delete
      const { data: message, error: fetchError } = await msgClient
        .from('messages')
        .select('*')
        .eq('id', message_id)
        .single();

      if (fetchError || !message) {
        throw new ValidationError('Message not found', 'message_id');
      }

      // Verify ownership
      if (message.sender_id !== user.id) {
        throw new ValidationError(
          'You can only delete your own messages',
          'message_id'
        );
      }

      // Check if already deleted
      if (message.deleted) {
        throw new ValidationError('Message is already deleted', 'message_id');
      }

      // Check 15-minute window
      const createdAt = new Date(message.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (diffMinutes > MESSAGE_CONSTRAINTS.DELETE_WINDOW_MINUTES) {
        throw new ValidationError(
          `Messages can only be deleted within ${MESSAGE_CONSTRAINTS.DELETE_WINDOW_MINUTES} minutes`,
          'message_id'
        );
      }

      // Soft delete - set deleted flag
      const { error: updateError } = await msgClient
        .from('messages')
        .update({
          deleted: true,
        })
        .eq('id', message_id);

      if (updateError) {
        throw new ConnectionError(
          'Failed to delete message: ' + updateError.message
        );
      }
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof ConnectionError
      ) {
        throw error;
      }
      throw new ConnectionError('Failed to delete message', error);
    }
  }

  /**
   * Archive a conversation for the current user
   * Per-user archive: User A archiving doesn't affect User B's view
   *
   * @param conversationId - UUID of the conversation to archive
   * @returns Promise<void>
   * @throws AuthenticationError if user is not signed in
   * @throws ValidationError if conversation not found or user not a participant
   * @throws ConnectionError if database update fails
   */
  async archiveConversation(conversationId: string): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to archive conversations'
      );
    }

    try {
      // Get conversation to determine which participant the user is
      const { data: conversation, error: fetchError } = await msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id, is_group')
        .eq('id', conversationId)
        .single();

      if (fetchError || !conversation) {
        throw new ValidationError('Conversation not found', 'conversationId');
      }

      // Group conversations use conversation_members.archived field
      if (conversation.is_group) {
        throw new ValidationError(
          'Group conversation archiving not yet implemented',
          'conversationId'
        );
      }

      // Determine which column to update based on user's participant role (1-to-1 only)
      let updateColumn: string;
      if (conversation.participant_1_id === user.id) {
        updateColumn = 'archived_by_participant_1';
      } else if (conversation.participant_2_id === user.id) {
        updateColumn = 'archived_by_participant_2';
      } else {
        throw new ValidationError(
          'You are not a participant in this conversation',
          'conversationId'
        );
      }

      logger.debug('archiveConversation', {
        conversationId,
        column: updateColumn,
      });

      // Update the archive status
      const { error: updateError, data: updateData } = await msgClient
        .from('conversations')
        .update({ [updateColumn]: true })
        .eq('id', conversationId)
        .select();

      if (updateError) {
        logger.error('archiveConversation error', {
          error: updateError.message,
        });
        throw new ConnectionError(
          'Failed to archive conversation: ' + updateError.message
        );
      }

      logger.debug('archiveConversation success', { updateData });
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof ConnectionError
      ) {
        throw error;
      }
      throw new ConnectionError('Failed to archive conversation', error);
    }
  }

  /**
   * Unarchive a conversation for the current user
   *
   * @param conversationId - UUID of the conversation to unarchive
   * @returns Promise<void>
   * @throws AuthenticationError if user is not signed in
   * @throws ValidationError if conversation not found or user not a participant
   * @throws ConnectionError if database update fails
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    const supabase = createClient();
    const msgClient = createMessagingClient(supabase);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthenticationError(
        'You must be signed in to unarchive conversations'
      );
    }

    try {
      // Get conversation to determine which participant the user is
      const { data: conversation, error: fetchError } = await msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id, is_group')
        .eq('id', conversationId)
        .single();

      if (fetchError || !conversation) {
        throw new ValidationError('Conversation not found', 'conversationId');
      }

      // Group conversations use conversation_members.archived field
      if (conversation.is_group) {
        throw new ValidationError(
          'Group conversation unarchiving not yet implemented',
          'conversationId'
        );
      }

      // Determine which column to update based on user's participant role (1-to-1 only)
      let updateColumn: string;
      if (conversation.participant_1_id === user.id) {
        updateColumn = 'archived_by_participant_1';
      } else if (conversation.participant_2_id === user.id) {
        updateColumn = 'archived_by_participant_2';
      } else {
        throw new ValidationError(
          'You are not a participant in this conversation',
          'conversationId'
        );
      }

      // Update the archive status
      const { error: updateError } = await msgClient
        .from('conversations')
        .update({ [updateColumn]: false })
        .eq('id', conversationId);

      if (updateError) {
        throw new ConnectionError(
          'Failed to unarchive conversation: ' + updateError.message
        );
      }
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof ConnectionError
      ) {
        throw error;
      }
      throw new ConnectionError('Failed to unarchive conversation', error);
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();

/**
 * Delete User Account Edge Function
 *
 * Handles GDPR Article 17 (Right to Erasure) by deleting user from auth.users.
 * CASCADE handles all dependent data:
 * - user_profiles (ON DELETE CASCADE from auth.users)
 * - messages, conversations, user_connections (CASCADE from user_profiles)
 * - user_encryption_keys (CASCADE from auth.users)
 *
 * Security:
 * - Requires valid JWT in Authorization header
 * - User can only delete their own account (verified via JWT)
 * - Uses service role key for admin.deleteUser()
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get environment variables inside handler (not at module level)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user identity from JWT using admin client
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification failed:', userError?.message);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          details: userError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = user.id;
    console.log(`Deleting user account: ${userId}`);

    // Log the deletion attempt for audit
    try {
      await supabaseAdmin.from('auth_audit_logs').insert({
        user_id: userId,
        event_type: 'account_delete',
        event_data: {
          email: user.email,
          deleted_at: new Date().toISOString(),
        },
        success: true,
      });
    } catch (auditError) {
      // Don't fail deletion if audit log fails
      console.error('Audit log failed:', auditError);
    }

    // Delete the user using admin API
    // This cascades to:
    // - user_profiles (ON DELETE CASCADE)
    // - messages (ON DELETE CASCADE from user_profiles)
    // - conversations (ON DELETE CASCADE from user_profiles)
    // - user_connections (ON DELETE CASCADE from user_profiles)
    // - user_encryption_keys (ON DELETE CASCADE)
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError.message);

      // Try to update audit log with failure
      try {
        await supabaseAdmin
          .from('auth_audit_logs')
          .update({
            success: false,
            error_message: deleteError.message,
          })
          .eq('user_id', userId)
          .eq('event_type', 'account_delete')
          .order('created_at', { ascending: false })
          .limit(1);
      } catch (e) {
        console.error('Failed to update audit log:', e);
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to delete account',
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`User ${userId} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

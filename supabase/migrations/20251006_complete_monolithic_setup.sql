-- ============================================================================
-- COMPLETE MONOLITHIC SETUP
-- Everything in one file: Payment + Auth + Security
-- ============================================================================
-- Purpose: Single migration to create entire database from scratch
-- Created: 2025-10-06
--
-- This migration includes:
-- - Payment System (PRP-015)
-- - User Authentication (PRP-016)
-- - Security Hardening (Feature 017)
--   - Rate limiting (brute force protection)
--   - OAuth CSRF protection
--   - Row Level Security (RLS)
--   - Audit logging
--   - Webhook retry
-- ============================================================================

-- Clean up any existing test user BEFORE transaction
-- (auth.users changes can't be rolled back, so do this first)
DELETE FROM auth.users WHERE email = 'test@example.com';

-- Wrap everything in a transaction - all or nothing
BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PART 1: PAYMENT SYSTEM TABLES
-- ============================================================================

-- Payment intents (24hr expiry)
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL CHECK (amount >= 100 AND amount <= 99999),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'eur', 'gbp', 'cad', 'aud')),
  type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
  interval TEXT CHECK (interval IN ('month', 'year') OR interval IS NULL),
  description TEXT,
  customer_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_customer_email ON payment_intents(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(template_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON payment_intents(expires_at);

COMMENT ON TABLE payment_intents IS 'Customer payment intentions before provider redirect (24hr expiry)';

-- Payment results
CREATE TABLE IF NOT EXISTS payment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'cashapp', 'chime')),
  transaction_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  charged_amount INTEGER,
  charged_currency TEXT,
  provider_fee INTEGER,
  webhook_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_method TEXT CHECK (verification_method IN ('webhook', 'redirect') OR verification_method IS NULL),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_results_intent_id ON payment_results(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_results_transaction_id ON payment_results(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_results_status ON payment_results(status);
CREATE INDEX IF NOT EXISTS idx_payment_results_created_at ON payment_results(created_at DESC);

COMMENT ON TABLE payment_results IS 'Outcome of payment attempts with webhook verification';

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_subscription_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  plan_amount INTEGER NOT NULL CHECK (plan_amount >= 100),
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'grace_period', 'canceled', 'expired')),
  current_period_start TEXT,
  current_period_end TEXT,
  next_billing_date TEXT,
  failed_payment_count INTEGER NOT NULL DEFAULT 0,
  retry_schedule JSONB DEFAULT '{"day_1": false, "day_3": false, "day_7": false}'::jsonb,
  grace_period_expires TEXT,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON subscriptions(provider, provider_subscription_id);

COMMENT ON TABLE subscriptions IS 'Recurring payment subscriptions';

-- Payment provider config
CREATE TABLE IF NOT EXISTS payment_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'cashapp', 'chime')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (config_status IN ('not_configured', 'configured', 'invalid')),
  priority INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{"one_time": false, "recurring": false, "requires_consent": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_config_enabled ON payment_provider_config(enabled, priority DESC);

COMMENT ON TABLE payment_provider_config IS 'Payment provider settings and failover';

-- Webhook events (with retry fields from Feature 017)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  processing_error TEXT,
  related_payment_id UUID REFERENCES payment_results(id),
  related_subscription_id UUID REFERENCES subscriptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  -- Feature 017: Webhook retry fields
  next_retry_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  permanently_failed BOOLEAN NOT NULL DEFAULT FALSE,
  last_retry_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id ON webhook_events(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON webhook_events(next_retry_at, permanently_failed) WHERE processed = FALSE AND permanently_failed = FALSE;
CREATE INDEX IF NOT EXISTS idx_webhook_events_failed ON webhook_events(permanently_failed, created_at DESC) WHERE permanently_failed = TRUE;

COMMENT ON TABLE webhook_events IS 'Webhook notifications with idempotency and retry';

-- ============================================================================
-- PART 2: AUTHENTICATION TABLES
-- ============================================================================

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE CHECK (length(username) >= 3 AND length(username) <= 30),
  display_name TEXT CHECK (length(display_name) <= 100),
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 500),
  welcome_message_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_welcome_pending ON user_profiles(id) WHERE welcome_message_sent = FALSE;

COMMENT ON TABLE user_profiles IS 'User profile information 1:1 with auth.users';

-- Auth audit logs (90-day retention)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sign_up',
    'sign_in', 'sign_in_success', 'sign_in_failed',
    'sign_out',
    'password_change', 'password_reset_request', 'password_reset_complete',
    'email_verification', 'email_verification_sent', 'email_verification_complete',
    'token_refresh',
    'account_delete',
    'oauth_link', 'oauth_unlink'
  )),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT CHECK (length(user_agent) <= 500),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON auth_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event ON auth_audit_logs(user_id, event_type, created_at DESC);

COMMENT ON TABLE auth_audit_logs IS 'Security audit trail for all auth events (90-day retention)';

-- ============================================================================
-- PART 3: SECURITY TABLES (Feature 017)
-- ============================================================================

-- Rate limiting (brute force protection)
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,  -- Email or IP
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('sign_in', 'sign_up', 'password_reset')),
  ip_address INET,
  user_agent TEXT,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_attempts(identifier, attempt_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_attempts(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_locked ON rate_limit_attempts(locked_until) WHERE locked_until IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_unique ON rate_limit_attempts(identifier, attempt_type);

COMMENT ON TABLE rate_limit_attempts IS 'Server-side rate limiting - prevents brute force';

-- Enable RLS on rate_limit_attempts (system-managed, service role only)
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only access" ON rate_limit_attempts;
CREATE POLICY "Service role only access" ON rate_limit_attempts
  FOR ALL
  USING (false);

COMMENT ON POLICY "Service role only access" ON rate_limit_attempts IS
  'Rate limiting data is system-managed. Only service role can access.';

-- ============================================================================
-- PART 4: FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Cleanup old audit logs (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM auth_audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Rate limiting check (Feature 017)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limit_attempts%ROWTYPE;
  v_max_attempts INTEGER := 5;
  v_window_minutes INTEGER := 15;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_record
  FROM rate_limit_attempts
  WHERE identifier = p_identifier AND attempt_type = p_attempt_type
  FOR UPDATE SKIP LOCKED;

  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
    RETURN json_build_object('allowed', FALSE, 'remaining', 0, 'locked_until', v_record.locked_until, 'reason', 'rate_limited');
  END IF;

  IF v_record.id IS NULL OR (v_now - v_record.window_start) > (v_window_minutes || ' minutes')::INTERVAL THEN
    INSERT INTO rate_limit_attempts (identifier, attempt_type, ip_address, window_start, attempt_count)
    VALUES (p_identifier, p_attempt_type, p_ip_address, v_now, 0)
    ON CONFLICT (identifier, attempt_type) DO UPDATE
      SET window_start = v_now, attempt_count = 0, locked_until = NULL, updated_at = v_now;
    RETURN json_build_object('allowed', TRUE, 'remaining', v_max_attempts, 'locked_until', NULL);
  END IF;

  IF v_record.attempt_count < v_max_attempts THEN
    RETURN json_build_object('allowed', TRUE, 'remaining', v_max_attempts - v_record.attempt_count, 'locked_until', NULL);
  ELSE
    UPDATE rate_limit_attempts
    SET locked_until = v_now + (v_window_minutes || ' minutes')::INTERVAL, updated_at = v_now
    WHERE identifier = p_identifier AND attempt_type = p_attempt_type;
    RETURN json_build_object('allowed', FALSE, 'remaining', 0, 'locked_until', v_now + (v_window_minutes || ' minutes')::INTERVAL, 'reason', 'rate_limited');
  END IF;
END;
$$;

-- Record failed auth attempt (Feature 017)
CREATE OR REPLACE FUNCTION record_failed_attempt(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rate_limit_attempts
  SET attempt_count = attempt_count + 1, updated_at = now(), ip_address = COALESCE(p_ip_address, ip_address)
  WHERE identifier = p_identifier AND attempt_type = p_attempt_type;

  IF NOT FOUND THEN
    INSERT INTO rate_limit_attempts (identifier, attempt_type, ip_address, attempt_count)
    VALUES (p_identifier, p_attempt_type, p_ip_address, 1)
    ON CONFLICT (identifier, attempt_type) DO UPDATE
      SET attempt_count = rate_limit_attempts.attempt_count + 1, updated_at = now();
  END IF;
END;
$$;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- ============================================================================
-- PART 6: STORAGE BUCKETS (Feature 022: Avatar Upload)
-- ============================================================================

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'avatars',
  'avatars',
  true,                                              -- Public read access
  5242880,                                           -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']    -- Allowed formats
)
ON CONFLICT (id) DO NOTHING;                         -- Idempotent

-- Drop existing avatar policies (for clean re-run)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Avatar RLS Policy 1: INSERT - Users can upload own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar RLS Policy 2: UPDATE - Users can update own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar RLS Policy 3: DELETE - Users can delete own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar RLS Policy 4: SELECT - Anyone can view avatars (public read)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Payment intents (Feature 017: Stricter policies)
DROP POLICY IF EXISTS "Users can view own payment intents" ON payment_intents;
CREATE POLICY "Users can view own payment intents" ON payment_intents
  FOR SELECT USING (auth.uid() = template_user_id);

DROP POLICY IF EXISTS "Users can create own payment intents" ON payment_intents;
CREATE POLICY "Users can create own payment intents" ON payment_intents
  FOR INSERT WITH CHECK (auth.uid() = template_user_id);

DROP POLICY IF EXISTS "Payment intents are immutable" ON payment_intents;
CREATE POLICY "Payment intents are immutable" ON payment_intents
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Payment intents cannot be deleted by users" ON payment_intents;
CREATE POLICY "Payment intents cannot be deleted by users" ON payment_intents
  FOR DELETE USING (false);

-- Payment results (Feature 017: Stricter policies)
DROP POLICY IF EXISTS "Users can view own payment results" ON payment_results;
CREATE POLICY "Users can view own payment results" ON payment_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payment_intents
      WHERE payment_intents.id = payment_results.intent_id
      AND payment_intents.template_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert payment results" ON payment_results;
CREATE POLICY "Service role can insert payment results" ON payment_results
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Payment results are immutable" ON payment_results;
CREATE POLICY "Payment results are immutable" ON payment_results
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Payment results cannot be deleted by users" ON payment_results;
CREATE POLICY "Payment results cannot be deleted by users" ON payment_results
  FOR DELETE USING (false);

-- Subscriptions
DROP POLICY IF EXISTS "Users view own subscriptions" ON subscriptions;
CREATE POLICY "Users view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = template_user_id);

DROP POLICY IF EXISTS "Users create own subscriptions" ON subscriptions;
CREATE POLICY "Users create own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = template_user_id);

DROP POLICY IF EXISTS "Users update own subscriptions" ON subscriptions;
CREATE POLICY "Users update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = template_user_id);

-- Webhook events
DROP POLICY IF EXISTS "Service creates webhook events" ON webhook_events;
CREATE POLICY "Service creates webhook events" ON webhook_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service updates webhook events" ON webhook_events;
CREATE POLICY "Service updates webhook events" ON webhook_events
  FOR UPDATE WITH CHECK (true);

-- Payment provider config
DROP POLICY IF EXISTS "Users view provider config" ON payment_provider_config;
CREATE POLICY "Users view provider config" ON payment_provider_config
  FOR SELECT USING (true);

-- User profiles
-- Note: "Users view own profile" provides full access to own profile
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Note: "Authenticated users can search profiles" enables Feature 023 friend search
-- Users can view public profile fields (username, display_name, avatar_url) to find friends
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON user_profiles;
CREATE POLICY "Authenticated users can search profiles" ON user_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service creates profiles" ON user_profiles;
CREATE POLICY "Service creates profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to insert their own profile (needed for upsert operations)
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auth audit logs (Feature 017)
DROP POLICY IF EXISTS "Users can view own audit logs" ON auth_audit_logs;
CREATE POLICY "Users can view own audit logs" ON auth_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert audit logs" ON auth_audit_logs;
CREATE POLICY "Service role can insert audit logs" ON auth_audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

-- Authenticated users
GRANT SELECT, INSERT, UPDATE ON payment_intents TO authenticated;
GRANT SELECT ON payment_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT ON payment_provider_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT ON auth_audit_logs TO authenticated;

-- Service role (full access)
GRANT ALL ON payment_intents TO service_role;
GRANT ALL ON payment_results TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON webhook_events TO service_role;
GRANT ALL ON payment_provider_config TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON auth_audit_logs TO service_role;

-- ============================================================================
-- PART 8: SEED TEST USER (Primary)
-- ============================================================================
-- Creates: test@example.com / TestPassword123!
-- Email is already confirmed (bypasses verification requirement)
-- Note: User was deleted at start of script for idempotency

-- Create the user in auth.users with confirmed email
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('TestPassword123!', gen_salt('bf')),  -- Hashed password using bcrypt
  now(),  -- Email already confirmed
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create identity record (required for Supabase Auth)
INSERT INTO auth.identities (
  provider_id,
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  now(),
  now(),
  now()
FROM auth.users
WHERE email = 'test@example.com';

-- ============================================================================
-- PART 9: USER MESSAGING SYSTEM (PRP-023)
-- ============================================================================
-- End-to-end encrypted messaging with friend requests
-- Features: Zero-knowledge E2E encryption, real-time delivery, typing indicators
-- Tables: 6 (user_connections, conversations, messages, user_encryption_keys, conversation_keys, typing_indicators)

-- Table 1: user_connections (Friend requests)
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_connection CHECK (requester_id != addressee_id),
  CONSTRAINT unique_connection UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_user_connections_addressee ON user_connections(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);

ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON user_connections;
CREATE POLICY "Users can create friend requests" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Addressee can update connection status" ON user_connections;
CREATE POLICY "Addressee can update connection status" ON user_connections
  FOR UPDATE USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can delete own sent requests" ON user_connections;
CREATE POLICY "Users can delete own sent requests" ON user_connections
  FOR DELETE USING (auth.uid() = requester_id AND status = 'pending');

COMMENT ON TABLE user_connections IS 'Friend request management with status tracking';

-- Table 2: conversations (1-to-1 chats)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  archived_by_participant_1 BOOLEAN NOT NULL DEFAULT FALSE,
  archived_by_participant_2 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_conversation CHECK (participant_1_id != participant_2_id),
  CONSTRAINT canonical_ordering CHECK (participant_1_id < participant_2_id),
  CONSTRAINT unique_conversation UNIQUE (participant_1_id, participant_2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(participant_1_id, archived_by_participant_1, participant_2_id, archived_by_participant_2);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

DROP POLICY IF EXISTS "Users can create conversations with connections" ON conversations;
CREATE POLICY "Users can create conversations with connections" ON conversations
  FOR INSERT WITH CHECK (
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id) AND
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE status = 'accepted' AND (
        (requester_id = participant_1_id AND addressee_id = participant_2_id) OR
        (requester_id = participant_2_id AND addressee_id = participant_1_id)
      )
    )
  );

-- Admin can create conversations with any user (Feature 002 - welcome messages)
-- Uses dynamic lookup by username to avoid hardcoded UUID dependency
DROP POLICY IF EXISTS "Admin can create any conversation" ON conversations;
CREATE POLICY "Admin can create any conversation" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1)
  );

-- Users can create conversations with admin for welcome messages (Feature 004)
-- This allows the client-side welcome service to create the conversation
-- Uses dynamic lookup by username to avoid hardcoded UUID dependency
DROP POLICY IF EXISTS "Users can create conversation with admin" ON conversations;
CREATE POLICY "Users can create conversation with admin" ON conversations
  FOR INSERT WITH CHECK (
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id) AND
    (participant_1_id = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1) OR
     participant_2_id = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1))
  );

DROP POLICY IF EXISTS "System can update last_message_at" ON conversations;
CREATE POLICY "System can update last_message_at" ON conversations
  FOR UPDATE TO service_role USING (true);

-- Allow users to archive/unarchive their own conversations
DROP POLICY IF EXISTS "Users can update own conversation archive status" ON conversations;
CREATE POLICY "Users can update own conversation archive status" ON conversations
  FOR UPDATE USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
  WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

COMMENT ON TABLE conversations IS '1-to-1 conversations with canonical ordering';

-- Table 3: messages (Encrypted content)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  initialization_vector TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Note: sender_is_participant validation enforced by RLS policy, not CHECK constraint
  -- (PostgreSQL doesn't allow subqueries in CHECK constraints)
  CONSTRAINT unique_sequence UNIQUE (conversation_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(read_at) WHERE read_at IS NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    -- Direct messages: check conversations table
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.is_group = false
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    -- Group messages: check conversation_members table
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
CREATE POLICY "Users can send messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      -- Direct messages: check conversations table
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
          AND c.is_group = false
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
      -- Group messages: check conversation_members table
      OR EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = auth.uid()
          AND cm.left_at IS NULL
      )
    )
  );

-- Users can insert welcome messages from admin (Feature 004)
-- Allows client-side welcome service to insert message with sender_id = admin
-- Only allowed in conversations where user is a participant with admin
-- Uses dynamic lookup by username to avoid hardcoded UUID dependency
DROP POLICY IF EXISTS "Users can insert welcome message from admin" ON messages;
CREATE POLICY "Users can insert welcome message from admin" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1) AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id AND (
        (conversations.participant_1_id = auth.uid() AND
         conversations.participant_2_id = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1)) OR
        (conversations.participant_2_id = auth.uid() AND
         conversations.participant_1_id = (SELECT id FROM public.user_profiles WHERE username = 'spoketowork' LIMIT 1))
      )
    )
  );

DROP POLICY IF EXISTS "Users can edit own messages" ON messages;
CREATE POLICY "Users can edit own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() AND created_at > now() - INTERVAL '15 minutes');

-- Allow recipients to mark messages as read (update read_at field)
-- This is separate from edit policy because recipients need to update messages they didn't send
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON messages;
CREATE POLICY "Recipients can mark messages as read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id AND (
        conversations.participant_1_id = auth.uid() OR
        conversations.participant_2_id = auth.uid()
      )
    )
    AND sender_id != auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id AND (
        conversations.participant_1_id = auth.uid() OR
        conversations.participant_2_id = auth.uid()
      )
    )
    AND sender_id != auth.uid()
  );

DROP POLICY IF EXISTS "Users cannot delete messages" ON messages;
CREATE POLICY "Users cannot delete messages" ON messages
  FOR DELETE USING (false);

COMMENT ON TABLE messages IS 'E2E encrypted messages with 15-minute edit window';

-- Table 4: user_encryption_keys (Public ECDH keys + password-derived salt)
-- encryption_salt: Base64-encoded 16-byte Argon2 salt for password-derived keys
-- NULL salt indicates legacy random-generated keys requiring migration (Feature 032)
CREATE TABLE IF NOT EXISTS user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  public_key JSONB NOT NULL,
  encryption_salt TEXT, -- Base64 Argon2 salt (NULL = legacy keys)
  device_id TEXT,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user ON user_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_active ON user_encryption_keys(user_id, revoked, expires_at)
  WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_salt ON user_encryption_keys(user_id)
  WHERE encryption_salt IS NOT NULL;

ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public keys" ON user_encryption_keys;
CREATE POLICY "Anyone can view public keys" ON user_encryption_keys
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own keys" ON user_encryption_keys;
CREATE POLICY "Users can create own keys" ON user_encryption_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can revoke own keys" ON user_encryption_keys;
CREATE POLICY "Users can revoke own keys" ON user_encryption_keys
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users cannot delete keys" ON user_encryption_keys;
CREATE POLICY "Users cannot delete keys" ON user_encryption_keys
  FOR DELETE USING (false);

COMMENT ON TABLE user_encryption_keys IS 'Public ECDH keys - private keys NEVER in database';

-- Table 5: conversation_keys (Encrypted shared secrets)
CREATE TABLE IF NOT EXISTS conversation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_shared_secret TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation_user_version UNIQUE (conversation_id, user_id, key_version)
);

CREATE INDEX IF NOT EXISTS idx_conversation_keys_conversation ON conversation_keys(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_keys_user ON conversation_keys(user_id);

ALTER TABLE conversation_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation keys" ON conversation_keys;
CREATE POLICY "Users can view own conversation keys" ON conversation_keys
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create conversation keys" ON conversation_keys;
CREATE POLICY "Users can create conversation keys" ON conversation_keys
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id AND (
        conversations.participant_1_id = auth.uid() OR
        conversations.participant_2_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users cannot update keys" ON conversation_keys;
CREATE POLICY "Users cannot update keys" ON conversation_keys
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Users cannot delete keys" ON conversation_keys;
CREATE POLICY "Users cannot delete keys" ON conversation_keys
  FOR DELETE USING (false);

COMMENT ON TABLE conversation_keys IS 'Immutable encrypted shared secrets';

-- Table 6: typing_indicators (Real-time typing status)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id, updated_at DESC);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view typing in own conversations" ON typing_indicators;
CREATE POLICY "Users can view typing in own conversations" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = typing_indicators.conversation_id AND (
        conversations.participant_1_id = auth.uid() OR
        conversations.participant_2_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own typing status" ON typing_indicators;
CREATE POLICY "Users can insert own typing status" ON typing_indicators
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own typing status" ON typing_indicators;
CREATE POLICY "Users can update own typing status" ON typing_indicators
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can clean up old indicators" ON typing_indicators;
CREATE POLICY "System can clean up old indicators" ON typing_indicators
  FOR DELETE TO service_role USING (updated_at < now() - INTERVAL '5 seconds');

COMMENT ON TABLE typing_indicators IS 'Real-time typing with auto-expire after 5 seconds';

-- Messaging Triggers
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

CREATE OR REPLACE FUNCTION assign_sequence_number()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE next_seq BIGINT;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM messages WHERE conversation_id = NEW.conversation_id;
  NEW.sequence_number := next_seq;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_message_insert ON messages;
CREATE TRIGGER before_message_insert
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION assign_sequence_number();

COMMENT ON FUNCTION update_conversation_timestamp() IS 'Auto-update conversation.last_message_at';
COMMENT ON FUNCTION assign_sequence_number() IS 'Auto-increment message sequence numbers';

-- Grant permissions for messaging tables
GRANT ALL ON user_connections TO authenticated, service_role;
GRANT ALL ON conversations TO authenticated, service_role;
GRANT ALL ON messages TO authenticated, service_role;
GRANT ALL ON user_encryption_keys TO authenticated, service_role;
GRANT ALL ON conversation_keys TO authenticated, service_role;
GRANT ALL ON typing_indicators TO authenticated, service_role;

-- ============================================================================
-- PART 10.5: GROUP CHAT SUPPORT (Feature 010)
-- ============================================================================
-- Symmetric key encryption for group messages
-- Features: Up to 200 members, key versioning, history restriction, key rotation
-- Tables modified: conversations, messages
-- Tables new: conversation_members, group_keys

-- T006: Add group columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS group_name TEXT CHECK (length(group_name) <= 100),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS current_key_version INTEGER NOT NULL DEFAULT 1;

-- Make participant columns nullable for groups (they must be NULL for is_group=true)
ALTER TABLE conversations
  ALTER COLUMN participant_1_id DROP NOT NULL,
  ALTER COLUMN participant_2_id DROP NOT NULL;

-- CHK023: Enforce is_group validation via CHECK constraint
-- Drop existing constraint if it exists (for idempotency)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS check_group_participants;
ALTER TABLE conversations ADD CONSTRAINT check_group_participants CHECK (
  (is_group = false AND participant_1_id IS NOT NULL AND participant_2_id IS NOT NULL)
  OR
  (is_group = true AND participant_1_id IS NULL AND participant_2_id IS NULL AND created_by IS NOT NULL)
);

-- T007: Add key_version column to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS key_version INTEGER NOT NULL DEFAULT 1;

-- T008: Add system message columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS system_message_type TEXT;

-- CHK027: Validate system_message_type enum values
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_system_message_type;
ALTER TABLE messages ADD CONSTRAINT check_system_message_type CHECK (
  system_message_type IS NULL
  OR system_message_type IN (
    'member_joined',
    'member_left',
    'member_removed',
    'group_created',
    'group_renamed',
    'ownership_transferred'
  )
);

-- T009: Create conversation_members junction table
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  key_version_joined INTEGER NOT NULL DEFAULT 1,
  key_status TEXT NOT NULL DEFAULT 'active' CHECK (key_status IN ('active', 'pending')),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  muted BOOLEAN NOT NULL DEFAULT FALSE
);

-- CHK025: Unique active membership per user per conversation
-- This constraint allows same user_id + conversation_id only if one has left_at set
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_membership
  ON conversation_members(conversation_id, user_id) WHERE left_at IS NULL;

-- T010: Create group_keys table
CREATE TABLE IF NOT EXISTS group_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  key_version INTEGER NOT NULL DEFAULT 1,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  CONSTRAINT unique_group_key_version UNIQUE (conversation_id, user_id, key_version)
);

-- T011: Add indexes for conversation_members and group_keys tables
-- CHK026: Indexes for fast member list lookup
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation
  ON conversation_members(conversation_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members(user_id) WHERE left_at IS NULL;

-- Indexes for group_keys
CREATE INDEX IF NOT EXISTS idx_group_keys_conversation
  ON group_keys(conversation_id, key_version DESC);
CREATE INDEX IF NOT EXISTS idx_group_keys_user
  ON group_keys(user_id, conversation_id);

-- T012: Enable RLS on conversation_members and group_keys tables
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_keys ENABLE ROW LEVEL SECURITY;

-- T013: RLS policies for conversation_members
-- NOTE: These policies query 'conversations' table instead of self-referencing
-- to avoid infinite recursion during policy evaluation

-- SELECT: Members can see other members of their conversations
DROP POLICY IF EXISTS "Members can view conversation members" ON conversation_members;
CREATE POLICY "Members can view conversation members" ON conversation_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- INSERT: Any member can add (connection validation in service layer)
DROP POLICY IF EXISTS "Members can add to their conversations" ON conversation_members;
CREATE POLICY "Members can add to their conversations" ON conversation_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    OR user_id = auth.uid()  -- Self-join on creation
  );

-- UPDATE: Members can update own preferences, owners can update others
DROP POLICY IF EXISTS "Members can update membership" ON conversation_members;
CREATE POLICY "Members can update membership" ON conversation_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- DELETE: No direct deletes - use soft delete via left_at
DROP POLICY IF EXISTS "No direct member deletes" ON conversation_members;
CREATE POLICY "No direct member deletes" ON conversation_members
  FOR DELETE USING (false);

-- T014: RLS policies for group_keys

-- SELECT: Users can only see their own encrypted keys (and must be active member)
DROP POLICY IF EXISTS "Users can view their own keys" ON group_keys;
CREATE POLICY "Users can view their own keys" ON group_keys
  FOR SELECT USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = group_keys.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.left_at IS NULL
    )
  );

-- INSERT: Active members can distribute keys
DROP POLICY IF EXISTS "Members can distribute keys" ON group_keys;
CREATE POLICY "Members can distribute keys" ON group_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_id
        AND cm.user_id = auth.uid()
        AND cm.left_at IS NULL
    )
  );

-- UPDATE: No updates allowed - keys are immutable
DROP POLICY IF EXISTS "Keys are immutable" ON group_keys;
CREATE POLICY "Keys are immutable" ON group_keys
  FOR UPDATE USING (false);

-- DELETE: No direct deletes - orphaned keys are harmless
DROP POLICY IF EXISTS "No direct key deletes" ON group_keys;
CREATE POLICY "No direct key deletes" ON group_keys
  FOR DELETE USING (false);

-- T014a: Update messages table RLS for group membership

-- Drop and recreate SELECT policy to support both 1-to-1 and groups
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    -- 1-to-1 conversations: check participant columns
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.is_group = false
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    OR
    -- Group conversations: check membership via junction table
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.left_at IS NULL
    )
  );

-- Drop and recreate INSERT policy to support both 1-to-1 and groups
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
CREATE POLICY "Users can send messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- 1-to-1: existing logic
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id
          AND c.is_group = false
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
      OR
      -- Group: check active membership
      EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversation_id
          AND cm.user_id = auth.uid()
          AND cm.left_at IS NULL
      )
    )
  );

-- Grant permissions for new tables
GRANT ALL ON conversation_members TO authenticated, service_role;
GRANT ALL ON group_keys TO authenticated, service_role;

-- Enable realtime for group tables
ALTER TABLE conversation_members REPLICA IDENTITY FULL;
ALTER TABLE group_keys REPLICA IDENTITY FULL;

COMMENT ON TABLE conversation_members IS 'Junction table linking users to group conversations with membership metadata';
COMMENT ON TABLE group_keys IS 'Encrypted symmetric group keys per member per version';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
--   ✅ Payment tables: payment_intents, payment_results, subscriptions, webhook_events, payment_provider_config
--   ✅ Auth tables: user_profiles, auth_audit_logs
--   ✅ Security tables: rate_limit_attempts
--   ✅ Messaging tables: user_connections, conversations, messages, user_encryption_keys, conversation_keys, typing_indicators
--   ✅ Group chat tables: conversation_members, group_keys (Feature 010)
--   ✅ Storage buckets: avatars (5MB limit, public read)
--   ✅ Functions: update_updated_at_column, create_user_profile, cleanup_old_audit_logs, check_rate_limit, record_failed_attempt, update_conversation_timestamp, assign_sequence_number
--   ✅ Triggers: on_auth_user_created, update_user_profiles_updated_at, on_message_inserted, before_message_insert
--   ✅ RLS policies: All tables + storage.objects protected with auth.uid() (35 total policies)
--   ✅ Avatar policies: 4 policies (user isolation + public read)
--   ✅ Messaging policies: 17 policies (E2E encryption, user isolation, 15-min edit window)
--   ✅ Group chat policies: 8 policies (membership access, key distribution)
--   ✅ Permissions: Authenticated users + service role (all tables)
--   ✅ Test user: test@example.com (primary, email confirmed)
--   ✅ Admin user: spoketowork (Feature 002 - welcome messages)
-- ============================================================================

-- Admin profile for system welcome messages (Feature 002)
-- Fixed UUID: a30ac480-9050-4853-b0ae-4e3d9e24259d
-- Only insert if admin user exists in auth.users (created via Supabase Auth)
INSERT INTO user_profiles (id, username, display_name, welcome_message_sent)
SELECT 'a30ac480-9050-4853-b0ae-4e3d9e24259d', 'spoketowork', 'SpokeToWork', TRUE
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'a30ac480-9050-4853-b0ae-4e3d9e24259d')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Feature 004: Populate OAuth user profiles (one-time migration)
-- Only updates NULL display_name for OAuth users
-- Idempotent: Safe to run multiple times (FR-006)
-- ============================================================================
UPDATE public.user_profiles p
SET
  display_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Anonymous User'
  ),
  avatar_url = COALESCE(p.avatar_url, u.raw_user_meta_data->>'avatar_url')
FROM auth.users u
WHERE p.id = u.id
  AND p.display_name IS NULL
  AND u.raw_app_meta_data->>'provider' IS DISTINCT FROM 'email';

-- ============================================================================
-- PART 10: REALTIME CONFIGURATION
-- Enable realtime subscriptions for messaging tables
-- ============================================================================

-- Set replica identity to FULL for realtime updates
-- This allows Supabase Realtime to track changes to these tables
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Note: The supabase_realtime publication is managed by Supabase.
-- To enable realtime for these tables, run this in the Supabase SQL Editor
-- (outside of transaction, as publication changes require it):
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
--
-- Or enable via Supabase Dashboard: Database > Replication

-- ============================================================================
-- PART 11: COMPANY MANAGEMENT (Feature 011)
-- ============================================================================
-- Job seeker company tracking with offline support
-- Features: CRUD, geocoding, status tracking, import/export
-- ============================================================================

-- Companies table for job seeker tracking
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Company identity
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),

  -- Contact information
  contact_name TEXT CHECK (length(contact_name) <= 100),
  contact_title TEXT CHECK (length(contact_title) <= 100),
  phone TEXT CHECK (length(phone) <= 30),
  email TEXT CHECK (length(email) <= 254),
  website TEXT CHECK (length(website) <= 500),
  careers_url TEXT CHECK (length(careers_url) <= 500),

  -- Location
  address TEXT NOT NULL CHECK (length(address) >= 1 AND length(address) <= 500),
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  extended_range BOOLEAN NOT NULL DEFAULT FALSE,

  -- Tracking
  status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (status IN (
    'not_contacted', 'contacted', 'follow_up', 'meeting', 'outcome_positive', 'outcome_negative'
  )),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT CHECK (length(notes) <= 5000),
  follow_up_date DATE,

  -- Route assignment (nullable, references future route feature)
  route_id UUID,

  -- State
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness constraint: name + address per user
  CONSTRAINT unique_company_per_user UNIQUE (user_id, name, address)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_companies_priority ON companies(user_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_companies_follow_up ON companies(user_id, follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_companies_route ON companies(route_id) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_name_search ON companies USING gin(to_tsvector('english', name));

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User isolation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can view own companies') THEN
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
    CREATE POLICY "Users can view own companies" ON companies
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can create own companies') THEN
DROP POLICY IF EXISTS "Users can create own companies" ON companies;
    CREATE POLICY "Users can create own companies" ON companies
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can update own companies') THEN
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
    CREATE POLICY "Users can update own companies" ON companies
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can delete own companies') THEN
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
    CREATE POLICY "Users can delete own companies" ON companies
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update timestamp trigger (reuse existing function)
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;

COMMENT ON TABLE companies IS 'Job seeker company tracking for route planning (Feature 011)';

-- Add home location columns to user_profiles for distance validation
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS home_address TEXT CHECK (length(home_address) <= 500),
  ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8) CHECK (home_latitude >= -90 AND home_latitude <= 90),
  ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8) CHECK (home_longitude >= -180 AND home_longitude <= 180),
  ADD COLUMN IF NOT EXISTS distance_radius_miles INTEGER DEFAULT 20 CHECK (distance_radius_miles >= 1 AND distance_radius_miles <= 100),
  ADD COLUMN IF NOT EXISTS metro_area_id UUID REFERENCES metro_areas(id);

COMMENT ON COLUMN user_profiles.home_address IS 'User home address for distance calculations';
COMMENT ON COLUMN user_profiles.home_latitude IS 'User home latitude for distance calculations';
COMMENT ON COLUMN user_profiles.home_longitude IS 'User home longitude for distance calculations';
COMMENT ON COLUMN user_profiles.distance_radius_miles IS 'Configurable radius for extended_range warning (default 20)';
COMMENT ON COLUMN user_profiles.metro_area_id IS 'Auto-assigned metro area based on home coordinates (Feature 012)';

-- ============================================================================
-- PART 11b: JOB APPLICATIONS (Feature 011 Evolution)
-- ============================================================================
-- Multiple job applications per company for job hunt tracking
-- ============================================================================

-- Job applications table - child of companies
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Position details
  position_title TEXT CHECK (length(position_title) <= 200),
  job_link TEXT CHECK (length(job_link) <= 1000),
  work_location_type TEXT NOT NULL DEFAULT 'on_site' CHECK (work_location_type IN (
    'remote', 'hybrid', 'on_site'
  )),

  -- Application tracking
  status TEXT NOT NULL DEFAULT 'not_applied' CHECK (status IN (
    'not_applied', 'applied', 'screening', 'interviewing', 'offer', 'closed'
  )),
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN (
    'pending', 'hired', 'rejected', 'withdrawn', 'ghosted', 'offer_declined'
  )),
  date_applied DATE,
  interview_date TIMESTAMPTZ,

  -- Tracking (moved from company level)
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT CHECK (length(notes) <= 5000),
  follow_up_date DATE,

  -- State
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_applications_company ON job_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_outcome ON job_applications(user_id, outcome);
CREATE INDEX IF NOT EXISTS idx_job_applications_date_applied ON job_applications(user_id, date_applied DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_follow_up ON job_applications(user_id, follow_up_date)
  WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_active ON job_applications(user_id, is_active);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User isolation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications'
                 AND policyname = 'Users can view own applications') THEN
DROP POLICY IF EXISTS "Users can view own applications" ON job_applications;
    CREATE POLICY "Users can view own applications" ON job_applications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications'
                 AND policyname = 'Users can create own applications') THEN
DROP POLICY IF EXISTS "Users can create own applications" ON job_applications;
    CREATE POLICY "Users can create own applications" ON job_applications
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications'
                 AND policyname = 'Users can update own applications') THEN
DROP POLICY IF EXISTS "Users can update own applications" ON job_applications;
    CREATE POLICY "Users can update own applications" ON job_applications
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications'
                 AND policyname = 'Users can delete own applications') THEN
DROP POLICY IF EXISTS "Users can delete own applications" ON job_applications;
    CREATE POLICY "Users can delete own applications" ON job_applications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON job_applications TO authenticated;
GRANT ALL ON job_applications TO service_role;

COMMENT ON TABLE job_applications IS 'Job applications tracking - multiple per company (Feature 011b)';

-- ============================================================================
-- DATA MIGRATION: Create one application per existing company
-- ============================================================================
-- Maps existing company status to new application status/outcome

INSERT INTO job_applications (
  company_id,
  user_id,
  position_title,
  status,
  outcome,
  priority,
  notes,
  follow_up_date,
  is_active,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.user_id,
  'Imported Application',
  CASE c.status
    WHEN 'not_contacted' THEN 'not_applied'
    WHEN 'contacted' THEN 'applied'
    WHEN 'follow_up' THEN 'applied'
    WHEN 'meeting' THEN 'interviewing'
    WHEN 'outcome_positive' THEN 'closed'
    WHEN 'outcome_negative' THEN 'closed'
    ELSE 'not_applied'
  END,
  CASE c.status
    WHEN 'outcome_positive' THEN 'hired'
    WHEN 'outcome_negative' THEN 'rejected'
    ELSE 'pending'
  END,
  c.priority,
  c.notes,
  c.follow_up_date,
  c.is_active,
  c.created_at,
  c.updated_at
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM job_applications ja WHERE ja.company_id = c.id
);

-- ============================================================================
-- PART 12: MULTI-TENANT COMPANY DATA MODEL (Feature 012)
-- ============================================================================
-- Transform from single-user to multi-tenant with:
--   - Shared company registry (deduplicated, admin-managed)
--   - User-specific tracking records
--   - Metro area organization with PostGIS
--   - Moderated community contributions
-- ============================================================================

-- T001: Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- T002: Enable pg_trgm extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- T003: Add is_admin column to user_profiles for admin identification
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_profiles.is_admin IS 'Admin flag for moderation queue access (Feature 012)';

-- T004: Create company_status enum (if not exists via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    CREATE TYPE company_status AS ENUM (
      'not_contacted',
      'contacted',
      'follow_up',
      'meeting',
      'applied',
      'interviewing',
      'offer',
      'closed'
    );
  END IF;
END $$;

-- T005: Create contribution_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contribution_status') THEN
    CREATE TYPE contribution_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'merged'
    );
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: FOUNDATIONAL DATABASE SCHEMA (7 Tables)
-- ============================================================================

-- T014: Create metro_areas table
CREATE TABLE IF NOT EXISTS metro_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  center_lat DECIMAL(10, 7) NOT NULL,
  center_lng DECIMAL(10, 7) NOT NULL,
  radius_miles INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_metro_area UNIQUE (name, state)
);

CREATE INDEX IF NOT EXISTS idx_metro_areas_state ON metro_areas(state);

ALTER TABLE metro_areas ENABLE ROW LEVEL SECURITY;

-- Metro areas are public read
DROP POLICY IF EXISTS "Anyone can view metro areas" ON metro_areas;
CREATE POLICY "Anyone can view metro areas" ON metro_areas
  FOR SELECT USING (true);

COMMENT ON TABLE metro_areas IS 'Geographic regions organizing company data (Feature 012)';

-- T015: Create shared_companies table
CREATE TABLE IF NOT EXISTS shared_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metro_area_id UUID REFERENCES metro_areas(id),
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  careers_url VARCHAR(500),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_seed BOOLEAN NOT NULL DEFAULT FALSE, -- T087: Whether this company is seed data for new users
  default_priority INTEGER NOT NULL DEFAULT 3 CHECK (default_priority IN (1, 2, 3, 5)), -- T014: Default priority for new user seeding
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_shared_company_per_metro UNIQUE (metro_area_id, name)
);

-- Add is_seed column if table existed without it (from partial migration)
DO $$
BEGIN
    ALTER TABLE shared_companies ADD COLUMN is_seed BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add default_priority column if table existed without it (Feature 014)
DO $$
BEGIN
    ALTER TABLE shared_companies ADD COLUMN default_priority INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE shared_companies ADD CONSTRAINT check_default_priority CHECK (default_priority IN (1, 2, 3, 5));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- GIN index for fuzzy name matching with pg_trgm
CREATE INDEX IF NOT EXISTS idx_shared_companies_name_trgm ON shared_companies USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shared_companies_metro ON shared_companies(metro_area_id);
-- T091: Index for seed company queries
CREATE INDEX IF NOT EXISTS idx_shared_companies_seed ON shared_companies(metro_area_id, is_seed) WHERE is_seed = TRUE;

ALTER TABLE shared_companies ENABLE ROW LEVEL SECURITY;

-- Public read, admin write
DROP POLICY IF EXISTS "Anyone can view shared companies" ON shared_companies;
CREATE POLICY "Anyone can view shared companies" ON shared_companies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert shared companies" ON shared_companies;
CREATE POLICY "Admin can insert shared companies" ON shared_companies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can update shared companies" ON shared_companies;
CREATE POLICY "Admin can update shared companies" ON shared_companies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can delete shared companies" ON shared_companies;
CREATE POLICY "Admin can delete shared companies" ON shared_companies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE shared_companies IS 'Deduplicated company registry, admin-managed (Feature 012)';

-- T016: Create company_locations table
CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_company_id UUID NOT NULL REFERENCES shared_companies(id) ON DELETE CASCADE,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIST index for PostGIS spatial queries
CREATE INDEX IF NOT EXISTS idx_company_locations_geo ON company_locations
  USING GIST (CAST(ST_SetSRID(ST_Point(longitude, latitude), 4326) AS geography));
CREATE INDEX IF NOT EXISTS idx_company_locations_company ON company_locations(shared_company_id);

ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

-- Public read, admin write
DROP POLICY IF EXISTS "Anyone can view company locations" ON company_locations;
CREATE POLICY "Anyone can view company locations" ON company_locations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert company locations" ON company_locations;
CREATE POLICY "Admin can insert company locations" ON company_locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can update company locations" ON company_locations;
CREATE POLICY "Admin can update company locations" ON company_locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin can delete company locations" ON company_locations;
CREATE POLICY "Admin can delete company locations" ON company_locations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE company_locations IS 'Physical addresses for shared companies (Feature 012)';

-- T017: Create user_company_tracking table
CREATE TABLE IF NOT EXISTS user_company_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_company_id UUID NOT NULL REFERENCES shared_companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES company_locations(id),
  status company_status NOT NULL DEFAULT 'not_contacted',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT,
  contact_name VARCHAR(100),
  contact_title VARCHAR(100),
  follow_up_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_company_location UNIQUE (user_id, shared_company_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tracking_user ON user_company_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_company ON user_company_tracking(shared_company_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_status ON user_company_tracking(user_id, status);

ALTER TABLE user_company_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tracking records
DROP POLICY IF EXISTS "Users can view own tracking" ON user_company_tracking;
CREATE POLICY "Users can view own tracking" ON user_company_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tracking" ON user_company_tracking;
CREATE POLICY "Users can create own tracking" ON user_company_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tracking" ON user_company_tracking;
CREATE POLICY "Users can update own tracking" ON user_company_tracking
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tracking" ON user_company_tracking;
CREATE POLICY "Users can delete own tracking" ON user_company_tracking
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE user_company_tracking IS 'User relationship to shared companies (Feature 012)';

-- T018: Create private_companies table
CREATE TABLE IF NOT EXISTS private_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metro_area_id UUID REFERENCES metro_areas(id),
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  careers_url VARCHAR(500),
  address VARCHAR(500),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  phone VARCHAR(20),
  email VARCHAR(255),
  contact_name VARCHAR(100),
  contact_title VARCHAR(100),
  notes TEXT,
  status company_status NOT NULL DEFAULT 'not_contacted',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  follow_up_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  submit_to_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_companies_user ON private_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_private_companies_name_trgm ON private_companies USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_private_companies_metro ON private_companies(metro_area_id);

ALTER TABLE private_companies ENABLE ROW LEVEL SECURITY;

-- Users can only access their own private companies
DROP POLICY IF EXISTS "Users can view own private companies" ON private_companies;
CREATE POLICY "Users can view own private companies" ON private_companies
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own private companies" ON private_companies;
CREATE POLICY "Users can create own private companies" ON private_companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own private companies" ON private_companies;
CREATE POLICY "Users can update own private companies" ON private_companies
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own private companies" ON private_companies;
CREATE POLICY "Users can delete own private companies" ON private_companies
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE private_companies IS 'User-owned companies not yet in shared registry (Feature 012)';

-- T019: Create company_contributions table
CREATE TABLE IF NOT EXISTS company_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  private_company_id UUID NOT NULL REFERENCES private_companies(id),
  status contribution_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_user ON company_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON company_contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_pending ON company_contributions(status) WHERE status = 'pending';

ALTER TABLE company_contributions ENABLE ROW LEVEL SECURITY;

-- Users can view own + admin can view all
DROP POLICY IF EXISTS "Users can view own contributions" ON company_contributions;
CREATE POLICY "Users can view own contributions" ON company_contributions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can create contributions" ON company_contributions;
CREATE POLICY "Users can create contributions" ON company_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update contributions" ON company_contributions;
CREATE POLICY "Admin can update contributions" ON company_contributions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE company_contributions IS 'Pending submissions to shared registry (Feature 012)';

-- T020: Create company_edit_suggestions table
CREATE TABLE IF NOT EXISTS company_edit_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  shared_company_id UUID NOT NULL REFERENCES shared_companies(id),
  location_id UUID REFERENCES company_locations(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status contribution_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edit_suggestions_user ON company_edit_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_company ON company_edit_suggestions(shared_company_id);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_pending ON company_edit_suggestions(status) WHERE status = 'pending';

ALTER TABLE company_edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view own + admin can view all
DROP POLICY IF EXISTS "Users can view own suggestions" ON company_edit_suggestions;
CREATE POLICY "Users can view own suggestions" ON company_edit_suggestions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can create suggestions" ON company_edit_suggestions;
CREATE POLICY "Users can create suggestions" ON company_edit_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update suggestions" ON company_edit_suggestions;
CREATE POLICY "Admin can update suggestions" ON company_edit_suggestions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE company_edit_suggestions IS 'Pending data corrections for shared companies (Feature 012)';

-- T022: Create user_companies_unified view
DROP VIEW IF EXISTS user_companies_unified;
-- View uses security_invoker to respect RLS on underlying tables
-- Updated Feature 014: Pull contact info from company_locations (HQ), with user overrides
CREATE OR REPLACE VIEW user_companies_unified
WITH (security_invoker = true) AS
SELECT
  CAST('shared' AS text) as source,
  sc.id as company_id,
  CAST(NULL AS uuid) as private_company_id,
  uct.id as tracking_id,
  sc.name,
  sc.website,
  sc.careers_url,
  COALESCE(cl.address, hq.address, '') as address,
  COALESCE(cl.latitude, hq.latitude, 0) as latitude,
  COALESCE(cl.longitude, hq.longitude, 0) as longitude,
  COALESCE(cl.phone, hq.phone, '') as phone,
  COALESCE(cl.email, hq.email, '') as email,
  -- Feature 014: Prefer company_locations contact, then user override, then HQ contact
  COALESCE(uct.contact_name, cl.contact_name, hq.contact_name, '') as contact_name,
  COALESCE(uct.contact_title, cl.contact_title, hq.contact_title, '') as contact_title,
  uct.notes,
  uct.status,
  uct.priority,
  uct.follow_up_date,
  uct.is_active,
  sc.is_verified,
  uct.user_id,
  uct.created_at,
  uct.updated_at
FROM user_company_tracking uct
JOIN shared_companies sc ON uct.shared_company_id = sc.id
LEFT JOIN company_locations cl ON uct.location_id = cl.id
-- Feature 014: Also join headquarters location for fallback contact info
LEFT JOIN company_locations hq ON hq.shared_company_id = sc.id AND hq.is_headquarters = true

UNION ALL

SELECT
  CAST('private' AS text) as source,
  CAST(NULL AS uuid) as company_id,
  pc.id as private_company_id,
  CAST(NULL AS uuid) as tracking_id,
  pc.name,
  pc.website,
  pc.careers_url,
  COALESCE(pc.address, '') as address,
  COALESCE(pc.latitude, 0) as latitude,
  COALESCE(pc.longitude, 0) as longitude,
  COALESCE(pc.phone, '') as phone,
  COALESCE(pc.email, '') as email,
  COALESCE(pc.contact_name, '') as contact_name,
  COALESCE(pc.contact_title, '') as contact_title,
  pc.notes,
  pc.status,
  pc.priority,
  pc.follow_up_date,
  pc.is_active,
  false as is_verified,
  pc.user_id,
  pc.created_at,
  pc.updated_at
FROM private_companies pc;

COMMENT ON VIEW user_companies_unified IS 'Unified view combining shared tracking + private companies (Feature 012)';

-- T023: Create assign_metro_area trigger function
CREATE OR REPLACE FUNCTION assign_metro_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT id INTO NEW.metro_area_id
    FROM metro_areas
    WHERE ST_DWithin(
      CAST(ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326) AS geography),
      CAST(ST_SetSRID(ST_Point(center_lng, center_lat), 4326) AS geography),
      radius_miles * 1609.34  -- Convert miles to meters
    )
    ORDER BY ST_Distance(
      CAST(ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326) AS geography),
      CAST(ST_SetSRID(ST_Point(center_lng, center_lat), 4326) AS geography)
    )
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_company_metro_area ON private_companies;
CREATE TRIGGER trg_private_company_metro_area
  BEFORE INSERT OR UPDATE ON private_companies
  FOR EACH ROW
  EXECUTE FUNCTION assign_metro_area();

COMMENT ON FUNCTION assign_metro_area() IS 'Auto-infer metro_area_id from coordinates (Feature 012)';

-- T024: Create update_updated_at triggers for new tables
DROP TRIGGER IF EXISTS trg_shared_companies_updated_at ON shared_companies;
CREATE TRIGGER trg_shared_companies_updated_at
  BEFORE UPDATE ON shared_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_company_tracking_updated_at ON user_company_tracking;
CREATE TRIGGER trg_user_company_tracking_updated_at
  BEFORE UPDATE ON user_company_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_private_companies_updated_at ON private_companies;
CREATE TRIGGER trg_private_companies_updated_at
  BEFORE UPDATE ON private_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- T025: Insert Cleveland, TN metro area
INSERT INTO metro_areas (name, state, center_lat, center_lng, radius_miles)
VALUES ('Cleveland, TN', 'TN', 35.1595, -84.8707, 30)
ON CONFLICT (name, state) DO NOTHING;

-- T071: Create find_similar_companies RPC function for match detection
DROP FUNCTION IF EXISTS find_similar_companies(text,numeric,numeric,text);
DROP FUNCTION IF EXISTS find_similar_companies(text,decimal,decimal,text);
CREATE OR REPLACE FUNCTION find_similar_companies(
  p_company_name TEXT,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_website_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  website TEXT,
  careers_url TEXT,
  is_verified BOOLEAN,
  location_id UUID,
  address TEXT,
  distance_miles DECIMAL,
  name_similarity DECIMAL,
  domain_match BOOLEAN,
  confidence TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  similarity_threshold DECIMAL := 0.3;
  proximity_miles DECIMAL := 5.0;
BEGIN
  RETURN QUERY
  SELECT
    sc.id as company_id,
    CAST(sc.name AS TEXT) as company_name,
    CAST(sc.website AS TEXT) as website,
    CAST(sc.careers_url AS TEXT) as careers_url,
    sc.is_verified,
    cl.id as location_id,
    CAST(cl.address AS TEXT) as address,
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND cl.latitude IS NOT NULL THEN
        ROUND(CAST(ST_Distance(
          CAST(ST_SetSRID(ST_Point(p_longitude, p_latitude), 4326) AS geography),
          CAST(ST_SetSRID(ST_Point(cl.longitude, cl.latitude), 4326) AS geography)
        ) / 1609.34 AS decimal), 2)
      ELSE NULL
    END as distance_miles,
    ROUND(CAST(similarity(sc.name, p_company_name) AS decimal), 3) as name_similarity,
    CASE
      WHEN p_website_domain IS NOT NULL AND sc.website IS NOT NULL
           AND sc.website ILIKE '%' || p_website_domain || '%'
      THEN TRUE
      ELSE FALSE
    END as domain_match,
    CASE
      WHEN similarity(sc.name, p_company_name) >= 0.7 THEN 'high'
      WHEN p_website_domain IS NOT NULL AND sc.website ILIKE '%' || p_website_domain || '%' THEN 'high'
      WHEN similarity(sc.name, p_company_name) >= 0.4 THEN 'medium'
      ELSE 'low'
    END as confidence
  FROM shared_companies sc
  LEFT JOIN company_locations cl ON cl.shared_company_id = sc.id
  WHERE similarity(sc.name, p_company_name) >= similarity_threshold
     OR (p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND cl.latitude IS NOT NULL AND
         ST_DWithin(
           CAST(ST_SetSRID(ST_Point(p_longitude, p_latitude), 4326) AS geography),
           CAST(ST_SetSRID(ST_Point(cl.longitude, cl.latitude), 4326) AS geography),
           proximity_miles * 1609.34
         ))
     OR (p_website_domain IS NOT NULL AND sc.website ILIKE '%' || p_website_domain || '%')
  ORDER BY name_similarity DESC, distance_miles ASC NULLS LAST
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION find_similar_companies IS 'Match detection using fuzzy name + proximity + domain (Feature 012)';

-- Grant permissions for new tables
GRANT SELECT ON metro_areas TO authenticated;
GRANT SELECT ON shared_companies TO authenticated;
GRANT SELECT ON company_locations TO authenticated;
GRANT ALL ON user_company_tracking TO authenticated;
GRANT ALL ON private_companies TO authenticated;
GRANT ALL ON company_contributions TO authenticated;
GRANT ALL ON company_edit_suggestions TO authenticated;
GRANT SELECT ON user_companies_unified TO authenticated;

GRANT ALL ON metro_areas TO service_role;
GRANT ALL ON shared_companies TO service_role;
GRANT ALL ON company_locations TO service_role;
GRANT ALL ON user_company_tracking TO service_role;
GRANT ALL ON private_companies TO service_role;
GRANT ALL ON company_contributions TO service_role;
GRANT ALL ON company_edit_suggestions TO service_role;

-- Auto-assign metro_area_id to user_profiles based on home coordinates
CREATE OR REPLACE FUNCTION assign_user_metro_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign metro area based on home coordinates
  IF NEW.home_latitude IS NOT NULL AND NEW.home_longitude IS NOT NULL THEN
    SELECT id INTO NEW.metro_area_id
    FROM metro_areas
    WHERE ST_DWithin(
      CAST(ST_SetSRID(ST_Point(NEW.home_longitude, NEW.home_latitude), 4326) AS geography),
      CAST(ST_SetSRID(ST_Point(center_lng, center_lat), 4326) AS geography),
      radius_miles * 1609.34  -- Convert miles to meters
    )
    ORDER BY ST_Distance(
      CAST(ST_SetSRID(ST_Point(NEW.home_longitude, NEW.home_latitude), 4326) AS geography),
      CAST(ST_SetSRID(ST_Point(center_lng, center_lat), 4326) AS geography)
    )
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION assign_user_metro_area() IS 'Auto-assign metro_area_id based on user home coordinates (Feature 012)';

-- Trigger to auto-assign metro area when user sets home location
DROP TRIGGER IF EXISTS trg_assign_user_metro_area ON user_profiles;
CREATE TRIGGER trg_assign_user_metro_area
  BEFORE INSERT OR UPDATE OF home_latitude, home_longitude ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_metro_area();

-- T091: Create seed_user_companies function to auto-create tracking for new users
-- Updated: Also fires on UPDATE when metro_area_id is set for the first time
CREATE OR REPLACE FUNCTION seed_user_companies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-create tracking records for seed companies in user's metro area
  -- Only seed when metro_area_id transitions from NULL to a value
  -- This prevents re-seeding when user changes metro areas
  IF NEW.metro_area_id IS NOT NULL AND (OLD IS NULL OR OLD.metro_area_id IS NULL) THEN
    INSERT INTO user_company_tracking (user_id, shared_company_id, status, priority, is_active)
    SELECT
      NEW.id,
      sc.id,
      'not_contacted',
      COALESCE(sc.default_priority, 3),  -- Use company's default priority (Feature 014)
      true
    FROM shared_companies sc
    WHERE sc.metro_area_id = NEW.metro_area_id
      AND sc.is_seed = true
      AND sc.is_verified = true
    ON CONFLICT DO NOTHING;  -- Ignore if already tracking
  END IF;
  RETURN NEW;
END;
$$;

-- T091: Trigger to auto-seed companies on user profile creation or home location update
-- Note: Uses AFTER INSERT OR UPDATE (not UPDATE OF metro_area_id) because metro_area_id
-- is set by the assign_user_metro_area BEFORE trigger, not by the UPDATE statement itself
DROP TRIGGER IF EXISTS trg_seed_user_companies ON user_profiles;
CREATE TRIGGER trg_seed_user_companies
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION seed_user_companies();

COMMENT ON FUNCTION seed_user_companies() IS 'Auto-create tracking for seed companies when user signs up or sets home location (Feature 012 US4)';

-- T091: Helper function to get metro areas with seed company counts
CREATE OR REPLACE FUNCTION get_metro_areas_with_seed_count()
RETURNS TABLE (
  id UUID,
  name TEXT,
  seed_company_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    ma.id,
    ma.name,
    COUNT(sc.id) as seed_company_count
  FROM metro_areas ma
  LEFT JOIN shared_companies sc ON sc.metro_area_id = ma.id
    AND sc.is_seed = true
    AND sc.is_verified = true
  GROUP BY ma.id, ma.name
  HAVING COUNT(sc.id) > 0
  ORDER BY ma.name;
$$;

COMMENT ON FUNCTION get_metro_areas_with_seed_count() IS 'Get metro areas that have seed data available (Feature 012 US4)';

-- ============================================================================
-- END FEATURE 012: Multi-Tenant Company Data Model
-- ============================================================================

-- ============================================================================
-- FEATURE 014: Job Applications and Data Quality Fix
-- Fixes broken FK from Feature 012 migration
-- ============================================================================

-- T003: Add contact columns to company_locations
ALTER TABLE company_locations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_title TEXT;

COMMENT ON COLUMN company_locations.contact_name IS 'Primary contact name at this location (Feature 014)';
COMMENT ON COLUMN company_locations.contact_title IS 'Primary contact job title (Feature 014)';

-- T004: Fix job_applications foreign keys
-- Step 1: Drop broken FK constraint to deleted companies table
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_company_id_fkey;

-- Step 2: Drop broken column (was referencing deleted 'companies' table)
ALTER TABLE job_applications
  DROP COLUMN IF EXISTS company_id;

-- Step 3: Add new columns for multi-tenant architecture
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS shared_company_id UUID REFERENCES shared_companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS private_company_id UUID REFERENCES private_companies(id) ON DELETE CASCADE;

-- Step 4: Add CHECK constraint - exactly one company reference must be set
-- Use DO block to make idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_applications_company_ref_check'
  ) THEN
    ALTER TABLE job_applications
      ADD CONSTRAINT job_applications_company_ref_check
      CHECK (
        (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
        (shared_company_id IS NULL AND private_company_id IS NOT NULL)
      );
  END IF;
END $$;

-- Step 5: Add partial indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_applications_shared_company
  ON job_applications(shared_company_id) WHERE shared_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_private_company
  ON job_applications(private_company_id) WHERE private_company_id IS NOT NULL;

-- Step 6: Drop old index that referenced company_id
DROP INDEX IF EXISTS idx_job_applications_company;

COMMENT ON COLUMN job_applications.shared_company_id IS 'FK to shared_companies for community companies (Feature 014)';
COMMENT ON COLUMN job_applications.private_company_id IS 'FK to private_companies for user-created companies (Feature 014)';

-- T005: Update RLS policies for job_applications (ensure they work with new schema)
-- Policies already exist from original table creation, just verify they use user_id correctly
-- The existing policies use auth.uid() = user_id which is correct for multi-tenant isolation

-- ============================================================================
-- END FEATURE 014: Job Applications and Data Quality Fix
-- ============================================================================

-- ============================================================================
-- FEATURE 041: Bicycle Route Planning
-- Created: 2025-12-08
-- Purpose: Enable users to create, save, and manage cycling routes with
--          company associations, next-ride planning, and map tile providers
-- ============================================================================

-- T001: Create map_tile_providers table
CREATE TABLE IF NOT EXISTS map_tile_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  url_template TEXT NOT NULL,
  attribution TEXT NOT NULL,
  max_zoom INTEGER NOT NULL DEFAULT 18,
  is_cycling_optimized BOOLEAN NOT NULL DEFAULT FALSE,
  requires_api_key BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE map_tile_providers IS 'Configuration for available map tile sources (Feature 041)';

-- RLS for map_tile_providers (public read, admin write)
ALTER TABLE map_tile_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'map_tile_providers' AND policyname = 'map_tile_providers_select'
  ) THEN
    CREATE POLICY map_tile_providers_select ON map_tile_providers FOR SELECT USING (true);
  END IF;
END $$;

-- T001: Create bicycle_routes table
CREATE TABLE IF NOT EXISTS bicycle_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metro_area_id UUID REFERENCES metro_areas(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL CHECK (char_length(name) >= 1),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  start_address TEXT,
  start_latitude DECIMAL(10,8) CHECK (start_latitude IS NULL OR (start_latitude >= -90 AND start_latitude <= 90)),
  start_longitude DECIMAL(11,8) CHECK (start_longitude IS NULL OR (start_longitude >= -180 AND start_longitude <= 180)),
  end_address TEXT,
  end_latitude DECIMAL(10,8) CHECK (end_latitude IS NULL OR (end_latitude >= -90 AND end_latitude <= 90)),
  end_longitude DECIMAL(11,8) CHECK (end_longitude IS NULL OR (end_longitude >= -180 AND end_longitude <= 180)),
  route_geometry JSONB,
  distance_miles DECIMAL(8,2),
  estimated_time_minutes INTEGER,
  is_system_route BOOLEAN NOT NULL DEFAULT FALSE,
  source_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bicycle_routes IS 'User-defined and system bicycle routes with GeoJSON geometry (Feature 041)';

-- Indexes for bicycle_routes
CREATE INDEX IF NOT EXISTS idx_bicycle_routes_user ON bicycle_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_bicycle_routes_metro ON bicycle_routes(metro_area_id);
CREATE INDEX IF NOT EXISTS idx_bicycle_routes_system ON bicycle_routes(is_system_route) WHERE is_system_route = TRUE;
CREATE INDEX IF NOT EXISTS idx_bicycle_routes_active ON bicycle_routes(user_id, is_active);

-- RLS for bicycle_routes
ALTER TABLE bicycle_routes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bicycle_routes' AND policyname = 'bicycle_routes_select'
  ) THEN
    CREATE POLICY bicycle_routes_select ON bicycle_routes FOR SELECT
      USING (auth.uid() = user_id OR is_system_route = TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bicycle_routes' AND policyname = 'bicycle_routes_insert'
  ) THEN
    CREATE POLICY bicycle_routes_insert ON bicycle_routes FOR INSERT
      WITH CHECK (auth.uid() = user_id AND is_system_route = FALSE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bicycle_routes' AND policyname = 'bicycle_routes_update'
  ) THEN
    CREATE POLICY bicycle_routes_update ON bicycle_routes FOR UPDATE
      USING (auth.uid() = user_id AND is_system_route = FALSE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bicycle_routes' AND policyname = 'bicycle_routes_delete'
  ) THEN
    CREATE POLICY bicycle_routes_delete ON bicycle_routes FOR DELETE
      USING (auth.uid() = user_id AND is_system_route = FALSE);
  END IF;
END $$;

-- T001: Create route_companies junction table
CREATE TABLE IF NOT EXISTS route_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES bicycle_routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_company_id UUID REFERENCES shared_companies(id) ON DELETE CASCADE,
  private_company_id UUID REFERENCES private_companies(id) ON DELETE CASCADE,
  tracking_id UUID REFERENCES user_company_tracking(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  visit_on_next_ride BOOLEAN NOT NULL DEFAULT FALSE,
  distance_from_start_miles DECIMAL(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE route_companies IS 'Junction table linking routes to companies with ordering (Feature 041)';

-- Constraint: exactly one company reference must be set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'route_companies_company_ref_check'
  ) THEN
    ALTER TABLE route_companies
      ADD CONSTRAINT route_companies_company_ref_check
      CHECK (
        (shared_company_id IS NOT NULL AND private_company_id IS NULL) OR
        (shared_company_id IS NULL AND private_company_id IS NOT NULL)
      );
  END IF;
END $$;

-- Unique constraint for route-company combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'route_companies_unique_association'
  ) THEN
    ALTER TABLE route_companies
      ADD CONSTRAINT route_companies_unique_association
      UNIQUE (route_id, shared_company_id, private_company_id);
  END IF;
END $$;

-- Indexes for route_companies
CREATE INDEX IF NOT EXISTS idx_route_companies_route ON route_companies(route_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_route_companies_user ON route_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_route_companies_shared ON route_companies(shared_company_id) WHERE shared_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_route_companies_private ON route_companies(private_company_id) WHERE private_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_route_companies_next_ride ON route_companies(user_id, visit_on_next_ride) WHERE visit_on_next_ride = TRUE;

-- RLS for route_companies
ALTER TABLE route_companies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'route_companies' AND policyname = 'route_companies_all'
  ) THEN
    CREATE POLICY route_companies_all ON route_companies FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- T001: Create active_route_planning table (one active route per user)
CREATE TABLE IF NOT EXISTS active_route_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES bicycle_routes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE active_route_planning IS 'Tracks users current route being planned - one per user (Feature 041)';

-- RLS for active_route_planning
ALTER TABLE active_route_planning ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'active_route_planning' AND policyname = 'active_route_planning_all'
  ) THEN
    CREATE POLICY active_route_planning_all ON active_route_planning FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Feature 046: Route Optimization - Add start/end type and round-trip columns
ALTER TABLE bicycle_routes
ADD COLUMN IF NOT EXISTS start_type TEXT DEFAULT 'home' CHECK (start_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS end_type TEXT DEFAULT 'home' CHECK (end_type IN ('home', 'custom')),
ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_optimized_at TIMESTAMPTZ;

COMMENT ON COLUMN bicycle_routes.start_type IS 'Whether start uses home location or custom coordinates (Feature 046)';
COMMENT ON COLUMN bicycle_routes.end_type IS 'Whether end uses home location or custom coordinates (Feature 046)';
COMMENT ON COLUMN bicycle_routes.is_round_trip IS 'True if route returns to start point (Feature 046)';
COMMENT ON COLUMN bicycle_routes.last_optimized_at IS 'Timestamp of last TSP optimization (Feature 046)';

-- T004: Seed map_tile_providers with default providers
INSERT INTO map_tile_providers (name, display_name, url_template, attribution, max_zoom, is_cycling_optimized, requires_api_key, priority)
VALUES
  ('osm', 'OpenStreetMap', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap contributors', 19, FALSE, FALSE, 0),
  ('cyclosm', 'CyclOSM', 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', '© CyclOSM | Map data © OpenStreetMap contributors', 20, TRUE, FALSE, 15),
  ('opencyclemap', 'OpenCycleMap', 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}', '© Thunderforest, OpenStreetMap contributors', 22, TRUE, TRUE, 10),
  ('thunderforest_outdoors', 'Outdoors', 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}', '© Thunderforest, OpenStreetMap contributors', 22, TRUE, TRUE, 5)
ON CONFLICT (name) DO NOTHING;

-- T005: Seed Cleveland GreenWay system route
-- Note: This is a system route visible to all users in the Cleveland/Bradley County area
-- Coordinates trace the 4.2-mile paved trail from Mohawk Drive to Willow Street
INSERT INTO bicycle_routes (
  user_id,
  metro_area_id,
  name,
  description,
  color,
  start_address,
  start_latitude,
  start_longitude,
  end_address,
  end_latitude,
  end_longitude,
  route_geometry,
  distance_miles,
  estimated_time_minutes,
  is_system_route,
  source_name
)
SELECT
  (SELECT id FROM auth.users LIMIT 1), -- Will be updated to admin user or system user
  (SELECT id FROM metro_areas WHERE name ILIKE '%cleveland%' OR name ILIKE '%bradley%' LIMIT 1),
  'Cleveland GreenWay',
  'A 4.2-mile paved multi-use trail connecting Mohawk Drive to Willow Street in Cleveland, TN. Features 9 access points, creek crossings, and connections to downtown Cleveland.',
  '#10B981', -- Emerald green for trail
  'Mohawk Drive Trailhead, Cleveland, TN',
  35.1667,
  -84.8667,
  'Willow Street Trailhead, Cleveland, TN',
  35.1333,
  -84.8833,
  '{"type": "LineString", "coordinates": [[-84.8667, 35.1667], [-84.8700, 35.1600], [-84.8750, 35.1500], [-84.8800, 35.1400], [-84.8833, 35.1333]]}'::jsonb,
  4.2,
  25,
  TRUE,
  'Cleveland GreenWay Coalition'
WHERE NOT EXISTS (
  SELECT 1 FROM bicycle_routes WHERE name = 'Cleveland GreenWay' AND is_system_route = TRUE
);

-- Function to update bicycle_routes.updated_at on changes
CREATE OR REPLACE FUNCTION update_bicycle_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bicycle_routes.updated_at
DROP TRIGGER IF EXISTS bicycle_routes_updated_at ON bicycle_routes;
CREATE TRIGGER bicycle_routes_updated_at
  BEFORE UPDATE ON bicycle_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_bicycle_routes_updated_at();

-- Function to update active_route_planning.last_modified_at on changes
CREATE OR REPLACE FUNCTION update_active_route_planning_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for active_route_planning.last_modified_at
DROP TRIGGER IF EXISTS active_route_planning_modified ON active_route_planning;
CREATE TRIGGER active_route_planning_modified
  BEFORE UPDATE ON active_route_planning
  FOR EACH ROW
  EXECUTE FUNCTION update_active_route_planning_modified();

-- ============================================================================
-- END FEATURE 041: Bicycle Route Planning
-- ============================================================================

-- ============================================================================
-- SECURITY: Audit Log Cleanup (90-day retention)
-- ============================================================================
-- Automatically delete audit logs older than 90 days to:
-- 1. Comply with data retention policies
-- 2. Prevent unbounded table growth
-- 3. Reduce storage costs
--
-- Usage: Call manually or schedule via pg_cron:
--   SELECT cleanup_old_audit_logs();
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  DELETE FROM auth_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Deletes auth_audit_logs older than 90 days. Returns count of deleted rows. Call daily via pg_cron or GitHub Action.';

-- Note: To schedule automatic cleanup with pg_cron (requires extension enabled in Supabase dashboard):
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * *', 'SELECT cleanup_old_audit_logs()');
-- This runs daily at 3 AM UTC

-- ============================================================================
-- END SECURITY: Audit Log Cleanup
-- ============================================================================

-- Commit the transaction - everything succeeded
COMMIT;

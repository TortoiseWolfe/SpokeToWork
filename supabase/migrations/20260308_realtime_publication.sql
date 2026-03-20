-- Enable Supabase Realtime for messaging tables
-- Required for real-time message delivery, typing indicators, and status updates
--
-- This migration adds tables to the supabase_realtime publication and sets
-- REPLICA IDENTITY FULL so UPDATE/DELETE events include the full row payload.
--
-- Tables:
--   conversations       - Real-time conversation list updates
--   conversation_members - Group membership changes
--   messages            - New messages and delivery/read status updates
--   typing_indicators   - Typing indicator presence
--   user_connections     - Friend request status changes

-- Create _realtime schema (Realtime service stores its internal migrations here)
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;

-- Create supabase_realtime publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- REPLICA IDENTITY FULL is required for Realtime UPDATE/DELETE events
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_members REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE user_connections REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- Using IF NOT EXISTS pattern: check pg_publication_tables first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'typing_indicators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_connections;
  END IF;
END $$;

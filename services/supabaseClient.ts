import { createClient } from '@supabase/supabase-js';

// Vmind Supabase credentials provided by the user.
const supabaseUrl = 'https://nlnuncqkrixluksynbti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbnVuY3Frcml4bHVrc3luYnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzQ2MDcsImV4cCI6MjA3NDY1MDYwN30.cVKa5yJmsFWQmuKWCNQ4XDddX_61C2bgv6Pt220F55Y';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL and Anon Key are not provided. Supabase integration will be disabled.");
    // In a real app, you might throw an error, but for this demo, we'll allow offline mode to function.
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
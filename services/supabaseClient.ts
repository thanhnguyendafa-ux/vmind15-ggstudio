import { createClient } from '@supabase/supabase-js';

// Vmind Supabase credentials provided by the user.
const supabaseUrl = 'https://aaaaitmikgoddggiptdt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYWFpdG1pa2dvZGRnZ2lwdGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzY2OTAsImV4cCI6MjA3NDkxMjY5MH0.qhA34nERiC0aZiQi2sNB_IK70IlQNJ8GUGe9YpnxAFA';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL and Anon Key are not provided. Supabase integration will be disabled.");
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
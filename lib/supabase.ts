
import { createClient } from '@supabase/supabase-js';

// Environment variables or hardcoded credentials for direct connection
const supabaseUrl = 'https://egwvlodoqzvjbqolnfqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd3Zsb2RvcXp2amJxb2xuZnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODU4MTAsImV4cCI6MjA4NTg2MTgxMH0.7gzZOyYAN3mQdDPw5619fze8Fv_dz95aOBpCF-oQ1aw';

// Check if the configuration is valid
export const isSupabaseConfigured = 
  // Fix: casting to string to avoid comparison error between non-overlapping literal types on line 10
  (supabaseUrl as string) !== 'https://placeholder.supabase.co' && 
  // Fix: casting to string to avoid comparison error between non-overlapping literal types on line 11
  (supabaseAnonKey as string) !== 'placeholder-key' &&
  supabaseUrl.startsWith('https://');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility for formatting currency in Bangla
export const formatCurrency = (amount: number) => {
  return amount.toLocaleString('bn-BD', {
    style: 'currency',
    currency: 'BDT',
  }).replace('BDT', '৳');
};

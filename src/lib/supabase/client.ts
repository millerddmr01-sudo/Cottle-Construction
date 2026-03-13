import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const createClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

    // If on the server, create a new client instance
    if (typeof window === 'undefined') {
        return createSupabaseClient(supabaseUrl, supabaseKey);
    }

    // If on the browser, create a singleton client instance
    if (!supabaseClient) {
        supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey);
    }

    return supabaseClient;
};

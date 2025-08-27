import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const { PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
export const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false,
	},
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * 환경 변수가 없으면 null — 방명록만 "준비 중"으로 보이고
 * 나머지 섬은 정상 동작해요. (로컬에서 Supabase 없이도 개발 가능)
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

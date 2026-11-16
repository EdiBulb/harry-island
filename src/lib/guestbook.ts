import { supabase } from "./supabase";
import { storage } from "./storage";

export const STAMPS = ["🐣", "🌸", "🍀", "⭐", "🎉", "☕"] as const;
export type Stamp = (typeof STAMPS)[number];

/** DB의 check 제약과 같은 값 — 둘 다 고칠 것 (supabase/schema.sql) */
export const LIMITS = { name: 20, message: 300 } as const;
const COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = "harryIsland.lastLetterAt";

export interface Letter {
  id: string;
  name: string;
  message: string;
  stamp: Stamp;
  created_at: string;
}

export interface NewLetter {
  name: string;
  message: string;
  stamp: Stamp;
}

export class GuestbookError extends Error {}

export const isGuestbookEnabled = () => supabase !== null;

export async function fetchLetters(limit = 100): Promise<Letter[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("guestbook")
    .select("id, name, message, stamp, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new GuestbookError("편지함을 열 수 없어요. 잠시 후 다시 시도해 주세요.");
  return data as Letter[];
}

/** 연속 도배를 막는 클라이언트 쪽 1차 방어 (서버에도 rate limit 트리거가 있어요) */
export function cooldownLeft(): number {
  const last = Number(storage.get(COOLDOWN_KEY) ?? 0);
  return Math.max(0, last + COOLDOWN_MS - Date.now());
}

export async function postLetter(input: NewLetter): Promise<Letter> {
  if (!supabase) throw new GuestbookError("방명록이 아직 준비 중이에요.");

  const name = input.name.trim();
  const message = input.message.trim();
  if (!name || !message) throw new GuestbookError("이름과 내용을 모두 적어 주세요.");
  if (name.length > LIMITS.name || message.length > LIMITS.message) throw new GuestbookError("글자 수가 너무 많아요.");
  if (cooldownLeft() > 0) throw new GuestbookError("편지는 1분에 한 통만 보낼 수 있어요.");

  const { data, error } = await supabase
    .from("guestbook")
    .insert({ name, message, stamp: input.stamp })
    .select("id, name, message, stamp, created_at")
    .single();

  if (error) throw new GuestbookError("앗, 전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
  storage.set(COOLDOWN_KEY, String(Date.now()));
  return data as Letter;
}

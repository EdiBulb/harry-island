-- =====================================================================
-- 하리섬 방명록 (guestbook)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- =====================================================================

create table if not exists public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 20),
  message     text not null check (char_length(btrim(message)) between 1 and 300),
  stamp       text not null default '🐣' check (stamp in ('🐣','🌸','🍀','⭐','🎉','☕')),
  is_hidden   boolean not null default false,   -- 관리용: true면 사이트에서 숨김
  created_at  timestamptz not null default now()
);

create index if not exists guestbook_created_at_idx on public.guestbook (created_at desc);

-- ---------------------------------------------------------------------
-- RLS (행 수준 보안)
-- anon key는 브라우저에 공개되므로, 권한은 반드시 정책으로 막아야 해요.
--   ✅ 누구나: 숨기지 않은 편지 읽기, 새 편지 쓰기
--   ❌ 누구도: 남의 편지 수정·삭제 (정책이 없으니 자동 차단)
--   → 수정/삭제/숨김은 대시보드(Table Editor)에서 하리만 할 수 있어요.
-- ---------------------------------------------------------------------
alter table public.guestbook enable row level security;

drop policy if exists "guestbook_read_visible" on public.guestbook;
create policy "guestbook_read_visible"
  on public.guestbook for select
  to anon, authenticated
  using (is_hidden = false);

drop policy if exists "guestbook_insert" on public.guestbook;
create policy "guestbook_insert"
  on public.guestbook for insert
  to anon, authenticated
  with check (is_hidden = false);

-- ---------------------------------------------------------------------
-- 서버 쪽 도배 방지: 섬 전체에서 1분에 20통 넘게 들어오면 거절
-- 그리고 클라이언트가 보낸 created_at / is_hidden 값은 무시하고 서버 값으로 덮어써요.
-- ---------------------------------------------------------------------
create or replace function public.guestbook_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.guestbook where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'guestbook rate limit exceeded';
  end if;
  new.created_at := now();
  new.is_hidden  := false;
  return new;
end;
$$;

drop trigger if exists guestbook_before_insert on public.guestbook;
create trigger guestbook_before_insert
  before insert on public.guestbook
  for each row execute function public.guestbook_before_insert();

# 🏝 하리섬 · Harry's Island

> 병아리 하리를 따라 섬을 걸으며, 하리가 걸어온 길과 모아 온 것들을 구경하는
> 동물의 숲 스타일 온라인 자기소개 웹사이트

**Live:** https://edibulb.github.io/harry-island/

## ✨ 기능

| 장소 | 내용 |
| --- | --- |
| 🏠 하리네 집 | 자기소개, 좋아하는 것, 언어, 살고 싶은 삶 |
| 🌳 소원나무 | 버킷리스트와 달성률 |
| 🏛️ 박물관 | 자격증·메달·학위 컬렉션 |
| ✈️ 공항 | 여권 도장(다녀온 나라), 여행 일지 |
| 🔨 작업실 | AI로 만든 제품들, 100개 출시 진행률 |
| 📺 방송국 | YouTube·Instagram 채널, 근황 |
| 🪧 추억의 길 | 인생 타임라인 |
| ⛺ 캠핑장 | 취미 |
| 📮 우체통 | 방명록 (Supabase) |

- 섬을 탭하면 병아리가 걸어가고, 건물을 탭하면 문 앞까지 가서 안내 시트가 열려요.
- PC에서는 **방향키 / WASD**로 이동, **Enter**로 입장, **Esc**로 닫기
- 📱 **하리폰**: 게임 없이 모든 내용을 한 화면에서 보는 빠른 보기
- 오클랜드 현지 시각에 맞춰 섬에 밤이 찾아와요
- `#museum`처럼 건물별 공유 링크 지원

## 🛠 기술 스택

- **React 18 + TypeScript + Vite**
- 섬은 게임 엔진 없이 **SVG + DOM**으로 구현
- 이동은 `requestAnimationFrame` 루프 + ref로 처리해 매 프레임 리렌더링을 피함 (`src/hooks/usePlayerMovement.ts`)
- 걸을 수 있는 영역은 SVG `path.isPointInFill()`로 판정
- 방명록: **Supabase (Postgres + RLS + rate limit 트리거)**
- 배포: **GitHub Actions → GitHub Pages**

## 📁 구조

```
src/
├─ data/          ← 콘텐츠는 전부 여기! (타입이 있는 TS 파일)
├─ components/    ← 섬, 병아리, 건물, 시트, 하리폰, 방명록
├─ sections/      ← 건물별 내용 화면
├─ hooks/         ← 이동, 타자기 효과, 오클랜드 시계
└─ lib/           ← Supabase, 방명록 API, 해시 라우팅
supabase/schema.sql
```

## ✏️ 콘텐츠 추가하기

새 성취가 생기면 `src/data/`의 파일에 한 줄만 추가하면 돼요.

```ts
// src/data/museum.ts
export const museum: MuseumItem[] = [
  { icon: "🏅", title: "오클랜드 마라톤 완주 메달", date: "2027", desc: "드디어 풀코스 완주!" },
  // ...
];
```

상단 통계(다녀온 나라, 출시 수, 수집품, 버킷리스트)는 데이터에서 자동으로 계산돼요.

## 🚀 로컬 실행

```bash
npm install
cp .env.example .env.local   # Supabase 값 입력 (없어도 섬은 동작, 방명록만 "준비 중")
npm run dev
```

## 📮 방명록 설정 (Supabase)

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에 `supabase/schema.sql` 붙여넣고 Run
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키 복사
4. `.env.production`에 Project URL과 **publishable key**(`sb_publishable_...`)를 넣어 커밋
   (로컬 개발은 같은 값을 `.env.local`에)

> ⚠️ publishable(anon) 키는 빌드된 JS에 어차피 포함되는 공개 키라 커밋해도 괜찮아요 — RLS가 권한을 지켜줘요.
> **`sb_secret_...` / `service_role` 키는 절대 프론트엔드나 저장소에 넣지 마세요.**

부적절한 편지는 대시보드 Table Editor에서 `is_hidden`을 `true`로 바꾸면 사이트에서 사라져요.

## 🌐 배포

1. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정
2. `main`에 push하면 자동 배포
3. (선택) 커스텀 도메인: Pages 설정에서 `island.abracadelulu.com` 입력 후,
   DNS에 `CNAME island → edibulb.github.io` 추가

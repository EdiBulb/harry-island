import type { Location, LocationId } from "./types";

export const locations: Location[] = [
  { id: "wish", x: 200, y: 150, icon: "🌳", label: "소원나무", npc: "⭐", title: "소원나무 · 버킷리스트", say: "열매가 하나씩 익을 때마다 소원이 이뤄진 거예요!" },
  { id: "airport", x: 95, y: 175, icon: "✈️", label: "공항", npc: "🛫", title: "하리 공항 · 여행 기록", say: "여권 도장, 하나씩 구경하고 가세요~" },
  { id: "museum", x: 305, y: 195, icon: "🏛️", label: "박물관", npc: "🦉", title: "하리 박물관 · 수집품", say: "호오… 기증품이 차곡차곡 모이고 있다네!" },
  { id: "home", x: 200, y: 345, icon: "🏠", label: "하리네 집", npc: "🐣", title: "하리네 집 · 나는 이런 사람", say: "어서 와요! 제 얘기 좀 들어 볼래요?" },
  { id: "workshop", x: 88, y: 375, icon: "🔨", label: "작업실", npc: "🧑‍💻", title: "작업실 · 만든 것들", say: "AI랑 같이 뚝딱뚝딱 만드는 중이에요!" },
  { id: "broadcast", x: 315, y: 375, icon: "📺", label: "방송국", npc: "🎙️", title: "하리 방송국 · 채널 & 근황", say: "지금 방송 중! 요즘 하리 소식이에요." },
  { id: "mailbox", x: 205, y: 480, icon: "📮", label: "우체통", npc: "✉️", title: "우체통 · 방명록", say: "하리에게 편지 한 장 남겨 주실래요?" },
  { id: "timeline", x: 100, y: 590, icon: "🪧", label: "추억의 길", npc: "🕰️", title: "추억의 길 · 인생 타임라인", say: "한국에서 오클랜드까지, 걸어온 길이에요." },
  { id: "camp", x: 295, y: 610, icon: "⛺", label: "캠핑장", npc: "🔥", title: "캠핑장 · 취미 생활", say: "모닥불 앞에서 취미 얘기 해요~" },
];

/** 하리폰(빠른 보기)에서 보여줄 순서 */
export const quickViewOrder: LocationId[] = ["home", "wish", "museum", "airport", "workshop", "broadcast", "timeline", "camp", "mailbox"];

export const isLocationId = (v: string): v is LocationId => locations.some((l) => l.id === v);
export const getLocation = (id: LocationId): Location => locations.find((l) => l.id === id)!;

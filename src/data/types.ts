/**
 * 하리섬의 모든 콘텐츠 타입.
 * 새 성취가 생기면 data/ 폴더의 파일에 한 줄만 추가하면 돼요.
 * 잘못된 값을 넣으면 TypeScript가 빌드 단계에서 알려줘요.
 */

export type LocationId =
  | "home"
  | "wish"
  | "museum"
  | "airport"
  | "workshop"
  | "broadcast"
  | "mailbox"
  | "timeline"
  | "camp";

export interface Location {
  id: LocationId;
  /** 섬 좌표 (viewBox 400 × 760 기준) */
  x: number;
  y: number;
  icon: string;
  label: string;
  /** 시트 상단에 나오는 NPC 이모지 */
  npc: string;
  title: string;
  /** NPC가 타자기 효과로 말하는 한 줄 */
  say: string;
}

export interface Profile {
  name: string;
  tagline: string;
  about: string[];
  likes: string[];
  languages: { flag: string; name: string; level: string }[];
  funFacts: string[];
  lifeIWant: string;
}

export interface MuseumItem {
  icon: string;
  title: string;
  date: string;
  desc: string;
}

export interface Country {
  flag: string;
  name: string;
  note?: string;
  /** 도장 색 */
  color: string;
  /** 도장 기울기 (deg) — 손으로 찍은 느낌 */
  tilt: number;
}

export interface Trip {
  icon: string;
  title: string;
  where: string;
  desc: string;
  /** 생략하면 "언제였더라?"로 표시 */
  year?: string;
}

export type ProductStatus = "live" | "dev";

export interface Product {
  icon: string;
  name: string;
  desc: string;
  status: ProductStatus;
  url?: string;
}

export interface Channel {
  icon: string;
  name: string;
  kind: string;
  desc: string;
  url?: string;
}

export interface Hobby {
  icon: string;
  name: string;
  desc: string;
}

export interface TimelineItem {
  icon: string;
  title: string;
  desc: string;
  /** 생략하면 "언제?"로 표시. 연도 자체를 숨기려면 hideYear */
  year?: string;
  hideYear?: boolean;
}

export interface BucketItem {
  title: string;
  done: boolean;
  /** 날짜, 장소 등 한 줄 메모 */
  note?: string;
  /** true면 출시 제품 수로 진행률을 자동 계산 */
  trackProducts?: boolean;
}

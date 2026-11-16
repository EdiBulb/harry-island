import type { BucketItem } from "./types";

export const bucket: BucketItem[] = [
  { title: "IELTS 7.0 받기", done: true, note: "2026.11" },
  { title: "풀마라톤 출전하기", done: true, note: "2026 퀸스타운" },
  { title: "시베리아 횡단열차 타기", done: true },
  { title: "해외 봉사하기", done: true, note: "네팔" },
  { title: "외국에서 살아보기", done: true, note: "뉴질랜드" },
  { title: "해외에서 석사 학위 받기", done: true, note: "2025 뉴질랜드" },
  { title: "개발자로 취업하기", done: true, note: "인턴 → 2026.09 엔지니어" },
  { title: "풀마라톤 완주하기", done: false, note: "다음 대회 준비 중" },
  { title: "AI로 제품 100개 출시하기", done: false, trackProducts: true },
  { title: "뉴질랜드 섬 투어", done: false },
  { title: "텐트 들고 장거리 트레킹", done: false },
  { title: "ESP32로 RC카 만들기", done: false },
];

export const bucketDone = bucket.filter((b) => b.done).length;

import type { MuseumItem } from "./types";

/** 새 자격증·메달·학위를 얻으면 맨 위에 추가하세요. */
export const museum: MuseumItem[] = [
  { icon: "🏅", title: "퀸스타운 마라톤 메달", date: "2026", desc: "생애 첫 풀마라톤 도전!" },
  { icon: "📜", title: "IELTS General 7.0", date: "2026.11", desc: "오클랜드 시티에서 컴퓨터 시험으로 취득." },
  {
    icon: "🎓",
    title: "소프트웨어 엔지니어링 석사",
    date: "2025",
    desc: "Master of Software Engineering. 워홀 → 어학원 → 뉴질랜드에서 석사 졸업.",
  },
];

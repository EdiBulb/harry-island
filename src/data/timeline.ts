import type { TimelineItem } from "./types";

/** 오래된 순서. year를 생략하면 "언제?"로 표시돼요. */
export const timeline: TimelineItem[] = [
  { icon: "🇰🇷", title: "한국에서 태어남", desc: "모든 이야기의 시작.", hideYear: true },
  { icon: "🎓", title: "대학교 입학 · 락밴드 드러머", desc: "락밴드에서 드럼을 치며 보낸 대학 생활." },
  { icon: "🤝", title: "네팔 해외 봉사", desc: "처음 만난 히말라야." },
  { icon: "🚂", title: "시베리아 횡단열차", desc: "입대 전, 유라시아를 기차로 가로지르다." },
  { icon: "🎺", title: "군악대 트롬본 연주자", desc: "군 생활을 트롬본과 함께." },
  { icon: "🇨🇳", title: "중국 선양 유학", desc: "복학 후 중국어 공부." },
  { icon: "🎓", title: "대학교 졸업", desc: "다음 모험을 향해." },
  { year: "2023.01", icon: "🥝", title: "뉴질랜드 워홀", desc: "졸업 후 새로운 나라에서의 시작." },
  { year: "2024", icon: "🏫", title: "어학원", desc: "워홀이 끝나고, 영어를 제대로 다시." },
  { year: "2024.07", icon: "📚", title: "소프트웨어 엔지니어링 석사 과정", desc: "워홀이 삶이 되다. 다시 학생으로, 이번엔 개발자를 향해!" },
  { year: "2025", icon: "🎓", title: "석사 졸업", desc: "Master of Software Engineering 취득." },
  { year: "2026 초", icon: "🧑‍💻", title: "첫 소프트웨어 인턴", desc: "처음으로 개발자로 일해 본 순간." },
  { year: "2026.09", icon: "💼", title: "소프트웨어 엔지니어", desc: "개발자로 새 출발." },
  { year: "2026.11", icon: "📜", title: "IELTS 7.0", desc: "영어 실력 레벨업." },
];

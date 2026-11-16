import type { Country, Trip } from "./types";

export const countries: Country[] = [
  { flag: "🇳🇿", name: "뉴질랜드", note: "워홀 → 지금 사는 곳", color: "#1f8a5a", tilt: -5 },
  { flag: "🇳🇵", name: "네팔", note: "해외 봉사", color: "#3b62c4", tilt: 4 },
  { flag: "🇨🇳", name: "중국", note: "선양 중국어 유학", color: "#d9452b", tilt: -3 },
  { flag: "🇷🇺", name: "러시아", note: "시베리아 횡단열차", color: "#6a4fc9", tilt: 7 },
  { flag: "🇯🇵", name: "일본", color: "#e0566b", tilt: -6 },
  { flag: "🇹🇭", name: "태국", color: "#2f6fb5", tilt: 5 },
  { flag: "🇱🇦", name: "라오스", color: "#c23a4b", tilt: -4 },
  { flag: "🇵🇭", name: "필리핀", color: "#d99a00", tilt: 6 },
  { flag: "🇲🇾", name: "말레이시아", color: "#1d5fa8", tilt: -7 },
  { flag: "🇦🇺", name: "호주", color: "#2c8c8c", tilt: 3 },
];

export const trips: Trip[] = [
  { icon: "🚂", title: "시베리아 횡단열차", where: "러시아", desc: "끝없는 설원을 달리는 기차 여행." },
  { icon: "🏔", title: "네팔 해외 봉사", where: "네팔", desc: "히말라야의 나라에서 보낸 봉사의 시간." },
  { icon: "🥟", title: "선양 중국어 유학", where: "중국 선양", desc: "군 전역 후 중국어를 배우러 떠난 곳." },
  {
    icon: "🥝",
    title: "뉴질랜드 워홀",
    where: "뉴질랜드",
    desc: "워홀 → 어학원 → 석사 → 개발자. 4년째 살고 있어요.",
    year: "2023.01",
  },
];

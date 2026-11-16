import type { Product } from "./types";

export const PRODUCT_GOAL = 100;
export const BRAND_URL = "https://abracadelulu.com";

export const products: Product[] = [
  { icon: "🍳", name: "Cookable", desc: "냉장고 재료로 레시피 추천 + 자동 장바구니", status: "live", url: "https://edibulb.github.io/cookable/" },
  { icon: "🕳️", name: "블랙홀", desc: "손가락으로 블랙홀을 움직여 별과 행성을 삼키는 미니게임", status: "live", url: "https://edibulb.github.io/blackhole/" },
  { icon: "🌅", name: "오늘의 해", desc: "병아리가 지리산에서 해를 보며 자라는 3D 웹", status: "dev", url: "https://hae.abracadelulu.com" },
  { icon: "🤥", name: "라이어 게임 바보모드", desc: "친구들과 하는 모바일 라이어 게임", status: "dev" },
  { icon: "🍓", name: "할리갈리 모바일", desc: "각자 폰이 카드 더미가 되는 할리갈리", status: "dev" },
  { icon: "🍽️", name: "TablEAT", desc: "뉴질랜드 레스토랑 예약 웹앱 (3인 팀 프로젝트)", status: "dev" },
  { icon: "🐦", name: "Seekabird", desc: "뉴질랜드 새를 찍어서 모으는 도감 앱", status: "dev" },
];

export const liveCount = products.filter((p) => p.status === "live").length;

import type { Product } from "./types";

export const PRODUCT_GOAL = 100;
export const BRAND_URL = "https://abracadelulu.com";

export const products: Product[] = [
  { icon: "🪄", name: "Abracadelulu", desc: "100개 제품을 모아 두는 나만의 주문서", status: "live", url: "https://abracadelulu.com" },
  { icon: "🐦", name: "Seekabird", desc: "뉴질랜드 새를 찍으면 AI가 이름을 알려주는 도감 앱", status: "live", url: "https://seekabird.abracadelulu.com" },
  { icon: "🍓", name: "Fruit Five", desc: "각자 폰이 카드 더미가 되는 과일 카드 게임 (할리갈리 스타일)", status: "live", url: "https://fruitfive.abracadelulu.com" },
  { icon: "🌅", name: "오늘의 해", desc: "오늘의 진짜 일출을 3D 해변에서 다 같이 보는 웹", status: "live", url: "https://hae.abracadelulu.com" },
  { icon: "🍳", name: "Cookable", desc: "냉장고 재료로 레시피 추천 + 자동 장바구니", status: "live", url: "https://cookable.abracadelulu.com" },
  { icon: "🕳️", name: "블랙홀", desc: "손가락으로 블랙홀을 움직여 우주를 삼키는 미니게임", status: "live", url: "https://blackhole.abracadelulu.com" },
  { icon: "🏝", name: "하리섬", desc: "지금 보고 계신 바로 이 섬!", status: "live" },
  { icon: "🤥", name: "라이어 게임 바보모드", desc: "친구들과 하는 모바일 라이어 게임", status: "dev" },
  { icon: "🍽️", name: "TablEAT", desc: "뉴질랜드 레스토랑 예약 웹앱 (3인 팀 프로젝트)", status: "dev" },
];

export const liveCount = products.filter((p) => p.status === "live").length;

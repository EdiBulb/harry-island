import { forwardRef, memo } from "react";

/** 섬 모양 — 걸을 수 있는 영역 판정에도 같은 path를 써요 */
const ISLAND_D =
  "M200 70 C300 60 365 120 360 230 C356 320 380 400 365 500 C350 610 300 700 200 705 C100 708 45 640 38 530 C30 430 25 340 40 240 C55 130 100 78 200 70 Z";

const TREES: [number, number][] = [
  [60, 260], [340, 270], [150, 230], [255, 255], [45, 450], [355, 430], [130, 470], [150, 650], [250, 670],
  [60, 500], [345, 540], [175, 110], [240, 105], [330, 120], [80, 120], [200, 610], [120, 300], [285, 300],
];
const TREE_COLORS = ["#3fae5a", "#4cbc63", "#37a050"];
const FLOWER_COLORS = ["#ff8fa3", "#fff", "#ffd84d", "#b38cff"];
const FLOWERS = Array.from({ length: 46 }, (_, i) => ({ x: 60 + ((i * 97) % 280), y: 110 + ((i * 151) % 560), c: FLOWER_COLORS[i % 4] }));
const WAVES = ["M20 30", "M330 40", "M10 380", "M355 640", "M30 725", "M300 735", "M372 300"];

/** 정적인 섬 배경. grassRef로 섬 path를 넘겨 걸을 수 있는지 판정해요. */
export const IslandMap = memo(
  forwardRef<SVGPathElement>(function IslandMap(_props, grassRef) {
    return (
      <svg className="map" viewBox="0 0 400 760" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="grassTex" width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill="#8fd16a" />
            <path d="M5 8 l2 -4 l2 4 M15 18 l2 -4 l2 4" stroke="#7cc45a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </pattern>
        </defs>

        <rect width="400" height="760" fill="#5ec8d8" />
        <g stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" fill="none" strokeLinecap="round">
          {WAVES.map((m) => (
            <path key={m} className="wave" d={`${m} q8 -6 16 0 t16 0`} />
          ))}
        </g>

        {/* 얕은 물 → 모래사장 → 잔디 */}
        <path d={ISLAND_D} fill="none" stroke="#9fe3e6" strokeWidth="64" strokeLinejoin="round" />
        <path d={ISLAND_D} fill="none" stroke="#f6e3b4" strokeWidth="34" strokeLinejoin="round" />
        <path ref={grassRef} d={ISLAND_D} fill="url(#grassTex)" />

        {/* 흙길 */}
        <g stroke="#ead2a0" strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".95">
          <path d="M200 345 L200 150" />
          <path d="M200 260 C160 240 120 200 95 170" />
          <path d="M200 260 C240 240 280 210 305 190" />
          <path d="M200 345 C160 360 120 365 90 370" />
          <path d="M200 345 C240 360 280 365 312 370" />
          <path d="M200 345 L205 470 C170 520 130 550 100 575" />
          <path d="M205 470 C240 520 270 560 295 595" />
        </g>

        {/* 연못 */}
        <ellipse cx="300" cy="475" rx="34" ry="20" fill="#7fd6e4" stroke="#bff0f2" strokeWidth="4" />
        <ellipse cx="292" cy="471" rx="9" ry="3" fill="#fff" opacity=".6" />

        {TREES.map(([x, y], i) => (
          <g key={`t${i}`}>
            <ellipse cx={x} cy={y + 2} rx="12" ry="4" fill="rgba(0,0,0,.12)" />
            <rect x={x - 2.5} y={y - 8} width="5" height="10" rx="2" fill="#a8743f" />
            <circle cx={x} cy={y - 16} r="13" fill={TREE_COLORS[i % 3]} />
            <circle cx={x - 4} cy={y - 20} r="4" fill="#fff" opacity=".18" />
            {i % 4 === 0 && (
              <>
                <circle cx={x - 5} cy={y - 18} r="2.6" fill="#ff7a59" />
                <circle cx={x + 6} cy={y - 13} r="2.6" fill="#ff7a59" />
              </>
            )}
          </g>
        ))}

        {FLOWERS.map((f, i) => (
          <g key={`f${i}`}>
            <circle cx={f.x} cy={f.y} r="2.6" fill={f.c} />
            <circle cx={f.x} cy={f.y} r="1" fill="#ffb000" />
          </g>
        ))}
      </svg>
    );
  }),
);

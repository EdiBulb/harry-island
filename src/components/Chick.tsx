import { forwardRef } from "react";

interface Props {
  walking: boolean;
  facingLeft: boolean;
}

/** 달걀 껍데기를 쓴 병아리 하리 (인스타툰 캐릭터) */
export const Chick = forwardRef<HTMLDivElement, Props>(function Chick({ walking, facingLeft }, ref) {
  const cls = ["chick", walking && "walk", facingLeft && "left"].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} aria-hidden="true">
      <svg viewBox="0 0 60 66">
        <ellipse cx="30" cy="61" rx="15" ry="3.5" fill="rgba(0,0,0,.18)" />
        <g className="body">
          <path d="M24 57 l-2 4 M36 57 l2 4" stroke="#ff9f1c" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="30" cy="40" rx="19" ry="18" fill="#ffd84d" stroke="#e8a800" strokeWidth="2" />
          <ellipse cx="13" cy="43" rx="4.5" ry="7.5" fill="#ffc93c" stroke="#e8a800" strokeWidth="1.5" />
          <ellipse cx="47" cy="43" rx="4.5" ry="7.5" fill="#ffc93c" stroke="#e8a800" strokeWidth="1.5" />
          <circle cx="23.5" cy="38" r="2.6" fill="#3a2a1a" />
          <circle cx="24.4" cy="37.1" r=".8" fill="#fff" />
          <circle cx="36.5" cy="38" r="2.6" fill="#3a2a1a" />
          <circle cx="37.4" cy="37.1" r=".8" fill="#fff" />
          <ellipse cx="19" cy="44" rx="3" ry="2" fill="#ff8fa3" opacity=".7" />
          <ellipse cx="41" cy="44" rx="3" ry="2" fill="#ff8fa3" opacity=".7" />
          <path d="M27 42.5 L33 42.5 L30 46.5 Z" fill="#ff9f1c" />
          <path
            d="M11 31 Q11 5 30 5 Q49 5 49 31 L44.5 26 L40 32 L35 26 L30 32 L25 26 L20 32 L15.5 26 Z"
            fill="#fffaf0"
            stroke="#d9cbb0"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <ellipse cx="22" cy="14" rx="4" ry="2" fill="#fff" opacity=".9" transform="rotate(-25 22 14)" />
        </g>
      </svg>
    </div>
  );
});

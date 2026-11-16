import { useState } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

const LINES = [
  "어서 오세요! 하리섬에 오신 걸 환영해요 🐣",
  "저는 이 섬의 주민, 하리예요. 이 섬에는 제가 걸어온 길과 모아 온 것들이 있어요.",
  "건물을 탭하면 제가 직접 걸어가서 안내해 드릴게요. 빈 땅을 탭하면 산책도 할 수 있어요!",
  "바쁘시다면 오른쪽 아래 📱 하리폰으로 한눈에 볼 수 있어요. 그럼, 즐거운 구경 되세요!",
];

/** 첫 방문 인사. 탭하면 대사를 넘기고, 타이핑 중이면 끝까지 보여줘요. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const { shown, done, skip } = useTypewriter(LINES[idx], 32);

  const next = () => {
    if (!done) return skip();
    if (idx + 1 >= LINES.length) return onDone();
    setIdx(idx + 1);
  };

  return (
    <div className="intro" role="dialog" aria-label="하리섬 안내">
      <button
        type="button"
        className="dialog"
        onClick={next}
        style={{ border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
      >
        <div className="nm">하리</div>
        <div className="tx">{shown}</div>
        <div className="nx" aria-hidden="true">▼</div>
        <span className="visually-hidden">다음 ({idx + 1}/{LINES.length})</span>
      </button>
    </div>
  );
}

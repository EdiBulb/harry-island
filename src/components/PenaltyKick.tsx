import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createPenaltyKick, type KeeperMode, type PenaltyKickHandle } from "../game/penaltyKick";

type Phase =
  | { kind: "play" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

interface Props {
  name: string;
  stamp: string;
  /** 골이 들어가면 호출 — 실제 편지 등록. 실패하면 GuestbookError를 던져요 */
  onGoal: () => Promise<void>;
  /** 등록까지 끝나고 닫힐 때 */
  onDone: () => void;
  /** 그냥 닫기 (쓰던 편지는 그대로 남아 있어요) */
  onClose: () => void;
}

/** 놓친 횟수에 따라 키퍼가 점점 느슨해져요 — 편지가 영영 못 들어가는 일은 없게 */
const modeFor = (misses: number): KeeperMode => (misses === 0 ? "normal" : misses === 1 ? "sleepy" : "break");

const MISS_TALK = [
  "",
  "하리: 헤헤, 이번엔 막았지롱! 한 번 더? 🐣",
  "하리: 아이고 목말라… 잠깐 물 마시고 올게요 💧 (지금이 기회!)",
];

export function PenaltyKick({ name, stamp, onGoal, onDone, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PenaltyKickHandle | null>(null);
  const kbRef = useRef<HTMLButtonElement>(null);
  const [misses, setMisses] = useState(0);
  const [talk, setTalk] = useState("하리: 내 골문을 뚫어야 편지를 받아 줄 거예요! 🧤");
  const [phase, setPhase] = useState<Phase>({ kind: "play" });

  // 최신 콜백을 ref로 들고 있어서, 게임 엔진은 한 번만 만들어요
  const onGoalRef = useRef(onGoal);
  const onDoneRef = useRef(onDone);
  onGoalRef.current = onGoal;
  onDoneRef.current = onDone;
  const missesRef = useRef(0);

  const deliver = useCallback(async () => {
    setPhase({ kind: "sending" });
    try {
      await onGoalRef.current();
      setPhase({ kind: "sent" });
      setTimeout(() => onDoneRef.current(), 1700);
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "앗, 전송에 실패했어요." });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createPenaltyKick(
      canvas,
      { stamp, keeperMode: "normal" },
      {
        onGoal: () => {
          setTalk("하리: 으앗… 졌다! 편지 잘 받을게요 💛");
          void deliver();
        },
        onMiss: () => {
          const m = Math.min(2, missesRef.current + 1);
          missesRef.current = m;
          setMisses(m);
          setTalk(MISS_TALK[m]);
          game.setKeeperMode(modeFor(m));
          setTimeout(() => game.reset(), 1500);
        },
      },
    );
    gameRef.current = game;
    kbRef.current?.focus({ preventScroll: true });
    return () => {
      game.destroy();
      gameRef.current = null;
    };
    // 엔진은 열릴 때 한 번만 만들어요 (stamp도 그때 값으로 충분)
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase.kind !== "sending") onClose();
      if ((e.key === "Enter" || e.key === " ") && phase.kind === "play") {
        e.preventDefault(); // 포커스가 어디 있든 Enter = 자동 슛
        gameRef.current?.autoShoot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase.kind]);

  const status =
    phase.kind === "sending" ? "편지 배달 중… ✉️"
    : phase.kind === "sent" ? "편지가 도착했어요! 고마워요 💛"
    : phase.kind === "error" ? phase.message
    : misses >= 2 ? "골문이 비었어요! 지금 차요 ⚽"
    : "아래로 당겨서 조준 · 놓으면 슛! 세게 당길수록 높이 떠요";

  // 시트(.sheet)가 transform을 쓰고 있어서 position:fixed가 갇혀요 → body로 포털
  return createPortal(
    <div className="pk" role="dialog" aria-modal="true" aria-labelledby="pk-title">
      <div className="pk-top">
        <div style={{ minWidth: 0 }}>
          <h2 id="pk-title">⚽ 편지 승부차기</h2>
          <div className="pk-talk" aria-live="polite">{talk}</div>
        </div>
        <button type="button" className="close" aria-label="닫기 (쓰던 편지는 그대로 남아요)" onClick={onClose} disabled={phase.kind === "sending"}>
          ✕
        </button>
      </div>

      <canvas ref={canvasRef} className="pk-canvas" aria-label={`${name}님의 ${stamp} 편지를 차서 골키퍼 하리를 뚫는 미니게임`} />

      <div className="pk-bottom">
        <div className={`pk-status${phase.kind === "error" ? " err" : phase.kind === "sent" ? " ok" : ""}`} aria-live="assertive">
          {status}
        </div>
        {phase.kind === "error" ? (
          <div className="pk-actions">
            <button type="button" className="btn" onClick={() => void deliver()}>다시 보내기</button>
            <button type="button" className="pk-link" onClick={onClose}>닫기</button>
          </div>
        ) : (
          phase.kind === "play" && (
            <button ref={kbRef} type="button" className="pk-link" onClick={() => gameRef.current?.autoShoot()} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}>
              ⌨️ 키보드로 차기 (Enter)
            </button>
          )
        )}
      </div>
    </div>,
    document.body,
  );
}

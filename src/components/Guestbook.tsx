import { useEffect, useState, type FormEvent } from "react";
import {
  checkLetter,
  clearDraftMessage,
  fetchLetters,
  loadDraft,
  saveDraft,
  GuestbookError,
  isGuestbookEnabled,
  LIMITS,
  postLetter,
  STAMPS,
  type Letter,
  type Stamp,
} from "../lib/guestbook";
import { PenaltyKick } from "./PenaltyKick";

type LoadState = { kind: "loading" } | { kind: "ready"; letters: Letter[] } | { kind: "error"; message: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });

export function Guestbook() {
  const enabled = isGuestbookEnabled();
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [draft] = useState(loadDraft); // 쓰다 만 편지가 있으면 이어서
  const [name, setName] = useState(draft.name ?? "");
  const [message, setMessage] = useState(draft.message ?? "");
  const [stamp, setStamp] = useState<Stamp>(draft.stamp ?? "🐣");
  const [honeypot, setHoneypot] = useState(""); // 봇만 채우는 숨겨진 칸
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("");

  // 한 글자씩 쓸 때마다 임시 저장 — 승부차기에서 져도 편지는 그대로
  useEffect(() => {
    saveDraft({ name, message, stamp });
  }, [name, message, stamp]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchLetters()
      .then((letters) => !cancelled && setLoad({ kind: "ready", letters }))
      .catch((e: unknown) => !cancelled && setLoad({ kind: "error", message: e instanceof GuestbookError ? e.message : "편지함을 열 수 없어요." }));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // 1) 보내기 → 먼저 검사하고 2) 승부차기 시작 3) 골이 들어가면 그때 진짜 등록
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // 봇이면 조용히 무시
    try {
      checkLetter({ name, message, stamp });
    } catch (err) {
      setStatus(err instanceof GuestbookError ? err.message : "앗, 편지를 확인해 주세요.");
      return;
    }
    setStatus("");
    setPlaying(true);
  };

  const deliver = async () => {
    const letter = await postLetter({ name, message, stamp }); // 실패하면 GuestbookError → 게임 화면에서 "다시 보내기"
    setLoad((prev) => ({ kind: "ready", letters: [letter, ...(prev.kind === "ready" ? prev.letters : [])] }));
  };

  const finish = () => {
    setPlaying(false);
    setMessage("");
    clearDraftMessage({ name, message, stamp });
    setStatus("편지가 도착했어요! 고마워요 💛");
  };

  const closeGame = () => {
    setPlaying(false);
    if (message.trim()) setStatus("편지는 그대로 남아 있어요. 다시 도전해 볼까요? ⚽");
  };

  return (
    <>
      <div className="sec">
        <form className="gb-form" onSubmit={onSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={LIMITS.name}
            placeholder="이름 (닉네임도 좋아요)"
            aria-label="이름"
            required
            disabled={!enabled}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={LIMITS.message}
            rows={3}
            placeholder="하리에게 한마디!"
            aria-label="편지 내용"
            required
            disabled={!enabled}
          />
          <input
            className="honeypot"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
          <div className="gb-stamps" role="radiogroup" aria-label="우표 고르기">
            {STAMPS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stamp === s}
                className={stamp === s ? "on" : undefined}
                onClick={() => setStamp(s)}
                disabled={!enabled}
              >
                {s}
              </button>
            ))}
          </div>
          <button className="btn" type="submit" disabled={!enabled || playing}>
            편지 차서 보내기 ⚽
          </button>
          <div style={{ fontSize: 12, color: "#b39465", marginTop: -2 }}>골키퍼 하리를 뚫어야 편지가 도착해요!</div>
          <div style={{ fontSize: 12.5, color: "#b39465" }} aria-live="polite">
            {enabled ? status : "방명록은 곧 열려요! 조금만 기다려 주세요 🐣"}
          </div>
        </form>
      </div>

      <div className="sec">
        <h3>📬 받은 편지</h3>
        {!enabled ? (
          <p className="note">아직 우체통이 설치되는 중이에요.</p>
        ) : load.kind === "loading" ? (
          <p className="note">편지함을 여는 중…</p>
        ) : load.kind === "error" ? (
          <p className="note">{load.message}</p>
        ) : load.letters.length === 0 ? (
          <p className="note">아직 편지가 없어요. 첫 번째 편지의 주인공이 되어 주세요! 🐣</p>
        ) : (
          load.letters.map((l) => (
            <div className="letter" key={l.id}>
              <span style={{ fontSize: 20 }}>{l.stamp}</span> <span className="who">{l.name}</span>
              <span className="when">{formatDate(l.created_at)}</span>
              <div className="msg">{l.message}</div>
            </div>
          ))
        )}
      </div>

      {playing && (
        <PenaltyKick name={name.trim()} stamp={stamp} onGoal={deliver} onDone={finish} onClose={closeGame} />
      )}
    </>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import {
  fetchLetters,
  GuestbookError,
  isGuestbookEnabled,
  LIMITS,
  postLetter,
  STAMPS,
  type Letter,
  type Stamp,
} from "../lib/guestbook";

type LoadState = { kind: "loading" } | { kind: "ready"; letters: Letter[] } | { kind: "error"; message: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });

export function Guestbook() {
  const enabled = isGuestbookEnabled();
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [stamp, setStamp] = useState<Stamp>("🐣");
  const [honeypot, setHoneypot] = useState(""); // 봇만 채우는 숨겨진 칸
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // 봇이면 조용히 무시
    setSending(true);
    setStatus("보내는 중…");
    try {
      const letter = await postLetter({ name, message, stamp });
      // 새 편지를 목록 맨 위에 바로 보여주기
      setLoad((prev) => ({ kind: "ready", letters: [letter, ...(prev.kind === "ready" ? prev.letters : [])] }));
      setMessage("");
      setStatus("편지가 도착했어요! 고마워요 💛");
    } catch (err) {
      setStatus(err instanceof GuestbookError ? err.message : "앗, 전송에 실패했어요.");
    } finally {
      setSending(false);
    }
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
          <button className="btn" type="submit" disabled={!enabled || sending}>
            편지 보내기 ✉️
          </button>
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
    </>
  );
}

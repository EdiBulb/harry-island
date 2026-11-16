import { useEffect, useRef, type ReactNode } from "react";
import { useTypewriter } from "../hooks/useTypewriter";
import type { Location } from "../data/types";

interface Props {
  location: Location | null;
  onClose: () => void;
  children: ReactNode;
}

/** 아래에서 올라오는 건물 안내 시트 */
export function Sheet({ location, onClose, children }: Props) {
  const open = location !== null;
  const { shown, done, skip } = useTypewriter(location?.say ?? "");
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
  }, [open, location?.id]);

  return (
    <>
      <div className={`backdrop${open ? " on" : ""}`} onClick={onClose} />
      <section
        className={`sheet${open ? " on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="sheet-title"
      >
        {location && (
          <>
            <header>
              <div className="npc" aria-hidden="true">{location.npc}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="sheet-title">{location.title}</h2>
                <div className="say" onClick={done ? undefined : skip}>
                  {shown}
                  <span className="visually-hidden">{location.say}</span>
                </div>
              </div>
              <button ref={closeRef} type="button" className="close" aria-label="닫기" onClick={onClose}>
                ✕
              </button>
            </header>
            <div className="body" ref={bodyRef}>
              {children}
            </div>
          </>
        )}
      </section>
    </>
  );
}

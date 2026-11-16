import { useRef } from "react";
import { getLocation, quickViewOrder } from "../data/locations";
import { Section } from "../sections";

/** 📱 하리폰 — 게임 없이 모든 내용을 한 번에 보는 빠른 보기 */
export function PhoneView({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const jump = (id: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`#p-${id}`);
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
  };

  return (
    <div className="phone on" role="dialog" aria-modal="true" aria-label="하리폰 한눈에 보기">
      <div className="top">
        <h2>📱 하리폰 · 한눈에 보기</h2>
        <button type="button" className="close" aria-label="닫기" onClick={onClose}>
          ✕
        </button>
      </div>
      <nav className="apps">
        {quickViewOrder.map((id) => {
          const l = getLocation(id);
          return (
            <button key={id} type="button" onClick={() => jump(id)}>
              {l.icon}
              <small>{l.label}</small>
            </button>
          );
        })}
      </nav>
      <div className="scroll" ref={scrollRef}>
        {quickViewOrder.map((id) => {
          const l = getLocation(id);
          return (
            <section className="block" id={`p-${id}`} key={id}>
              <h2>
                {l.npc} {l.title}
              </h2>
              <Section id={id} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

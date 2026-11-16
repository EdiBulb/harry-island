import { countries } from "../data/travel";
import { liveCount, PRODUCT_GOAL } from "../data/products";
import { museum } from "../data/museum";
import { bucket, bucketDone } from "../data/bucket";
import type { LocationId } from "../data/types";

interface Props {
  onGo: (id: LocationId) => void;
  clock: { label: string; night: boolean };
}

export function Hud({ onGo, clock }: Props) {
  const chips: { emoji: string; label: string; value: string | number; id: LocationId }[] = [
    { emoji: "🌏", label: "다녀온 나라", value: countries.length, id: "airport" },
    { emoji: "🚀", label: "출시", value: `${liveCount}/${PRODUCT_GOAL}`, id: "workshop" },
    { emoji: "🏅", label: "수집품", value: museum.length, id: "museum" },
    { emoji: "⭐", label: "버킷리스트", value: `${bucketDone}/${bucket.length}`, id: "wish" },
  ];

  return (
    <>
      <header className="hud">
        <h1 className="title">🏝 하리섬</h1>
        <div className="clock">
          {clock.night ? "🌙" : "☀️"} 오클랜드 {clock.label}
        </div>
      </header>
      <nav className="stats" aria-label="하리섬 요약">
        {chips.map((c) => (
          <button key={c.id} type="button" className="chip" onClick={() => onGo(c.id)}>
            {c.emoji} {c.label} <b>{c.value}</b>
          </button>
        ))}
      </nav>
    </>
  );
}

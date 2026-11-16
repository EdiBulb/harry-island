import { WORLD_H, WORLD_W } from "../hooks/usePlayerMovement";
import type { Location } from "../data/types";

interface Props {
  location: Location;
  near: boolean;
  onSelect: (id: Location["id"]) => void;
}

export function Building({ location: l, near, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`bld${near ? " near" : ""}`}
      style={{ left: `${(l.x / WORLD_W) * 100}%`, top: `${(l.y / WORLD_H) * 100}%` }}
      aria-label={l.title}
      onClick={(e) => {
        e.stopPropagation(); // 섬 바닥 클릭(산책)으로 번지지 않게
        onSelect(l.id);
      }}
    >
      <span className="hint">탭해서 들어가기</span>
      <span className="ico">{l.icon}</span>
      <span className="sign">{l.label}</span>
    </button>
  );
}

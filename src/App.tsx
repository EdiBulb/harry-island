import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { IslandMap } from "./components/IslandMap";
import { Chick } from "./components/Chick";
import { Building } from "./components/Building";
import { Hud } from "./components/Hud";
import { Sheet } from "./components/Sheet";
import { PhoneView } from "./components/PhoneView";
import { Intro } from "./components/Intro";
import { Section } from "./sections";
import { getLocation, locations } from "./data/locations";
import type { LocationId } from "./data/types";
import { usePlayerMovement, WORLD_H, WORLD_W, type Point } from "./hooks/usePlayerMovement";
import { useAucklandClock } from "./hooks/useAucklandClock";
import { readHash, writeHash } from "./lib/hash";
import { storage } from "./lib/storage";

const VISITED_KEY = "harryIsland.visited";
const DOOR_OFFSET = 26; // 건물 문 앞에 서도록
const NEAR_DISTANCE = 46;
const START: Point = { x: 200, y: 395 };

interface Bubble {
  key: number;
  text: string;
  at: Point;
}
interface TapMark {
  key: number;
  at: Point;
}

const toPct = (p: Point) => ({ left: `${(p.x / WORLD_W) * 100}%`, top: `${(p.y / WORLD_H) * 100}%` });

export default function App() {
  const initialHash = useRef(readHash()).current;
  const [openId, setOpenId] = useState<LocationId | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(() => !initialHash && storage.get(VISITED_KEY) !== "1");
  const [nearId, setNearId] = useState<LocationId | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [tapMarks, setTapMarks] = useState<TapMark[]>([]);
  const clock = useAucklandClock();

  const worldRef = useRef<HTMLDivElement>(null);
  const grassRef = useRef<SVGPathElement>(null);
  const chickRef = useRef<HTMLDivElement>(null);

  // 섬(잔디) 위인지 — SVG path의 isPointInFill 사용, 미지원 브라우저는 사각형으로 대체
  const isWalkable = useCallback((p: Point) => {
    const path = grassRef.current;
    if (path && "isPointInFill" in path) {
      try {
        return path.isPointInFill(new DOMPoint(p.x, p.y));
      } catch {
        /* fall through */
      }
    }
    return p.x > 50 && p.x < 350 && p.y > 90 && p.y < 690;
  }, []);

  const onMove = useCallback((p: Point) => {
    let best: LocationId | null = null;
    let bestDist = NEAR_DISTANCE;
    for (const l of locations) {
      const d = Math.hypot(l.x - p.x, l.y + 20 - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = l.id;
      }
    }
    setNearId(best);
  }, []);

  const sheetOrOverlayOpen = openId !== null || phoneOpen || introOpen;
  const { pos, walking, facingLeft, walkTo, teleport } = usePlayerMovement({
    start: START,
    isWalkable,
    elementRef: chickRef,
    keyboardEnabled: !sheetOrOverlayOpen,
    onMove,
  });

  const say = useCallback(
    (text: string) => setBubble({ key: Date.now(), text, at: { x: pos.current.x, y: pos.current.y - 48 } }),
    [pos],
  );

  useEffect(() => {
    if (!bubble) return;
    const id = window.setTimeout(() => setBubble(null), 1600);
    return () => window.clearTimeout(id);
  }, [bubble]);

  const openSheet = useCallback((id: LocationId) => {
    setOpenId(id);
    writeHash(id);
  }, []);

  const closeSheet = useCallback(() => {
    setOpenId(null);
    writeHash(null);
  }, []);

  /** 건물로 걸어간 뒤 시트 열기 */
  const goTo = useCallback(
    (id: LocationId) => {
      const l = getLocation(id);
      setPhoneOpen(false);
      closeSheet();
      walkTo({ x: l.x, y: l.y + DOOR_OFFSET }, () => openSheet(id));
    },
    [closeSheet, openSheet, walkTo],
  );

  // 공유 링크(#museum 등)로 들어오면 그 건물 앞에서 시작
  useEffect(() => {
    if (initialHash) {
      const l = getLocation(initialHash);
      teleport({ x: l.x, y: l.y + DOOR_OFFSET });
      setOpenId(initialHash);
    } else {
      teleport(START);
    }
    const onHash = () => {
      const id = readHash();
      if (id) goTo(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter/Space로 근처 건물 들어가기, Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, button")) {
        if (e.key !== "Escape") return;
      }
      if (e.key === "Escape") {
        if (phoneOpen) setPhoneOpen(false);
        else closeSheet();
      } else if ((e.key === "Enter" || e.key === " ") && !sheetOrOverlayOpen && nearId) {
        e.preventDefault();
        openSheet(nearId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSheet, nearId, openSheet, phoneOpen, sheetOrOverlayOpen]);

  const onWorldClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = worldRef.current!.getBoundingClientRect();
    const p = { x: ((e.clientX - rect.left) / rect.width) * WORLD_W, y: ((e.clientY - rect.top) / rect.height) * WORLD_H };
    if (!isWalkable(p)) {
      say("앗, 바다엔 못 들어가요! 🌊");
      return;
    }
    const key = Date.now();
    setTapMarks((m) => [...m, { key, at: p }]);
    window.setTimeout(() => setTapMarks((m) => m.filter((t) => t.key !== key)), 650);
    walkTo(p);
  };

  const finishIntro = () => {
    setIntroOpen(false);
    storage.set(VISITED_KEY, "1");
    say("반가워요! 👋");
  };

  return (
    <>
      <Hud onGo={goTo} clock={clock} />

      <main
        className={`world${clock.night ? " night" : ""}`}
        ref={worldRef}
        onClick={onWorldClick}
        aria-label="하리섬 지도. 건물을 눌러 들어가 보세요."
      >
        <IslandMap ref={grassRef} />
        <div className="nightveil" />
        {locations.map((l) => (
          <Building key={l.id} location={l} near={nearId === l.id} onSelect={goTo} />
        ))}
        {tapMarks.map((t) => (
          <div key={t.key} className="tapmark" style={toPct(t.at)} />
        ))}
        <Chick ref={chickRef} walking={walking} facingLeft={facingLeft} />
        {bubble && (
          <div key={bubble.key} className="bubble" style={toPct(bubble.at)}>
            {bubble.text}
          </div>
        )}
      </main>

      <button
        type="button"
        className="phoneBtn"
        onClick={() => {
          closeSheet();
          setPhoneOpen(true);
        }}
      >
        📱 하리폰
      </button>

      <Sheet location={openId ? getLocation(openId) : null} onClose={closeSheet}>
        {openId && <Section id={openId} />}
      </Sheet>

      {phoneOpen && <PhoneView onClose={() => setPhoneOpen(false)} />}
      {introOpen && <Intro onDone={finishIntro} />}
    </>
  );
}

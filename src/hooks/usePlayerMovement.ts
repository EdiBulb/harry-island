import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** 섬 좌표계 — SVG viewBox와 같은 크기 */
export const WORLD_W = 400;
export const WORLD_H = 760;

export interface Point {
  x: number;
  y: number;
}

interface Options {
  start: Point;
  /** 이동 속도 (섬 좌표 / 초) */
  speed?: number;
  /** 이 좌표로 걸어갈 수 있는지 (섬 위인지) */
  isWalkable: (p: Point) => boolean;
  /** 위치를 직접 그릴 캐릭터 요소 */
  elementRef: RefObject<HTMLElement>;
  /** false면 방향키 입력 무시 (시트가 열렸을 때 등) */
  keyboardEnabled: boolean;
  /** 매 프레임 이동 후 호출 — 근처 건물 계산 등에 사용 */
  onMove?: (p: Point) => void;
}

const KEY_DIRS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], a: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0],
  ArrowUp: [0, -1], w: [0, -1],
  ArrowDown: [0, 1], s: [0, 1],
};

const normalizeKey = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

/**
 * 병아리 이동 로직.
 *
 * 위치는 매 프레임 바뀌므로 React state가 아닌 ref에 저장하고,
 * DOM 스타일을 직접 갱신해요. (60fps마다 리렌더링하지 않기 위해)
 * 화면에 영향을 주는 값(걷는 중, 바라보는 방향)만 state로 둬요.
 */
export function usePlayerMovement({ start, speed = 130, isWalkable, elementRef, keyboardEnabled, onMove }: Options) {
  const pos = useRef<Point>({ ...start });
  const target = useRef<Point | null>(null);
  const onArrive = useRef<(() => void) | null>(null);
  const keys = useRef(new Set<string>());
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  // 최신 콜백을 ref로 들고 있어서 rAF 루프를 다시 만들 필요가 없어요.
  const latest = useRef({ isWalkable, onMove, keyboardEnabled });
  latest.current = { isWalkable, onMove, keyboardEnabled };

  const paint = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    el.style.left = `${(pos.current.x / WORLD_W) * 100}%`;
    el.style.top = `${(pos.current.y / WORLD_H) * 100}%`;
  }, [elementRef]);

  const walkTo = useCallback((p: Point, cb?: () => void) => {
    target.current = p;
    onArrive.current = cb ?? null;
  }, []);

  const teleport = useCallback(
    (p: Point) => {
      pos.current = { ...p };
      target.current = null;
      onArrive.current = null;
      paint();
    },
    [paint],
  );

  // 게임 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moved = false;

      // 1) 키보드 입력이 우선
      let kx = 0;
      let ky = 0;
      if (latest.current.keyboardEnabled) {
        keys.current.forEach((k) => {
          const d = KEY_DIRS[k];
          if (d) {
            kx += d[0];
            ky += d[1];
          }
        });
      }

      if (kx || ky) {
        target.current = null;
        onArrive.current = null;
        const len = Math.hypot(kx, ky);
        const next = { x: pos.current.x + (kx / len) * speed * dt, y: pos.current.y + (ky / len) * speed * dt };
        if (latest.current.isWalkable(next)) pos.current = next;
        if (kx) setFacingLeft(kx < 0);
        moved = true;
      } else if (target.current) {
        // 2) 탭한 목적지로 걸어가기
        const dx = target.current.x - pos.current.x;
        const dy = target.current.y - pos.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) {
          pos.current = { ...target.current };
          target.current = null;
          const cb = onArrive.current;
          onArrive.current = null;
          cb?.();
        } else {
          const step = Math.min(dist, speed * dt);
          pos.current = { x: pos.current.x + (dx / dist) * step, y: pos.current.y + (dy / dist) * step };
          if (Math.abs(dx) > 1) setFacingLeft(dx < 0);
          moved = true;
        }
      }

      setWalking(moved); // 값이 같으면 React가 리렌더링을 건너뛰어요
      paint();
      latest.current.onMove?.(pos.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paint, speed]);

  // 키보드 이벤트
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.closest("input, textarea") != null;
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || !latest.current.keyboardEnabled) return;
      const k = normalizeKey(e.key);
      if (KEY_DIRS[k]) {
        keys.current.add(k);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(normalizeKey(e.key));
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  return { pos, walking, facingLeft, walkTo, teleport };
}

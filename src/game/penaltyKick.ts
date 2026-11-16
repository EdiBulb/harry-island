/**
 * 방명록 승부차기 — 편지를 차서 골키퍼 하리를 뚫어야 편지가 등록돼요.
 *
 * React와 분리된 순수 Canvas 엔진이에요. 컴포넌트는 콜백(onGoal / onMiss)만 받고,
 * 게임 상태는 이 안에서 requestAnimationFrame 루프로 돌아요 (매 프레임 리렌더링 없음).
 *
 * 좌표계: 미터 단위의 월드 좌표 (x: 좌우, z: 골대 쪽 거리, h: 높이)를
 * 간단한 원근 투영 P()로 화면에 그려요.
 */

export type KeeperMode = "normal" | "sleepy" | "break";

export interface PenaltyKickOptions {
  /** 편지 봉투에 붙일 우표 이모지 */
  stamp: string;
  keeperMode: KeeperMode;
}

export interface PenaltyKickCallbacks {
  onGoal: () => void;
  onMiss: (reason: string) => void;
}

export interface PenaltyKickHandle {
  /** 키보드/접근성용 — 항상 들어가는 슛 */
  autoShoot: () => void;
  setKeeperMode: (mode: KeeperMode) => void;
  /** 실패 후 다음 시도를 위해 공·선수·키퍼를 제자리로 */
  reset: () => void;
  destroy: () => void;
}

// ---------------------------------------------------------------- constants
const GD = 11; // 페널티 스폿 → 골라인 (m)
const GW = 3.66; // 골대 반폭
const GH = 2.44; // 크로스바 높이
const RB = 0.17; // 편지(공) 반지름
const GRAV = 9.8;
const KZ = GD - 0.45; // 키퍼가 서는 라인
const KICK_RUN = 0.42;
const KICK_SWING = 0.36;
const CONTACT = 0.58;

const C_SKIN = "#f6cfaa";
const C_JERSEY = "#ff9f1c";
const C_SHORTS = "#6b4f2a";
const C_INK = "rgba(107,79,42,.6)";
const FONT = '"Jua", "Gowun Dodum", system-ui, sans-serif';

interface Vec { x: number; y: number }
interface Pop { x: number; y: number; t: number; text: string; color: string; size: number }
type BallState = "idle" | "wait" | "fly" | "net" | "out" | "done";
type PlayerState = "idle" | "run" | "kick" | "hold" | "back";
type KeeperState = "ready" | "react" | "dive" | "down" | "up" | "leave" | "away" | "return";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// 하리(병아리) 모양 — src/components/Chick.tsx 의 SVG 경로를 그대로 재사용
const CHICK_SHELL = new Path2D("M11 31 Q11 5 30 5 Q49 5 49 31 L44.5 26 L40 32 L35 26 L30 32 L25 26 L20 32 L15.5 26 Z");
const CHICK_UNIT = 0.0268; // SVG 1단위 = 0.0268m → 키 약 1.5m

export function createPenaltyKick(
  canvas: HTMLCanvasElement,
  options: PenaltyKickOptions,
  callbacks: PenaltyKickCallbacks,
): PenaltyKickHandle {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D를 쓸 수 없어요");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  let W = 0, H = 0, perf = 0, raf = 0, last = performance.now(), destroyed = false;
  let keeperMode: KeeperMode = options.keeperMode;
  const cam = { zc: 5, camH: 2, cx: 0, f: 1, k0: 1, hy: 0, maxPull: 150 };

  const ball = { x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, a: 0, va: 0, state: "idle" as BallState, alpha: 1, scale: 0, t: 0 };
  const START = { x: -0.75, z: -1.15 }, PLANT = { x: -0.42, z: -0.22 };
  const pl = { x: START.x, z: START.z, state: "idle" as PlayerState, t: 0, phase: 0, from: { x: START.x, z: START.z } };
  const kp = { kx: 0, px: 0, ph: 0.58, phi: 0, d: 0, dir: 1, state: "ready" as KeeperState, t: 0, delay: 0.15,
               th: 1, phMax: 1, alpha: 1, catchUp: 0, sad: 0 };
  let aim: { ox: number; oy: number; dx: number; dy: number } | null = null;
  let pending: { vx: number; vz: number; vh: number } | null = null;
  let forceWrongWay = false;
  let net = { x: 0, h: 1, amt: 0, t: 0 }, frameShake = 0, goalFlash = 0;
  const pops: Pop[] = [];
  const bursts: { x: number; y: number; t: number }[] = [];

  if (keeperMode === "break") { kp.state = "away"; kp.alpha = 0; }

  // ---------------------------------------------------------------- camera
  function P(x: number, z: number, h = 0) {
    const k = cam.f / (z + cam.zc);
    return { x: cam.cx + x * k, y: cam.hy + (cam.camH - h) * k, k };
  }
  function layout() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    if (W < 50 || H < 50) return; // 아직 화면에 안 붙었으면 다음 resize 때
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.cx = W / 2;
    const goalPx = Math.min(W * 0.72, 340);
    cam.f = (goalPx / (2 * GW)) * (GD + cam.zc);
    cam.k0 = cam.f / cam.zc;
    cam.hy = Math.min(H * 0.6, H - 230) - cam.camH * cam.k0;
    const top = P(0, GD, GH).y;
    if (top < 70) cam.hy += 70 - top;
    cam.maxPull = Math.min(170, H * 0.24);
  }

  // ---------------------------------------------------------------- shot model
  function shotFromAim(dx: number, dy: number) {
    const p = clamp(Math.hypot(dx, dy) / cam.maxPull, 0, 1);
    const th = clamp(Math.atan2(-dx, Math.max(dy, 1)), -0.62, 0.62);
    const v = 14 + 17 * p, al = ((5 + 19 * p) * Math.PI) / 180;
    return { vx: v * Math.cos(al) * Math.sin(th), vz: v * Math.cos(al) * Math.cos(th), vh: v * Math.sin(al), p };
  }
  function startKick(shot: { vx: number; vz: number; vh: number }) {
    pending = shot; ball.state = "wait";
    pl.state = "run"; pl.t = 0; pl.from = { x: pl.x, z: pl.z };
  }
  function launch() {
    if (!pending) return;
    const s = pending; pending = null;
    Object.assign(ball, { vx: s.vx, vz: s.vz, vh: s.vh, va: s.vx * 1.5 + (Math.random() - 0.5) * 6, state: "fly", t: 0 });
    const b = P(ball.x, ball.z, ball.h + RB);
    bursts.push({ x: b.x, y: b.y, t: 0 });
    keeperReact();
  }

  // ---------------------------------------------------------------- keeper AI
  function predict() {
    let { x, z, h, vx, vz, vh } = ball, t = 0;
    const dt = 0.005;
    while (z < KZ && t < 3) {
      vh -= GRAV * dt; x += vx * dt; z += vz * dt; h += vh * dt; t += dt;
      if (h < 0) { h = 0; vh = Math.abs(vh) * 0.42; vx *= 0.85; vz *= 0.85; }
      if (vz < 0.3) break;
    }
    return { x, h };
  }
  function keeperReact() {
    if (kp.state === "away" || kp.state === "leave") return;
    const pr = predict();
    const sleepy = keeperMode === "sleepy";
    const wrong = forceWrongWay || Math.random() < (sleepy ? 0.5 : 0.22);
    const need = pr.x - kp.kx;
    kp.th = pr.h; kp.state = "react"; kp.t = 0; kp.d = 0;
    kp.delay = (sleepy ? 0.24 : 0.12) + Math.random() * 0.08;
    if (!wrong && Math.abs(need) < 0.45) kp.dir = 0;
    else { kp.dir = Math.sign(need) || 1; if (wrong) kp.dir *= -1; }
    kp.phMax = (clamp(85 - ((pr.h - 0.3) / 1.8) * 35, 50, 85) * Math.PI) / 180;
  }
  function keeperSegment() {
    const s = Math.sin(kp.phi), c = Math.cos(kp.phi);
    return { a: { x: kp.px - 0.56 * s, h: kp.ph - 0.56 * c }, b: { x: kp.px + 1.13 * s, h: kp.ph + 1.13 * c } };
  }
  function segDist(p: { x: number; h: number }, a: { x: number; h: number }, b: { x: number; h: number }) {
    const vx = b.x - a.x, vh = b.h - a.h, L2 = vx * vx + vh * vh;
    const t = clamp(((p.x - a.x) * vx + (p.h - a.h) * vh) / L2, 0, 1);
    return Math.hypot(p.x - (a.x + vx * t), p.h - (a.h + vh * t));
  }
  function stepKeeper(dt: number) {
    kp.t += dt;
    kp.sad *= Math.pow(0.4, dt);
    switch (kp.state) {
      case "ready": {
        const amp = aim ? 0.55 : 0.95;
        kp.kx += (amp * Math.sin(perf * 1.15) - kp.kx) * Math.min(1, dt * 3);
        kp.px = kp.kx; kp.phi *= Math.pow(0.001, dt); kp.d = 0;
        kp.ph = 0.58 + Math.abs(Math.sin(perf * 6)) * (aim ? 0.05 : 0.02);
        kp.catchUp *= Math.pow(0.01, dt);
        break;
      }
      case "react":
        kp.ph = 0.55;
        if (kp.t > kp.delay) { kp.state = "dive"; kp.t = 0; }
        break;
      case "dive": {
        kp.d = Math.min(1, kp.t / 0.3);
        const e = 1 - Math.pow(1 - kp.d, 2);
        if (kp.dir === 0) { kp.catchUp = e; kp.ph = 0.58 + (kp.th > 1.4 ? 0.3 * e : 0); }
        else {
          kp.px = kp.kx + kp.dir * 0.95 * e;
          kp.ph = 0.58 + (clamp(kp.th * 0.55 + 0.25, 0.45, 1.4) - 0.58) * e;
          kp.phi = kp.dir * kp.phMax * e;
        }
        if (kp.d >= 1 && kp.t > 0.55) { kp.state = "down"; kp.t = 0; }
        break;
      }
      case "down":
        if (kp.dir !== 0) kp.ph += (0.45 - kp.ph) * Math.min(1, dt * 6);
        break;
      case "up":
        kp.phi *= Math.pow(0.0005, dt); kp.ph += (0.58 - kp.ph) * Math.min(1, dt * 8);
        kp.px += (kp.kx - kp.px) * Math.min(1, dt * 8); kp.catchUp *= Math.pow(0.01, dt);
        if (kp.t > 0.45) { kp.state = "ready"; kp.phi = 0; }
        break;
      case "leave":
        kp.alpha = Math.max(0, kp.alpha - dt * 1.8); kp.px += dt * 3.2; kp.phi = 0;
        kp.ph = 0.58 + Math.abs(Math.sin(perf * 9)) * 0.06;
        if (kp.alpha <= 0) kp.state = "away";
        break;
      case "away":
        kp.alpha = 0;
        break;
      case "return":
        kp.alpha = Math.min(1, kp.alpha + dt * 2.5); kp.px += (0 - kp.px) * Math.min(1, dt * 5); kp.kx = kp.px;
        kp.ph = 0.58 + Math.abs(Math.sin(perf * 9)) * 0.05;
        if (kp.alpha >= 1 && Math.abs(kp.px) < 0.05) kp.state = "ready";
        break;
    }
  }

  // ---------------------------------------------------------------- results
  function goal() {
    ball.state = "net"; ball.t = 0;
    net = { x: ball.x, h: ball.h, amt: 1, t: 0 }; goalFlash = 1; kp.sad = 1;
    const g = P(0, GD, GH);
    pops.push({ x: g.x, y: g.y - 26, t: 0, text: "골인! ⚽", color: "#ff9f1c", size: 26 });
    if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
    callbacks.onGoal();
  }
  function miss(why: string) {
    if (ball.state !== "fly") return;
    ball.state = "out"; ball.t = 0;
    const g = P(0, GD, GH);
    pops.push({ x: g.x, y: g.y - 26, t: 0, text: why, color: "#6b4f2a", size: 22 });
    callbacks.onMiss(why);
  }
  function crossGoalPlane(px: number, ph: number) {
    if (Math.abs(px) < GW - RB && ph < GH - RB) return goal();
    const nearPost = Math.abs(Math.abs(px) - GW) < RB + 0.07 && ph < GH + RB;
    const nearBar = Math.abs(ph - GH) < RB + 0.07 && Math.abs(px) < GW + RB;
    if (nearPost || nearBar) {
      ball.z = GD - RB; ball.vz = -Math.abs(ball.vz) * 0.45; if (nearPost) ball.vx -= Math.sign(px) * 2;
      ball.vh = nearBar ? -Math.abs(ball.vh) * 0.3 - 1 : ball.vh * 0.6; ball.va *= -1.5; frameShake = 1;
      return miss(nearBar && !nearPost ? "크로스바! 😵" : "골대 맞았다! 😵");
    }
    miss(ph >= GH ? "너무 높아요!" : "옆으로 빗나갔어요");
  }

  // ---------------------------------------------------------------- simulation
  function stepPlayer(dt: number) {
    pl.t += dt;
    if (pl.state === "run") {
      const u = Math.min(1, pl.t / KICK_RUN), e = ease(u);
      pl.x = pl.from.x + (PLANT.x - pl.from.x) * e; pl.z = pl.from.z + (PLANT.z - pl.from.z) * e;
      pl.phase = u * Math.PI * 3;
      if (u >= 1) { pl.state = "kick"; pl.t = 0; }
    } else if (pl.state === "kick") {
      if (pending && pl.t / KICK_SWING >= CONTACT) launch();
      if (pl.t > KICK_SWING + 0.55) { pl.state = "hold"; pl.t = 0; }
    } else if (pl.state === "back") {
      const u = Math.min(1, pl.t / 0.55), e = ease(u);
      pl.x = pl.from.x + (START.x - pl.from.x) * e; pl.z = pl.from.z + (START.z - pl.from.z) * e;
      pl.phase = u * Math.PI * 2;
      if (u >= 1) { pl.state = "idle"; pl.t = 0; pl.phase = 0; }
    }
  }
  function stepBall(dt: number) {
    if (ball.state === "idle" || ball.state === "wait") { ball.scale += (1 - ball.scale) * Math.min(1, dt * 14); return; }
    ball.t += dt;
    if (ball.state === "fly" || ball.state === "out") {
      const pz = ball.z, px = ball.x, ph = ball.h;
      ball.vh -= GRAV * dt; ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.h += ball.vh * dt; ball.a += ball.va * dt;
      if (ball.h < 0) {
        ball.h = 0; ball.vh = Math.abs(ball.vh) * 0.42; ball.vx *= 0.85; ball.vz *= 0.85; ball.va *= 0.7;
        if (ball.vh < 0.6) { ball.vh = 0; ball.vz *= Math.pow(0.25, dt * 8); ball.vx *= Math.pow(0.25, dt * 8); }
      }
      // 키퍼 하리
      if (ball.state === "fly" && kp.state !== "away" && kp.state !== "leave" && pz < KZ && ball.z >= KZ) {
        const f = (KZ - pz) / (ball.z - pz);
        const cp = { x: px + (ball.x - px) * f, h: ph + (ball.h - ph) * f };
        const seg = keeperSegment();
        if (segDist(cp, seg.a, seg.b) < (kp.dir === 0 ? 0.42 : 0.33) + RB) {
          ball.z = KZ - 0.05; ball.vz = -Math.abs(ball.vz) * 0.3 - 1;
          ball.vx = (cp.x - kp.px) * 2.5 + (Math.random() - 0.5) * 3; ball.vh = Math.abs(ball.vh) * 0.4 + 2.5; ball.va *= -2;
          if (kp.dir === 0) { ball.vz = -2; ball.vx *= 0.3; ball.vh = 1.5; }
          miss(kp.dir === 0 ? "하리가 잡았다! 🧤" : "하리 선방! 🧤");
        }
      }
      if (ball.state === "fly" && pz < GD && ball.z >= GD) {
        const f = (GD - pz) / (ball.z - pz);
        crossGoalPlane(px + (ball.x - px) * f, ph + (ball.h - ph) * f);
      }
      if (ball.state === "fly" && (ball.t > 3 || (Math.hypot(ball.vz, ball.vx) < 0.3 && ball.h === 0))) miss("너무 약해요");
      if (ball.z < -2.5) { ball.z = -2.5; ball.vz = Math.abs(ball.vz) * 0.3; } // 카메라 뒤로 넘어가지 않게
      if (ball.state === "out" && ball.t > 1.1) ball.alpha = Math.max(0, ball.alpha - dt * 4);
    } else if (ball.state === "net") {
      ball.vh -= GRAV * dt;
      ball.vz -= ball.vz * Math.min(1, 9 * dt); ball.vx -= ball.vx * Math.min(1, 5 * dt);
      ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.h += ball.vh * dt; ball.a += ball.va * dt; ball.va *= Math.pow(0.2, dt);
      const back = GD + 1.0 + (1 - Math.min(ball.h, GH) / GH) * 0.5;
      if (ball.z > back) { ball.z = back; ball.vz = -Math.abs(ball.vz) * 0.2; }
      if (ball.h < 0) { ball.h = 0; ball.vh = Math.abs(ball.vh) * 0.35; }
    }
  }

  function reset() {
    Object.assign(ball, { x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, a: 0, va: 0, state: "idle", alpha: 1, scale: 0, t: 0 });
    pending = null; forceWrongWay = false;
    if (pl.state !== "idle") { pl.state = "back"; pl.t = 0; pl.from = { x: pl.x, z: pl.z }; }
    if (keeperMode === "break") {
      if (kp.state !== "away" && kp.state !== "leave") {
        kp.state = "leave"; kp.t = 0; kp.phi = 0;
        const g = P(0, GD, GH);
        pops.push({ x: g.x, y: g.y - 26, t: 0, text: "하리가 물 마시러 갔어요 💧", color: "#3aaec4", size: 17 });
      }
    } else if (kp.state === "away" || kp.state === "leave") { kp.state = "return"; kp.px = -5; kp.alpha = 0; }
    else if (kp.state !== "ready") { kp.state = "up"; kp.t = 0; }
  }

  // ---------------------------------------------------------------- drawing helpers
  function poly(pts: Vec[], fill: string) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function line(a: Vec, b: Vec, w: number, color: string) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.stroke();
  }
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  /** 굵기가 변하는 캡슐 — 팔다리의 기본 도형 */
  function limb(a: Vec, b: Vec, ra: number, rb: number, fill: string, lw: number) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-4, ang = Math.atan2(dy, dx);
    const nx = -dy / L, ny = dx / L;
    ctx.beginPath(); ctx.moveTo(a.x + nx * ra, a.y + ny * ra); ctx.lineTo(b.x + nx * rb, b.y + ny * rb);
    ctx.arc(b.x, b.y, rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
    ctx.lineTo(a.x - nx * ra, a.y - ny * ra);
    ctx.arc(a.x, a.y, ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C_INK; ctx.stroke(); }
  }
  function blob(path: () => void, fill: string, lw: number) {
    ctx.beginPath(); path(); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C_INK; ctx.stroke(); }
  }
  /** 2관절 IK — 무릎 위치 */
  function ik(hip: Vec, foot: Vec, a: number, b: number): Vec {
    let dx = foot.x - hip.x, dy = foot.y - hip.y, d = Math.hypot(dx, dy);
    if (d < 1e-4) { d = 1e-4; dx = 0; dy = 1; }
    const dd = Math.min(d, a + b - 0.001);
    const ux = dx / d, uy = dy / d, along = (a * a - b * b + dd * dd) / (2 * dd), hgt = Math.sqrt(Math.max(0, a * a - along * along));
    const k1 = { x: hip.x + ux * along - uy * hgt, y: hip.y + uy * along + ux * hgt };
    const k2 = { x: hip.x + ux * along + uy * hgt, y: hip.y + uy * along - ux * hgt };
    if (foot.y < hip.y + (a + b) * 0.55) return k1.y > k2.y ? k1 : k2; // 뒤꿈치를 든 자세: 무릎이 아래로
    const out = Math.sign(hip.x) || 1; // 그 외: 무릎은 바깥쪽 (X자 다리 방지)
    return (k1.x - k2.x) * out > 0 ? k1 : k2;
  }
  function keyframes(frames: [number, Vec][], u: number): Vec {
    for (let i = 1; i < frames.length; i++) {
      if (u <= frames[i][0]) {
        const [u0, a] = frames[i - 1], [u1, b] = frames[i];
        return lerp(a, b, ease((u - u0) / (u1 - u0)));
      }
    }
    return frames[frames.length - 1][1];
  }

  // ---------------------------------------------------------------- drawing: island pitch
  function drawPitch() {
    // 하늘 + 바다
    const sky = ctx.createLinearGradient(0, 0, 0, cam.hy);
    sky.addColorStop(0, "#c9f0f2"); sky.addColorStop(1, "#9fe3e6");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, cam.hy + 1);
    poly([P(-60, GD + 7.5), P(60, GD + 7.5), { x: W, y: cam.hy }, { x: 0, y: cam.hy }], "#5ec8d8");
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const z = GD + 9 + i * 4, p = P(-6 + ((i * 7.3 + perf * 0.6) % 12), z), q = P(-4.6 + ((i * 7.3 + perf * 0.6) % 12), z);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    // 모래사장
    poly([P(-60, GD + 5), P(60, GD + 5), P(60, GD + 7.6), P(-60, GD + 7.6)], "#f6e3b4");
    // 잔디 줄무늬
    let i = 0;
    for (let z = -cam.zc + 0.6; z < GD + 5; z += 2.6, i++) {
      const z2 = Math.min(GD + 5, z + 2.6);
      poly([P(-60, z), P(60, z), P(60, z2), P(-60, z2)], i % 2 ? "#86c962" : "#8fd16a");
    }
    // 야자수
    ctx.textAlign = "center";
    for (const [x, z] of [[-6.4, GD + 6.3], [6.9, GD + 6.6]] as const) {
      const p = P(x, z); ctx.font = `${3.2 * p.k}px ${FONT}`; ctx.fillText("🌴", p.x, p.y);
    }
    // 라인
    const lw = (z: number) => 0.07 * P(0, z).k, wc = "rgba(255,255,255,.9)";
    line(P(-16, GD), P(16, GD), lw(GD), wc);
    line(P(-9.16, GD - 5.5), P(9.16, GD - 5.5), lw(GD - 5.5), wc);
    line(P(-9.16, GD - 5.5), P(-9.16, GD), lw(GD), wc);
    line(P(9.16, GD - 5.5), P(9.16, GD), lw(GD), wc);
    const s = P(0, 0);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 0.13 * s.k, 0.045 * s.k, 0, 0, Math.PI * 2); ctx.fillStyle = wc; ctx.fill();
  }

  function netPoint(x: number, h: number) {
    let z = GD + 0.9 + (1 - h / 2.25) * 0.6;
    if (net.amt > 0.01) {
      const d2 = (x - net.x) ** 2 + (h - net.h) ** 2;
      z += net.amt * 0.7 * Math.exp(-d2 / 1.1) * (1 + 0.3 * Math.sin(net.t * 26));
    }
    return P(x, z, h);
  }
  function drawGoalBack() {
    poly([P(-GW, GD, 0), P(GW, GD, 0), P(GW, GD, GH), P(-GW, GD, GH)], `rgba(255,248,231,${0.35 + goalFlash * 0.5})`);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = goalFlash > 0.05 ? `rgba(255,159,28,${0.35 + goalFlash * 0.45})` : "rgba(154,122,79,.45)";
    ctx.beginPath();
    const TOP = 2.25, nx = 16, nh = 6;
    const seg = (a: Vec, b: Vec) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
    for (let i = 0; i <= nx; i++) {
      const x = -GW + (2 * GW * i) / nx;
      for (let j = 0; j < nh; j++) seg(netPoint(x, (TOP * j) / nh), netPoint(x, (TOP * (j + 1)) / nh));
      seg(P(x, GD, GH), netPoint(x, TOP));
    }
    for (let j = 0; j <= nh; j++) {
      const h = (TOP * j) / nh;
      for (let i = 0; i < nx; i++) seg(netPoint(-GW + (2 * GW * i) / nx, h), netPoint(-GW + (2 * GW * (i + 1)) / nx, h));
    }
    for (const sx of [-GW, GW]) {
      for (let j = 0; j <= nh; j++) { const h = (TOP * j) / nh; seg(P(sx, GD, Math.min((h * GH) / TOP, GH)), netPoint(sx, h)); }
    }
    ctx.stroke();
    const t = P(0, GD, GH);
    ctx.textAlign = "center"; ctx.fillStyle = "#6b4f2a"; ctx.font = `15px ${FONT}`;
    ctx.fillText("📮 하리의 골문", t.x, t.y - 12);
  }
  function drawGoalFrame() {
    const sh = frameShake * Math.sin(perf * 70) * 1.5, k = P(0, GD).k, w = 0.13 * k;
    const lp0 = P(-GW, GD, 0), lp1 = P(-GW, GD, GH), rp0 = P(GW, GD, 0), rp1 = P(GW, GD, GH);
    for (const [a, b] of [[lp0, lp1], [rp0, rp1], [lp1, rp1]] as const) {
      line({ x: a.x + sh, y: a.y }, { x: b.x + sh, y: b.y }, w + 2.5, "#a8743f");
      line({ x: a.x + sh, y: a.y }, { x: b.x + sh, y: b.y }, w, "#fffaf0");
    }
  }

  // ---------------------------------------------------------------- drawing: the letter
  function drawLetter() {
    if (ball.alpha <= 0) return;
    const p = P(ball.x, ball.z, ball.h + RB * 1.1), g = P(ball.x, ball.z, 0);
    const s = (ball.scale * p.k) / cam.k0;
    if (!(s > 0)) return;
    ctx.globalAlpha = ball.alpha * clamp(1 - ball.h / 6, 0.2, 1) * 0.3;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, 22 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fillStyle = "#3f6b2f"; ctx.fill();
    ctx.save(); ctx.globalAlpha = ball.alpha;
    ctx.translate(p.x, p.y); ctx.rotate(ball.a); ctx.scale(s, s);
    const w = 46, h = 32;
    ctx.shadowColor = "rgba(107,79,42,.25)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    roundRect(-w / 2, -h / 2, w, h, 4); ctx.fillStyle = "#fffaf0"; ctx.fill();
    ctx.shadowColor = "transparent"; ctx.lineWidth = 1.4; ctx.strokeStyle = "#d9b98a"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2 + 2); ctx.lineTo(0, 3); ctx.lineTo(w / 2 - 2, -h / 2 + 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 3, 4.2, 0, Math.PI * 2); ctx.fillStyle = "#ff8fa3"; ctx.fill(); // 하트 실링 대신 동그란 씰
    ctx.font = `13px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(options.stamp, w / 2 - 9, -h / 2 + 9);
    ctx.textBaseline = "alphabetic";
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- drawing: striker (from behind)
  function drawPlayer() {
    const root = P(pl.x, pl.z), k = root.k, lw = Math.max(1, 0.014 * k);
    const S = (o: Vec): Vec => ({ x: root.x + o.x * k, y: root.y + o.y * k });
    let bob = 0, lean = 0, kickT = -1;
    let footL: Vec = { x: -0.08, y: 0 }, footR: Vec = { x: 0.08, y: 0 };
    let armL = { ao: 0.18, bend: 0.25 }, armR = { ao: 0.18, bend: 0.25 };

    if (pl.state === "run" || pl.state === "back") {
      const s = Math.sin(pl.phase);
      footL = { x: -0.08, y: -Math.max(0, s) * 0.17 }; footR = { x: 0.08, y: -Math.max(0, -s) * 0.17 }; bob = Math.abs(s) * 0.03;
      armL = { ao: 0.25 + s * 0.35, bend: 0.9 }; armR = { ao: 0.25 - s * 0.35, bend: 0.9 };
    } else if (pl.state === "kick" || pl.state === "hold") {
      kickT = pl.state === "kick" ? Math.min(1, pl.t / KICK_SWING) : 1;
      const b = P(0, 0, RB * 0.55), ballOff = { x: (b.x - root.x) / k - 0.06, y: (b.y - root.y) / k + 0.01 };
      footL = { x: -0.07, y: 0 };
      const thru = { x: 0.38, y: -0.34 };
      footR = keyframes([[0, { x: 0.08, y: 0 }], [0.42, { x: 0.04, y: -0.3 }], [CONTACT, ballOff], [0.8, thru], [1, thru]], kickT);
      lean = Math.sin((Math.min(1, kickT * 1.3) * Math.PI) / 2) * 0.05;
      const up = Math.sin((Math.min(1, kickT * 1.5) * Math.PI) / 2);
      armL = { ao: 0.25 + up * 1.15, bend: 0.35 }; armR = { ao: 0.3 + up * 0.25, bend: 0.7 };
    } else bob = Math.sin(perf * 2.4) * 0.006;

    const hipY = -0.5 - bob, hipC = { x: lean * 0.4, y: hipY };
    const hipL = { x: hipC.x - 0.075, y: hipY + 0.02 }, hipR = { x: hipC.x + 0.075, y: hipY + 0.02 };
    const shY = -0.86 - bob, shX = lean, TH = 0.245, SH = 0.245;

    ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.ellipse(root.x, root.y, 0.28 * k, 0.06 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3f6b2f"; ctx.fill(); ctx.globalAlpha = 1;

    const leg = (hipM: Vec, footM: Vec) => {
      const hip = S(hipM), foot = S(footM), knee = S(ik(hipM, footM, TH, SH));
      limb(hip, knee, 0.068 * k, 0.056 * k, C_SKIN, lw);
      limb(knee, foot, 0.056 * k, 0.042 * k, "#ffffff", lw);
      limb(lerp(knee, foot, 0.16), lerp(knee, foot, 0.3), 0.052 * k, 0.05 * k, C_JERSEY, 0);
      limb(knee, lerp(knee, foot, 0.1), 0.053 * k, 0.052 * k, C_SKIN, 0);
      const ang = Math.atan2(foot.y - knee.y, foot.x - knee.x) - Math.PI / 2;
      ctx.save(); ctx.translate(foot.x, foot.y); ctx.rotate(ang);
      roundRect(-0.062 * k, -0.02 * k, 0.124 * k, 0.085 * k, 0.035 * k); ctx.fillStyle = "#5a3d22"; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = C_INK; ctx.stroke();
      if (footM.y < -0.12) {
        ctx.beginPath(); ctx.ellipse(0, 0.045 * k, 0.05 * k, 0.028 * k, 0, 0, Math.PI * 2); ctx.fillStyle = "#efe3c8"; ctx.fill();
        ctx.fillStyle = "#9a7a4f";
        for (const x of [-0.022, 0, 0.022]) { ctx.beginPath(); ctx.arc(x * k, 0.047 * k, 0.007 * k, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    };
    const arm = (side: number, pose: { ao: number; bend: number }) => {
      const sp = S({ x: shX + side * 0.175, y: shY + 0.06 }), ua = 0.2, fa = 0.19;
      const e = { x: sp.x + side * Math.sin(pose.ao) * ua * k, y: sp.y + Math.cos(pose.ao) * ua * k };
      const a2 = pose.ao + pose.bend * (pose.ao > 1 ? -0.5 : 1);
      const h = { x: e.x + side * Math.sin(a2) * fa * k, y: e.y + Math.cos(a2) * fa * k };
      limb(e, h, 0.04 * k, 0.036 * k, C_SKIN, lw);
      ctx.beginPath(); ctx.arc(h.x, h.y, 0.045 * k, 0, 7); ctx.fillStyle = C_SKIN; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C_INK; ctx.stroke();
      limb(sp, lerp(sp, e, 0.62), 0.058 * k, 0.05 * k, C_JERSEY, lw);
      limb(lerp(sp, e, 0.64), e, 0.043 * k, 0.041 * k, C_SKIN, 0);
    };

    const heelUpR = footR.y < -0.16 && kickT >= 0 && kickT < CONTACT;
    leg(hipL, footL); if (!heelUpR) leg(hipR, footR);
    blob(() => {
      const a = S({ x: hipC.x - 0.165, y: hipY - 0.06 }), b = S({ x: hipC.x + 0.165, y: hipY - 0.06 });
      const c = S({ x: hipC.x + 0.185, y: hipY + 0.13 }), d = S({ x: hipC.x + 0.015, y: hipY + 0.13 });
      const m = S({ x: hipC.x, y: hipY + 0.07 }), e = S({ x: hipC.x - 0.015, y: hipY + 0.13 }), f = S({ x: hipC.x - 0.185, y: hipY + 0.13 });
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.quadraticCurveTo(m.x, m.y - 0.02 * k, e.x, e.y); ctx.lineTo(f.x, f.y);
    }, C_SHORTS, lw);
    arm(-1, armL); arm(1, armR);
    blob(() => {
      const p = (x: number, y: number) => {
        const t = (y - shY) / (hipY - shY);
        return S({ x: x + shX * (1 - t) + hipC.x * t, y });
      };
      const l1 = p(-0.2, shY + 0.08), l0 = p(-0.11, shY - 0.015), r0 = p(0.11, shY - 0.015), r1 = p(0.2, shY + 0.08);
      const r2 = p(0.165, hipY - 0.02), r3 = p(0.12, hipY + 0.02), l3 = p(-0.12, hipY + 0.02), l2 = p(-0.165, hipY - 0.02);
      ctx.moveTo(l1.x, l1.y); ctx.quadraticCurveTo(p(-0.2, shY).x, p(-0.2, shY).y, l0.x, l0.y); ctx.lineTo(r0.x, r0.y);
      ctx.quadraticCurveTo(p(0.2, shY).x, p(0.2, shY).y, r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
      ctx.quadraticCurveTo(p(0.165, hipY + 0.02).x, p(0.165, hipY + 0.02).y, r3.x, r3.y); ctx.lineTo(l3.x, l3.y);
      ctx.quadraticCurveTo(p(-0.165, hipY + 0.02).x, p(-0.165, hipY + 0.02).y, l2.x, l2.y);
    }, C_JERSEY, lw);
    const mid = S({ x: (shX + hipC.x) / 2, y: (shY + hipY) / 2 }), nk = S({ x: shX, y: shY });
    ctx.beginPath(); ctx.ellipse(nk.x, nk.y, 0.075 * k, 0.028 * k, 0, 0, Math.PI * 2); ctx.fillStyle = "#fffaf0"; ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.textAlign = "center";
    ctx.font = `${0.06 * k}px ${FONT}`; ctx.fillText("VISITOR", mid.x, mid.y - 0.055 * k);
    ctx.font = `${0.16 * k}px ${FONT}`; ctx.fillText("7", mid.x, mid.y + 0.1 * k);
    if (heelUpR) leg(hipR, footR);

    const hc = S({ x: shX * 1.15, y: shY - 0.17 }), r = 0.165 * k;
    limb(S({ x: shX, y: shY + 0.01 }), { x: hc.x, y: hc.y + r * 0.7 }, 0.05 * k, 0.05 * k, C_SKIN, lw);
    ctx.fillStyle = C_SKIN; ctx.lineWidth = lw; ctx.strokeStyle = C_INK;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(hc.x + sx * r * 0.97, hc.y + r * 0.12, r * 0.22, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hc.x, hc.y, r, 0, 7); ctx.fill(); ctx.stroke();
    blob(() => {
      ctx.arc(hc.x, hc.y, r * 1.03, Math.PI * 0.66, Math.PI * 2.34);
      ctx.quadraticCurveTo(hc.x + r * 0.38, hc.y + r * 0.9, hc.x + r * 0.16, hc.y + r * 0.84);
      ctx.lineTo(hc.x + r * 0.06, hc.y + r * 0.93); ctx.lineTo(hc.x - r * 0.06, hc.y + r * 0.84);
      ctx.lineTo(hc.x - r * 0.16, hc.y + r * 0.93); ctx.quadraticCurveTo(hc.x - r * 0.38, hc.y + r * 0.9, hc.x - r * 0.5, hc.y + r * 0.88);
    }, "#7a4b2a", lw);
    blob(() => {
      ctx.moveTo(hc.x - r * 0.3, hc.y - r * 0.95); ctx.quadraticCurveTo(hc.x - r * 0.05, hc.y - r * 1.45, hc.x + r * 0.25, hc.y - r * 1.2);
      ctx.quadraticCurveTo(hc.x + r * 0.1, hc.y - r * 1.02, hc.x + r * 0.15, hc.y - r * 0.9);
    }, "#7a4b2a", 0);
    ctx.beginPath(); ctx.ellipse(hc.x - r * 0.35, hc.y - r * 0.45, r * 0.28, r * 0.12, -0.5, 0, 7); ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fill();
  }

  // ---------------------------------------------------------------- drawing: keeper Harry (the chick)
  function drawKeeper() {
    if (kp.alpha <= 0.01) return;
    const pel = P(kp.px, KZ, kp.ph), g = P(kp.px, KZ, 0), k = pel.k;
    ctx.save();
    ctx.globalAlpha = kp.alpha * 0.22;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, (0.45 + Math.abs(Math.sin(kp.phi)) * 0.7) * k, 0.07 * k, 0, 0, 7); ctx.fillStyle = "#3f6b2f"; ctx.fill();
    ctx.globalAlpha = kp.alpha;
    // SVG 좌표(Chick.tsx와 같은 60×66 박스)로 그리기: 몸통 중심 (30,40)이 골반 위치
    const u = CHICK_UNIT * k;
    ctx.translate(pel.x, pel.y); ctx.rotate(kp.phi); ctx.scale(u, u); ctx.translate(-30, -40);
    const d = kp.dir === 0 ? 0 : kp.d, cu = kp.catchUp, t = Math.max(d, cu);
    const diving = kp.state === "dive" || kp.state === "react" || kp.state === "down";
    const lw = 1.6;
    const gloveAt = (s: number): Vec => {
      const ready = { x: 30 + s * 23, y: 50 }, dive = { x: 30 + s * 5, y: -3 }, ctch = { x: 30 + s * 8, y: 46 };
      const tg = kp.dir === 0 ? ctch : dive;
      return { x: ready.x + (tg.x - ready.x) * t, y: ready.y + (tg.y - ready.y) * t };
    };
    const wing = (s: number) => {
      const sh = { x: 30 + s * 16, y: 40 }, gl = gloveAt(s);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y);
      const L = Math.hypot(gl.x - sh.x, gl.y - sh.y) || 1, nx = -(gl.y - sh.y) / L, ny = (gl.x - sh.x) / L;
      ctx.moveTo(sh.x + nx * 5, sh.y + ny * 5); ctx.lineTo(gl.x + nx * 3.4, gl.y + ny * 3.4);
      ctx.lineTo(gl.x - nx * 3.4, gl.y - ny * 3.4); ctx.lineTo(sh.x - nx * 5, sh.y - ny * 5); ctx.closePath();
      ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = "#e8a800"; ctx.stroke();
      ctx.beginPath(); ctx.arc(gl.x, gl.y, 5.2, 0, 7); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.strokeStyle = "#d9cbb0"; ctx.stroke();
      ctx.beginPath(); ctx.arc(gl.x, gl.y, 5.2, Math.PI * 0.2, Math.PI * 0.8); ctx.fillStyle = "#ff9f1c"; ctx.fill();
      ctx.restore();
    };
    // 발
    ctx.lineCap = "round"; ctx.lineWidth = 2.4; ctx.strokeStyle = "#ff9f1c";
    ctx.beginPath(); ctx.moveTo(24, 57); ctx.lineTo(22, 61); ctx.moveTo(36, 57); ctx.lineTo(38, 61); ctx.stroke();
    if (kp.dir !== 0) { wing(-1); wing(1); }
    // 몸통
    ctx.beginPath(); ctx.ellipse(30, 40, 19, 18, 0, 0, 7); ctx.fillStyle = "#ffd84d"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#e8a800"; ctx.stroke();
    // 키퍼 조끼 번호
    ctx.fillStyle = "rgba(76,184,106,.9)"; ctx.font = `9px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("1", 30, 55);
    // 얼굴
    if (diving && kp.dir !== 0) {
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(21, 36); ctx.lineTo(25.5, 38); ctx.lineTo(21, 40); ctx.moveTo(39, 36); ctx.lineTo(34.5, 38); ctx.lineTo(39, 40); ctx.stroke();
    } else if (kp.sad > 0.3) {
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(23.5, 39.5, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(36.5, 39.5, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = "#7fd3ea"; ctx.beginPath(); ctx.ellipse(20.5, 43, 1.3, 2, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath(); ctx.arc(23.5, 38, 2.6, 0, 7); ctx.arc(36.5, 38, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(24.4, 37.1, 0.8, 0, 7); ctx.arc(37.4, 37.1, 0.8, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,143,163,.7)";
    ctx.beginPath(); ctx.ellipse(19, 44, 3, 2, 0, 0, 7); ctx.ellipse(41, 44, 3, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff9f1c"; ctx.beginPath(); ctx.moveTo(27, 42.5); ctx.lineTo(33, 42.5); ctx.lineTo(30, 46.5); ctx.closePath(); ctx.fill();
    // 달걀 껍데기 모자
    ctx.fillStyle = "#fffaf0"; ctx.fill(CHICK_SHELL); ctx.lineWidth = 1.8; ctx.strokeStyle = "#d9cbb0"; ctx.lineJoin = "round"; ctx.stroke(CHICK_SHELL);
    ctx.save(); ctx.translate(22, 14); ctx.rotate(-0.44); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill(); ctx.restore();
    if (kp.dir === 0) { wing(-1); wing(1); } // 정면 캐치: 장갑이 몸 앞으로
    ctx.restore();
  }

  // ---------------------------------------------------------------- drawing: aim + effects
  function drawAim() {
    if (!aim || aim.dy < 10) return;
    const s = shotFromAim(aim.dx, aim.dy);
    let x = 0, z = 0, h = 0, vh = s.vh;
    const dt = 0.018;
    for (let i = 1; i < 80 && z < GD * 0.58; i++) {
      vh -= GRAV * dt; x += s.vx * dt; z += s.vz * dt; h += vh * dt; if (h < 0) { h = 0; vh = Math.abs(vh) * 0.42; }
      if (i % 2) continue;
      const p = P(x, z, h + RB), f = 1 - z / (GD * 0.58);
      ctx.beginPath(); ctx.arc(p.x, p.y, (1.3 + 2.2 * f) * (p.k / cam.k0) * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + f * 0.7})`; ctx.fill();
    }
    const g = P(0, 0), pw = 50, x0 = g.x - pw / 2, y0 = g.y + 16;
    roundRect(x0, y0, pw, 5, 3); ctx.fillStyle = "rgba(107,79,42,.2)"; ctx.fill();
    roundRect(x0, y0, pw * s.p, 5, 3); ctx.fillStyle = s.p > 0.62 ? "#e5484d" : "#ff9f1c"; ctx.fill();
  }
  function drawEffects(dt: number) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += dt;
      const a = p.t < 0.12 ? p.t / 0.12 : Math.max(0, 1 - (p.t - 1.1) / 0.5);
      const sc = p.t < 0.18 ? 0.6 + (p.t / 0.18) * 0.5 : 1.1 - Math.min(0.1, p.t - 0.18);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y - p.t * 12); ctx.scale(sc, sc);
      ctx.font = `${p.size}px ${FONT}`; ctx.textAlign = "center";
      ctx.lineWidth = 5; ctx.strokeStyle = "#fffaf0"; ctx.lineJoin = "round"; ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0); ctx.restore();
      if (p.t > 1.6) pops.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t += dt;
      const r = 8 + b.t * 90, a = Math.max(0, 1 - b.t / 0.25);
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`; ctx.lineWidth = 2; ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const an = -Math.PI / 2 + (j - 2.5) * 0.45;
        ctx.moveTo(b.x + Math.cos(an) * r * 0.6, b.y + Math.sin(an) * r * 0.6); ctx.lineTo(b.x + Math.cos(an) * r, b.y + Math.sin(an) * r);
      }
      ctx.stroke(); if (b.t > 0.25) bursts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- loop
  function frame(now: number) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; perf += dt;
    for (let i = 0; i < 4; i++) { stepPlayer(dt / 4); stepBall(dt / 4); stepKeeper(dt / 4); }
    net.t += dt; net.amt *= Math.pow(0.05, dt); frameShake *= Math.pow(0.01, dt); goalFlash *= Math.pow(0.15, dt);
    if (W < 50 || H < 50) { raf = requestAnimationFrame(frame); return; }
    ctx.clearRect(0, 0, W, H);
    drawPitch(); drawGoalBack();
    if (ball.z > GD) drawLetter();
    drawGoalFrame();
    if (ball.z > KZ && ball.z <= GD) drawLetter();
    drawKeeper();
    if (ball.z <= KZ) {
      if (ball.z > pl.z) { drawLetter(); drawAim(); drawPlayer(); } else { drawPlayer(); drawLetter(); drawAim(); }
    } else { drawAim(); drawPlayer(); }
    drawEffects(dt);
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- input
  const canAim = () => ball.state === "idle" && pl.state === "idle" && ["ready", "away", "leave", "return"].includes(kp.state);
  const pt = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: PointerEvent) => {
    const p = pt(e);
    if (!canAim() || p.y < P(0, GD).y + 20) return;
    canvas.setPointerCapture(e.pointerId);
    aim = { ox: p.x, oy: p.y, dx: 0, dy: 0 };
  };
  const onMove = (e: PointerEvent) => {
    if (!aim) return;
    const p = pt(e);
    let dx = p.x - aim.ox, dy = p.y - aim.oy;
    const d = Math.hypot(dx, dy);
    if (d > cam.maxPull) { dx *= cam.maxPull / d; dy *= cam.maxPull / d; }
    aim.dx = dx; aim.dy = dy; ball.a = -dx * 0.002;
  };
  const onUp = () => {
    if (!aim) return;
    const { dx, dy } = aim; aim = null; ball.a = 0;
    if (dy < 12 || Math.hypot(dx, dy) < 18) return; // 아래로 당겨야 슛
    startKick(shotFromAim(dx, dy));
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();
  raf = requestAnimationFrame(frame);

  return {
    autoShoot() {
      if (!canAim()) return;
      // 키퍼 반대쪽 구석으로, 키퍼는 반대 방향으로 몸을 날려요 → 항상 골
      const side = kp.kx > 0 ? -1 : 1, th = Math.atan(2.5 / GD) * side, v = 20.8, al = (12.6 * Math.PI) / 180;
      forceWrongWay = true;
      startKick({ vx: v * Math.cos(al) * Math.sin(th), vz: v * Math.cos(al) * Math.cos(th), vh: v * Math.sin(al) });
    },
    setKeeperMode(mode) { keeperMode = mode; },
    reset,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    },
  };
}

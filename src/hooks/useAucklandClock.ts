import { useEffect, useState } from "react";

const TZ = "Pacific/Auckland";

function read() {
  const now = new Date();
  const label = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now));
  return { label, night: hour < 6 || hour >= 19 };
}

/** 오클랜드 현지 시각 — 저녁 7시~새벽 6시는 섬이 밤이 돼요 */
export function useAucklandClock() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => setState(read()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return state;
}

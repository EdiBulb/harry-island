import { useCallback, useEffect, useMemo, useState } from "react";

/** 동물의 숲 대사처럼 한 글자씩 나타나는 텍스트 */
export function useTypewriter(text: string, msPerChar = 30) {
  // 이모지처럼 두 칸짜리 문자가 깨지지 않게 code point 단위로 나눠요
  const chars = useMemo(() => Array.from(text), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (chars.length === 0) return;
    const id = window.setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        if (next >= chars.length) window.clearInterval(id);
        return Math.min(next, chars.length);
      });
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [chars, msPerChar]);

  const skip = useCallback(() => setCount(chars.length), [chars]);
  return { shown: chars.slice(0, count).join(""), done: count >= chars.length, skip };
}

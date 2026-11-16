/** localStorage는 사생활 보호 모드 등에서 예외를 던질 수 있어서 감싸 둬요. */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 저장 못 해도 기능엔 지장 없음 */
    }
  },
};

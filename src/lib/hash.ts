import { isLocationId } from "../data/locations";
import type { LocationId } from "../data/types";

/** #museum 처럼 건물 하나를 바로 여는 공유 링크 */
export const readHash = (): LocationId | null => {
  const h = window.location.hash.slice(1);
  return isLocationId(h) ? h : null;
};

export const writeHash = (id: LocationId | null) => {
  const url = id ? `#${id}` : window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
};

import type { ReactNode } from "react";

/** 외부 링크 — 없으면 "링크 준비 중" */
export function ExtLink({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <span style={{ color: "#c7ad7e" }}>링크 준비 중</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  );
}

export function Sec({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="sec">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}

export function Row({ icon, title, children }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="row">
      {icon !== undefined && <div className="em">{icon}</div>}
      <div className="tx">
        {title && <b>{title}</b>}
        {children && <span>{children}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

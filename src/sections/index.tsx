import type { LocationId, ProductStatus } from "../data/types";
import { profile } from "../data/profile";
import { museum } from "../data/museum";
import { countries, trips } from "../data/travel";
import { BRAND_URL, liveCount, PRODUCT_GOAL, products } from "../data/products";
import { channels, news } from "../data/media";
import { hobbies } from "../data/hobbies";
import { timeline } from "../data/timeline";
import { bucket, bucketDone } from "../data/bucket";
import { Guestbook } from "../components/Guestbook";
import { ExtLink, ProgressBar, Row, Sec } from "./ui";

function Home() {
  return (
    <>
      <Sec title={`👋 ${profile.name}`}>
        <p style={{ fontFamily: "Jua", color: "#d97a00" }}>{profile.tagline}</p>
        {profile.about.map((a) => (
          <p key={a}>{a}</p>
        ))}
      </Sec>
      <Sec title="💛 좋아하는 것">
        <div className="tags">
          {profile.likes.map((l) => (
            <span className="tag" key={l}>{l}</span>
          ))}
        </div>
      </Sec>
      <Sec title="🗣 할 줄 아는 말">
        {profile.languages.map((l) => (
          <Row key={l.name} icon={l.flag} title={l.name}>{l.level}</Row>
        ))}
      </Sec>
      <Sec title="✨ TMI">
        <div className="tags">
          {profile.funFacts.map((f) => (
            <span className="tag" key={f}>{f}</span>
          ))}
        </div>
      </Sec>
      <Sec title="🌱 이런 삶을 살고 싶어요">
        <div className="card">
          <p style={{ margin: 0 }}>{profile.lifeIWant}</p>
        </div>
      </Sec>
    </>
  );
}

function Museum() {
  return (
    <>
      <Sec title={`🏛 전시실 · ${museum.length}점`}>
        <div className="grid">
          {museum.map((m) => (
            <div className="card" key={m.title}>
              <div className="big">{m.icon}</div>
              <div className="t">{m.title}</div>
              <div className="d">{m.date} · {m.desc}</div>
            </div>
          ))}
        </div>
      </Sec>
      <p className="note">자격증, 메달, 학위… 새로 얻을 때마다 하나씩 전시돼요.</p>
    </>
  );
}

function Airport() {
  return (
    <>
      <Sec title={`🛂 여권 도장 · ${countries.length}개국`}>
        <div className="stamps">
          {countries.map((c) => (
            <div className="stamp" key={c.name} style={{ color: c.color, ["--r" as string]: `${c.tilt}deg` }}>
              <div className="f">{c.flag}</div>
              {c.name}
              {c.note && <span style={{ fontSize: 10, opacity: 0.8 }}>{c.note}</span>}
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="🧳 여행 일지">
        {trips.map((t) => (
          <Row key={t.title} icon={t.icon} title={t.title}>
            {t.where} · {t.year ?? "언제였더라?"}
            <br />
            {t.desc}
          </Row>
        ))}
      </Sec>
      <p className="note">📷 여행 사진은 다음 업데이트에서 각 카드에 붙일 예정이에요.</p>
    </>
  );
}

const STATUS_LABEL: Record<ProductStatus, [string, string]> = {
  live: ["b-live", "출시"],
  dev: ["b-dev", "만드는 중"],
};

function Workshop() {
  return (
    <>
      <Sec title={`🚀 AI로 제품 ${PRODUCT_GOAL}개 출시 프로젝트`}>
        <ProgressBar value={liveCount} max={PRODUCT_GOAL} />
        <div style={{ fontSize: 13, color: "#9a7a4f" }}>
          {liveCount} / {PRODUCT_GOAL} 출시 · 브랜드 <ExtLink href={BRAND_URL}>Abracadelulu</ExtLink>
        </div>
      </Sec>
      <Sec>
        <div className="grid">
          {products.map((p) => {
            const [cls, label] = STATUS_LABEL[p.status];
            return (
              <div className="card" key={p.name}>
                <div className="big">{p.icon}</div>
                <div className="t">{p.name}</div>
                <div className="d">{p.desc}</div>
                <span className={`badge ${cls}`}>{label}</span>
                {p.url && (
                  <div className="d" style={{ marginTop: 6 }}>
                    <ExtLink href={p.url}>구경하기</ExtLink>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Sec>
    </>
  );
}

function Broadcast() {
  return (
    <>
      <Sec title="📡 하리의 채널">
        {channels.map((c) => (
          <Row key={c.name} icon={c.icon} title={c.name}>
            {c.kind} · {c.desc}
            <br />
            <ExtLink href={c.url}>보러 가기</ExtLink>
          </Row>
        ))}
      </Sec>
      <Sec title="📰 요즘의 하리">
        {news.map((n) => (
          <Row key={n}>
            <span style={{ color: "#6b4f2a", fontSize: 14 }}>{n}</span>
          </Row>
        ))}
      </Sec>
    </>
  );
}

function Wish() {
  // 달성한 것을 위로
  const sorted = [...bucket].sort((a, b) => Number(b.done) - Number(a.done));
  return (
    <>
      <Sec title={`⭐ ${bucketDone}개 달성 / ${bucket.length}개`}>
        <ProgressBar value={bucketDone} max={bucket.length} />
      </Sec>
      <Sec>
        {sorted.map((b) => {
          const note = b.trackProducts ? `${liveCount}/${PRODUCT_GOAL} 출시` : b.note;
          return (
            <div className="row" key={b.title}>
              <div className={`check${b.done ? " on" : ""}`} aria-label={b.done ? "달성" : "진행 중"}>
                {b.done ? "✓" : ""}
              </div>
              <div className="tx">
                <b className={b.done ? "done-t" : undefined}>{b.title}</b>
                {note && <span>{note}</span>}
              </div>
            </div>
          );
        })}
      </Sec>
    </>
  );
}

function Timeline() {
  return (
    <div className="sec tl">
      {timeline.map((i) => (
        <div className="it" key={i.title}>
          {!i.hideYear && <div className={`yr${i.year ? "" : " q"}`}>{i.year ?? "언제?"}</div>}
          <div className="jua" style={{ fontSize: 16 }}>
            {i.icon} {i.title}
          </div>
          <div style={{ fontSize: 13.5, color: "#9a7a4f" }}>{i.desc}</div>
        </div>
      ))}
    </div>
  );
}

function Camp() {
  return (
    <>
      <Sec>
        <div className="grid">
          {hobbies.map((h) => (
            <div className="card" key={h.name}>
              <div className="big">{h.icon}</div>
              <div className="t">{h.name}</div>
              <div className="d">{h.desc}</div>
            </div>
          ))}
        </div>
      </Sec>
      <p className="note">🏃 러닝 기록 그래프와 캠핑장 지도는 다음 업데이트에 추가할 자리예요.</p>
    </>
  );
}

const SECTIONS: Record<LocationId, () => JSX.Element> = {
  home: Home,
  wish: Wish,
  museum: Museum,
  airport: Airport,
  workshop: Workshop,
  broadcast: Broadcast,
  timeline: Timeline,
  camp: Camp,
  mailbox: Guestbook,
};

export function Section({ id }: { id: LocationId }) {
  const Comp = SECTIONS[id];
  return <Comp />;
}

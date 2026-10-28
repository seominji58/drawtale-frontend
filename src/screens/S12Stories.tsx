import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useLibrary } from "@/store/library";
import { useSession } from "@/store/session";
import { useAuth } from "@/store/auth";
import { useGuardianMode } from "@/store/settings";
import type { Story } from "@/types/story";

/** 책 천 · 책등 색. 네 단계 크레파스 색을 차분하게 (시안 「책장 3 다듬기」) */
const CLOTH: [string, string][] = [["#8DB5E3", "#5E8FC9"], ["#9CCBAE", "#6FA884"], ["#EFA898", "#D27A68"], ["#F2CF7E", "#D9A94A"]];
/** 색종이 인덱스 탭 색 (시안 G) */
const TAB = ["#F2C14E", "#9CCBAE", "#EFA898", "#8DB5E3"];

/** 이야기마다 늘 같은 모양이 나오게 id 로 정하는 작은 수 */
function seed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** 한 책의 생김새. 크기에 뜻이 있다 (2026-10-28 사용자 「추천 1번」):
 *  긴 이야기(여러 쪽 그림책, `book` 있음)는 크고 두꺼운 책, 짧은 이야기(네 문장)는 작고 얇은 책.
 *  같은 종류 안에서는 이야기 id 로 높이를 ±2% 만 다르게 하고 살짝 기울여 늘 같은 모양이 나오게 한다.
 *  색종이 탭도 긴 이야기는 2~3장, 짧은 이야기는 1~2장 */
function look(st: Story, i: number) {
  const h = seed(st.storyId);
  const long = !!st.book;
  const [cloth, spine] = CLOTH[i % CLOTH.length];
  const tabs = Array.from({ length: (long ? 2 : 1) + (h % 2) }, (_, k) => ({
    top: 18 + ((h >> (k * 3)) % 14) + k * 24,        // 위에서 % — 겹치지 않게 아래로 벌린다
    w: 24 + ((h >> (k * 2 + 1)) % 9),
    color: TAB[(h + k) % TAB.length],
    rot: (((h >> (k + 4)) % 5) - 2) * 0.8,
  }));
  const jitter = (((h >> 5) % 5) - 2) / 100;           // -0.02 ~ 0.02
  return {
    long,
    style: {
      "--cloth": cloth, "--spine": spine,
      "--ws": long ? "1" : "0.88",                     // 폭
      "--hs": String((long ? 1 : 0.86) + jitter),      // 높이
      "--thick": long ? "15px" : "7px",                // 오른쪽 종이 결 = 두께
      "--tilt": `${(((h >> 9) % 5) - 2) * 0.6}deg`,    // -1.2 ~ 1.2도
    } as CSSProperties,
    tabs,
  };
}

/** 표지 그림: 아이 그림, 없으면 고른 장소 그림 */
function CoverArt({ st }: { st: Story }) {
  if (st.cover) return <img src={st.cover} alt="" />;
  if (!st.picks?.place) return null;
  return <img className="fallback" src={`/icons/place/${st.picks.place}.png`} alt=""
    onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />;
}

/** 책 앞표지 (선반의 책과 펼쳐지는 책이 같은 모양을 쓴다) */
function Cover({ st, children }: { st: Story; children?: ReactNode }) {
  return (
    <span className="book-cover">
      <span className="book-title">{st.title}</span>
      <span className="book-window"><CoverArt st={st} /></span>
      <span className="book-date">{st.createdAt}</span>
      {children}
    </span>
  );
}

/** 책을 펼치고 들어가는 시간(ms): 떠오르기 420 → 표지 넘기기 440 → 첫 장으로 다가가기 500(끝 200ms 동안 종이색으로 덮임).
 *  팀 규칙 「전환 200~300ms」보다 길어 아이가 누른 데 답하는 한 번의 움직임으로만 쓰고, 움직임 줄이기면 건너뛴다 */
const OPEN_MS = 1380;
/** 첫 장으로 다가갈 때 더 키우는 배율 */
const ZOOM = 3;

/** 한 선반에 꽂을 권 수. 넓은 화면 4, 태블릿 세로 3, 폰 2 */
function usePerShelf() {
  const pick = () => (window.innerWidth >= 1100 ? 4 : window.innerWidth >= 700 ? 3 : 2);
  const [n, setN] = useState(pick);
  useEffect(() => {
    const on = () => setN(pick());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

export default function S12Stories() {
  const nav = useNavigate();
  const { stories, load } = useLibrary();
  const setStory = useSession((s) => s.setStory);
  const mode = useAuth((s) => s.mode);
  const guardian = useGuardianMode();
  const per = usePerShelf();
  // 펼치는 중인 책: 선반에서의 자리 · 생김새를 들고 화면 가운데로 떠오른 뒤 표지를 넘긴다 (2026-10-28 사용자)
  const [opening, setOpening] = useState<{ st: Story; rect: DOMRect; style: CSSProperties; long: boolean } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const open = (st: Story, el: HTMLElement, style: CSSProperties, long: boolean) => {
    if (opening) return;   // 펼치는 동안 다른 책을 눌러도 무시
    setStory(st);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { nav("/story"); return; }
    setOpening({ st, rect: el.getBoundingClientRect(), style, long });
    timer.current = window.setTimeout(() => {
      // S-09 가 종이색에서 스며 나오게 (styles/ui.css body[data-enter="book"]) — 잠깐 뒤 지운다
      document.body.dataset.enter = "book";
      window.setTimeout(() => { delete document.body.dataset.enter; }, 600);
      nav("/story");
    }, OPEN_MS);
  };

  // 떠오른 책이 놓일 자리: 화면 가운데, 화면 높이의 62% 크기
  const fly = opening && (() => {
    const { rect } = opening;
    const sc = Math.min((window.innerHeight * 0.62) / rect.height, (window.innerWidth * 0.42) / rect.width);
    // 펼치면 표지가 왼쪽으로 넘어가 두 쪽이 되므로, 책의 왼쪽 끝(책등)이 화면 가운데에 오게 한다
    const dx = window.innerWidth / 2 + (rect.width * sc) / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    return {
      ...opening.style,
      left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      "--dx": `${dx}px`, "--dy": `${dy}px`, "--sc": String(sc),
      // 다가가기: 첫 장(이 책 자리 = 펼친 오른쪽 쪽) 가운데를 화면 가운데로 옮기며 ZOOM 배 더 키운다
      "--dx2": `${window.innerWidth / 2 - (rect.left + rect.width / 2)}px`,
      "--sc2": String(sc * ZOOM),
    } as CSSProperties;
  })();

  useEffect(() => { load(); }, [load]);
  const shelves = Array.from({ length: Math.ceil(stories.length / per) }, (_, r) => stories.slice(r * per, r * per + per));

  return (
    <Screen back="/" speech={null} title="내 이야기" autoSpeak={false}>
      {mode === "guest" && (
        <div className="box warn">앱을 닫으면 이야기가 사라져요</div>
      )}

      {/* 내 소품 — 그린 물건이 이야기에 나온다 (open-decisions 0-13). 보호자 모드에서만. 곁들이는 길이라 글자 줄로 */}
      {guardian && (
        <div className="aside-links">
          <button className="btn link" onClick={() => nav("/props")}>내 소품 그리기</button>
        </div>
      )}

      {stories.length > 0 ? (
        <div className="shelf">
          {/* 나무 선반에 세운 하드커버 그림책 (시안 「책장 3 다듬기」 + G 색종이 탭, 2026-10-28 사용자).
              표지 그림 창에는 아이 그림(없으면 고른 장소 그림) */}
          {shelves.map((row, r) => (
            <div key={r} className="shelf-row">
              <div className="shelf-books">
                {row.map((st, j) => {
                  const { style, tabs, long } = look(st, r * per + j);
                  return (
                    <button key={st.storyId} className={`book ${long ? "long" : "short"} ${opening?.st.storyId === st.storyId ? "lifted" : ""}`} style={style}
                      aria-label={`${st.title}, ${long ? "긴 이야기" : "짧은 이야기"}, ${st.createdAt}`}
                      onClick={(e) => open(st, e.currentTarget, style, long)}>
                      <span className="book-pages" aria-hidden />
                      {tabs.map((t, k) => (
                        <span key={k} className="book-tab" aria-hidden
                          style={{ top: `${t.top}%`, width: t.w, background: t.color, transform: `rotate(${t.rot}deg)` }} />
                      ))}
                      <Cover st={st} />
                    </button>
                  );
                })}
              </div>
              <div className="shelf-plank" aria-hidden />
            </div>
          ))}
        </div>
      ) : (
        <div className="stage empty" style={{ flexDirection: "column", gap: 20, padding: 32 }}>
          <p className="question">아직 이야기가 없어요</p>
          <p className="hint">상상한 이야기를 만들어 보세요</p>
          <div style={{ width: 280 }}>
            <BigButton go onClick={() => nav("/guide")}>이야기 만들기</BigButton>
          </div>
        </div>
      )}
      {/* 펼쳐지는 책: 선반의 책 자리에서 떠올라 가운데로 오며 커지고, 표지가 책등을 축으로 넘어가 첫 장(제목 · 그림)이 보인다 */}
      {opening && fly && (
        <div className="book-open-layer" aria-hidden>
          <div className={`book-fly ${opening.long ? "long" : "short"}`} style={fly}>
            <span className="book-first">
              <span className="book-first-art"><CoverArt st={opening.st} /></span>
              <span className="book-first-title">{opening.st.title}</span>
            </span>
            <Cover st={opening.st} />
            {/* 표지가 반쯤(90도) 넘어간 뒤 이어서 펼쳐지는 표지 안쪽(면지). 한 장으로 180도 돌리면 표지 글자가 거울처럼 비친다 */}
            <span className="book-left" />
          </div>
        </div>
      )}
    </Screen>
  );
}

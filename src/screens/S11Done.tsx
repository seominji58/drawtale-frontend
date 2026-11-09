import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Party } from "@/components/illust";
import { useSession } from "@/store/session";
import { ENGINE } from "@/api";
import { TITLE_MAX, useLibrary } from "@/store/library";
import { cutoutFor, firstClip } from "@/features/story/clip";
import KeyedClip from "@/features/story/KeyedClip";

export default function S11Done() {
  const nav = useNavigate();
  const resetStory = useSession((s) => s.resetStory);
  const story = useSession((s) => s.story);
  const imageUrl = useSession((s) => s.imageUrl);
  const saved = useLibrary((l) => l.stories.find((x) => x.storyId === story?.storyId));
  const rename = useLibrary((l) => l.rename);
  const setStory = useSession((s) => s.setStory);
  // 책 제목 정하기 (11/4 사용자 「책 다 했어요 누르면 거기서 제목 입력도」). 책장(S-12)의 제목 바꾸기와 같은 저장 — 이 기기에만
  const title = saved?.title ?? story?.title ?? "";
  const [draft, setDraft] = useState(title);
  const [savedNote, setSavedNote] = useState(false);
  useEffect(() => setDraft(title), [title]);
  const saveTitle = () => {
    const t = draft.trim().slice(0, TITLE_MAX);
    if (!story || !t) { setDraft(title); return; }
    // 만들어 준 제목 그대로도 「정하기」로 정할 수 있다 — 바꿔야만 눌리던 것 (11/5 사용자)
    if (t === title) { setDraft(title); setSavedNote(true); return; }
    rename(story.storyId, t);
    setStory({ ...story, title: t, ...(story.book ? { book: { ...story.book, title: t } } : {}) });
    setSavedNote(true);
  };
  // 주인공 그림: 배경을 잘라 낸 정지 그림 → 동작 영상의 첫 장면 → 책장 표지 → 올린 그림 순서.
  // 올린 그림을 먼저 쓰면 사진 배경까지 나왔다 (2026-11-03 사용자 확인)
  const clip = firstClip(story);
  const cutout = story?.stillUrl ?? cutoutFor(story, useSession.getState().character);
  // 원본(imageUrl)은 쓰지 않는다 — 사진 배경까지 나온다 (2026-11-03 「통이미지는 안 된다」)
  const art = saved?.cover ?? (ENGINE === "mock" ? imageUrl : null);

  // 「다 했어요!」를 읽어 준 뒤 저절로 책장으로 (11/9 사용자 「누르지 않으면 뒤로 가기 흐름이 이상해진다」).
  // 제목을 고치는 중(입력 칸을 누름)이면 기다린다
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (editing) return;
    const t = window.setTimeout(() => nav("/stories", { replace: true }), 6000);
    return () => clearTimeout(t);
  }, [editing, nav]);
  // 브라우저 · 기기 뒤로 가기도 책장으로 (만들기 흐름 화면이 기록에 남아 있다)
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const back = () => nav("/stories", { replace: true });
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [nav]);

  return (
    // 다 만든 뒤에는 만들기 흐름(카드 고르기 · 만드는 중)으로 돌아가지 않는다 — 뒤로는 책장으로 (11/9 사용자 「책장으로 자연스럽게,
    // 뒤로 가면 못 가게」). 다시 보기는 제목 아래 글자 버튼
    <Screen back={() => nav("/stories", { replace: true })} speech="다 했어요!" segment={4}
      acts={
        <>
          {/* 큰 버튼은 둘만 (11/9 사용자 「저장하고 나서 버튼이 4개나」). 다시 보기는 제목 아래 글자 버튼 · 뒤로 버튼,
              「처음으로」는 책장에서 갈 수 있어 뺐다 */}
          {/* 방금 꽂은 책을 책장에서 보러 간다 (11/3 사용자 「다 했어요 페이지에서 책장으로 갈 수 있는 버튼」) */}
          <BigButton onClick={() => nav("/stories", { replace: true })}>내 책장</BigButton>
          <BigButton go onClick={() => { resetStory(); nav("/steps"); }}>새 이야기 만들기</BigButton>
        </>
      }>
      {/* 방금 만든 이야기의 주인공(아이 그림)을 도화지에 붙여 축하한다. 책장에 꽂혔다고 알려 준다 (2026-10-28 디자인) */}
      <div className="hero">
        <div className="stage hero-sheet done">
          <div className="illust-wrap">
            {cutout
              ? <img src={cutout} alt="" className="illust" />
              : clip
              ? <KeyedClip src={clip} paused className="illust" />
              : art ? <img src={art} alt="" className="illust" /> : <Party />}
          </div>
          <span className="confetti" aria-hidden />
        </div>
        <div className="hero-side">
          <h2 className="hero-title">다 했어요!</h2>
          <p className="hero-sub">{story ? `「${title}」을 내 책장에 꽂아 두었어요` : "멋진 이야기를 만들었어요"}</p>
          {story && <button type="button" className="btn link" onClick={() => nav("/story")}>▶ 이야기 다시 보기</button>}
          {story && (
            <form className="done-title" onSubmit={(e) => { e.preventDefault(); saveTitle(); }}>
              <label className="rename-label" htmlFor="done-title-input">책 제목</label>
              <div className="done-title-row">
                <input id="done-title-input" className="title-input" value={draft} maxLength={TITLE_MAX} onFocus={() => setEditing(true)}
                  enterKeyHint="done" onChange={(e) => { setDraft(e.target.value); setSavedNote(false); }} onBlur={() => { if (draft.trim() !== title) saveTitle(); }} />
                <BigButton go disabled={!draft.trim()} nudgeOnDisabled={false} onClick={saveTitle}>정하기</BigButton>
              </div>
              {savedNote && <p className="hint" role="status">「{title}」로 정했어요</p>}
            </form>
          )}
        </div>
      </div>
    </Screen>
  );
}

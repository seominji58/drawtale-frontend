import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

// 체험판(아티팩트 · 정적 호스팅)은 주소 뒤 # 로 화면을 나눈다 — 서버가 /guide 같은 주소를 몰라도 새로고침이 된다.
// 평소 빌드는 그대로 BrowserRouter (VITE_HASH_ROUTER 를 켤 때만)
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
import App from "./App";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";

// 로컬 시험 계정 (pt_docs 20 4-4) — 백엔드 `python -m scripts.dev_login` 이 준 주소 `?dev_token=…` 를 받아 로그인 상태로 둔다.
// 개발 서버(npm run dev)에서만. 운영 빌드에는 이 코드가 들어가지 않는다 (import.meta.env.DEV 가 false 라 빠진다)
if (import.meta.env.DEV) {
  const q = new URLSearchParams(location.search);
  const devToken = q.get("dev_token");
  if (devToken) {
    localStorage.setItem("storyblanks.token", devToken);
    localStorage.setItem("storyblanks.account", "dev-login");
    q.delete("dev_token");
    // 로그인 상태는 모듈을 불러올 때 읽는다 — 주소에서 토큰을 지우고 다시 연다
    location.replace(location.pathname + (q.toString() ? `?${q}` : "") + location.hash);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

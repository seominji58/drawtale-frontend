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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

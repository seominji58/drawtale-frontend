import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// 백엔드는 8000번에 따로 띄운다. /api 요청만 넘겨서 CORS 없이 붙는다.
//
// 대상이 `localhost` 가 아니라 `127.0.0.1` 인 이유: Windows 에서 `localhost` 는
// ::1 을 먼저 시도한다. 백엔드가 IPv4 에만 붙어 있으면 ::1 연결이 거절된 뒤
// 127.0.0.1 로 넘어가느라 **요청마다 약 2초**가 붙는다 (실측 2020ms vs 1ms).
// uvicorn 기본값이 IPv4 단독이라 팀원 서버에서도 그대로 생긴다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
  },
});

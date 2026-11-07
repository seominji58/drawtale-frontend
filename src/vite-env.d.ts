/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ENGINE?: "mock" | "agent" | "finetuned";
  /** 백엔드 API 주소. `/api/v1` 까지 쓴다 (예: https://api.example.com/api/v1). 비우면 `/api/v1` (vite 프록시) */
  readonly VITE_API_BASE?: string;
  /** 체험판 빌드에서 HashRouter (아티팩트 · 정적 호스팅) */
  readonly VITE_HASH_ROUTER?: string;
  /** 소셜 로그인 client id. 공개돼도 되는 값이다 (시크릿은 백엔드에만 둔다) */
  readonly VITE_KAKAO_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ENGINE?: "mock" | "agent" | "finetuned";
  /** 소셜 로그인 client id. 공개돼도 되는 값이다 (시크릿은 백엔드에만 둔다) */
  readonly VITE_KAKAO_CLIENT_ID?: string;
  readonly VITE_NAVER_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

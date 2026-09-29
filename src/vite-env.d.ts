/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ENGINE?: "mock" | "agent" | "finetuned";
  /** 카카오 REST API 키. 공개돼도 되는 값이다 (시크릿은 백엔드에만 둔다) */
  readonly VITE_KAKAO_CLIENT_ID?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

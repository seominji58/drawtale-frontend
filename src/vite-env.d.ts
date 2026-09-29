/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_ENGINE?: "mock" | "agent" | "finetuned" }
interface ImportMeta { readonly env: ImportMetaEnv }

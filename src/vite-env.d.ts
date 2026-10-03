/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false" disables the MSW mock API. Defaults to enabled. */
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

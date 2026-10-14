/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CARTO basemaps API key (free tier). Loaded from .env, gitignored. */
  readonly VITE_CARTO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
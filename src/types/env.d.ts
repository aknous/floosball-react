/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    REACT_APP_API_URL: string
    REACT_APP_WS_URL: string
    REACT_APP_SUPABASE_URL: string
    REACT_APP_SUPABASE_KEY: string
  }
}

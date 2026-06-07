/// <reference types="vite/client" />

declare global {
  interface Window {
    __PERSONAL_MCP_CONFIG__?: {
      supabaseUrl: string;
      supabaseAnonKey: string;
    };
  }
}

export {};

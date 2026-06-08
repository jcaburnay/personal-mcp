import { createClient } from "@supabase/supabase-js";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

const supabaseUrl = window.__PERSONAL_MCP_CONFIG__?.supabaseUrl;
const supabasePublishableKey = window.__PERSONAL_MCP_CONFIG__?.supabasePublishableKey;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase consent configuration.");
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);

createRoot(root).render(
  <React.StrictMode>
    <App supabase={supabase} />
  </React.StrictMode>
);

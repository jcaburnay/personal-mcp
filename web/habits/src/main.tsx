import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HabitsWidget } from "./HabitsWidget.js";

const root = document.getElementById("habits-root");
if (!root) {
  throw new Error("habits-root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <HabitsWidget />
  </StrictMode>
);

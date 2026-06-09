import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP Apps resource URI for the habits widget. Tools that should render the widget reference this
 * via `_meta.ui.resourceUri` (+ the `openai/outputTemplate` ChatGPT compatibility alias).
 */
export const HABITS_WIDGET_URI = "ui://widget/habits.html";

/** MCP Apps UI MIME type (current name; replaced the older `text/html+skybridge`). */
export const HABITS_WIDGET_MIME = "text/html;profile=mcp-app";

// The widget is the single-file React bundle built by `pnpm build:web:habits` into dist-web/habits.
// It is inlined into the resource HTML as a module script (the SDK serves the resource text as-is).
// Read fresh per request so a rebuilt bundle is served without a server restart.
const WIDGET_BUNDLE_PATH = resolve(process.cwd(), "dist-web/habits/habits.js");

function widgetHtml(): string {
  const bundle = readFileSync(WIDGET_BUNDLE_PATH, "utf8");
  return `<div id="habits-root"></div>\n<script type="module">${bundle}</script>`;
}

export function registerHabitsWidgetResource(server: McpServer) {
  server.registerResource(
    "habits-widget",
    HABITS_WIDGET_URI,
    { mimeType: HABITS_WIDGET_MIME },
    async () => ({
      contents: [
        {
          uri: HABITS_WIDGET_URI,
          mimeType: HABITS_WIDGET_MIME,
          text: widgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
            },
          },
        },
      ],
    })
  );
}

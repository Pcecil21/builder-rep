import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleChatPayload, readJsonBody } from "./server/chat-handler.js";

function chatApiPlugin() {
  return {
    name: "builder-rep-chat-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const body = await readJsonBody(req);
          const payload = await handleChatPayload(body);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Chat request failed",
              detail: error instanceof Error ? error.message : "Unknown error",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), chatApiPlugin()],
});

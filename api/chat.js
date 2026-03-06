import { handleChatPayload } from "../server/chat-handler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const response = await handleChatPayload(payload ?? {});
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: "Chat request failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

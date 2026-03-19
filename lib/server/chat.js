import { handleStudio } from "@/lib/server/studio-chat";
import { handleViewer } from "@/lib/server/viewer-chat";

export async function handleChatPayload(payload) {
  if (payload.surface === "viewer") {
    return handleViewer(payload);
  }

  if (payload.surface === "studio") {
    return handleStudio(payload);
  }

  return {
    reply: "Unsupported surface.",
    intent: "none",
    projectIds: [],
  };
}

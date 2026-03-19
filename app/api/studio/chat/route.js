import { NextResponse } from "next/server";
import { z } from "zod";
import { handleChatPayload } from "@/lib/server/chat";
import { requireRouteSession } from "@/lib/server/session-guards";
import { getStore } from "@/lib/server/store";

const messageSchema = z.object({
  role: z.string().max(32).optional(),
  text: z.string().max(2000).optional(),
});

const schema = z.object({
  history: z.array(messageSchema).max(24).optional(),
  userText: z.string().trim().min(1).max(2000),
  context: z.enum(["profile", "build"]).optional(),
  projectId: z.string().max(120).optional(),
  currentProject: z.record(z.string(), z.any()).nullable().optional(),
});

export async function POST(request) {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Chuckie interview requires a configured OpenAI API key in this environment." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { history = [], userText, context, projectId, currentProject } = schema.parse(body);
    const store = getStore();
    const record = await store.getBuilderRecordByUserId(current.user.id);

    if (!record) {
      return NextResponse.json({ error: "Builder profile not found." }, { status: 404 });
    }

    const resolvedContext = context ?? "profile";
    const stage =
      resolvedContext === "build"
        ? currentProject
          ? "build-refine"
          : "projects"
        : "onboarding-interview";

    const payload = await handleChatPayload({
      surface: "studio",
      builder: record.draft,
      history: history.map((message) => ({
        role: typeof message.role === "string" ? message.role : "",
        text: typeof message.text === "string" ? message.text : "",
      })),
      userText,
      stage,
      currentProject: currentProject ?? null,
      focusField: null,
      projectId: projectId ?? null,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

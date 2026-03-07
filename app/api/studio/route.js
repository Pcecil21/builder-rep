import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRouteSession } from "@/lib/server/session-guards";
import { getStore } from "@/lib/server/store";
import { getShareUrlForSlug } from "@/lib/server/url";

const builderPayloadSchema = z.object({
  builder: z.record(z.string(), z.any()),
});

export async function GET() {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const store = getStore();
  const record = await store.getBuilderRecordByUserId(current.user.id);

  return NextResponse.json({
    builder: record?.draft ?? null,
    shareUrl: record?.published ? await getShareUrlForSlug(record.slug) : null,
    publishedAt: record?.publishedAt ?? null,
  });
}

export async function PUT(request) {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = builderPayloadSchema.parse(body);
    const serializedSize = JSON.stringify(parsed.builder).length;

    if (serializedSize > 250_000) {
      return NextResponse.json(
        { error: "Builder profile payload is too large. Reduce the draft size and try again." },
        { status: 413 },
      );
    }

    const store = getStore();
    const record = await store.saveBuilderDraft(current.user.id, parsed.builder);

    return NextResponse.json({
      builder: record.draft,
      shareUrl: record.published ? await getShareUrlForSlug(record.slug) : null,
      publishedAt: record.publishedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the builder profile.";
    const status = message.includes("already taken")
      ? 409
      : message.includes("DATABASE_URL")
        ? 500
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

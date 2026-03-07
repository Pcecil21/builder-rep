import { NextResponse } from "next/server";
import { requireRouteSession } from "@/lib/server/session-guards";
import { getStore } from "@/lib/server/store";
import { getShareUrlForSlug } from "@/lib/server/url";

export async function POST() {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const store = getStore();
    const record = await store.publishBuilder(current.user.id);

    return NextResponse.json({
      builder: record.published,
      shareUrl: await getShareUrlForSlug(record.slug),
      publishedAt: record.publishedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish the builder rep.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("DATABASE_URL") ? 500 : 400 },
    );
  }
}

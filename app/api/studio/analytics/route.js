import { NextResponse } from "next/server";
import { getAnalytics, getVisitorCount } from "@/lib/server/analytics";
import { requireRouteSession } from "@/lib/server/session-guards";
import { getStore } from "@/lib/server/store";

export async function GET() {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const store = getStore();
    const record = await store.getBuilderRecordByUserId(current.user.id);

    if (!record) {
      return NextResponse.json({ error: "Builder profile not found." }, { status: 404 });
    }

    const slug = record.slug;
    const [events, visitors] = await Promise.all([
      getAnalytics(slug, 30),
      getVisitorCount(slug, 30),
    ]);

    return NextResponse.json({
      slug,
      days: 30,
      visitors,
      events,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

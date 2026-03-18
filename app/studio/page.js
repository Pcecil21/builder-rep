import StudioShell from "@/components/StudioShell";
import { BUILDER_SCHEMA_VERSION } from "@/lib/builder-profile";
import { requirePageSession } from "@/lib/server/session-guards";
import { getStore } from "@/lib/server/store";
import { getShareUrlForSlug } from "@/lib/server/url";

export default async function StudioPage() {
  const current = await requirePageSession();

  const store = getStore();
  let record = await store.getBuilderRecordByUserId(current.user.id);

  if (!record) {
    record = await store.createBuilderForUser({
      userId: current.user.id,
      email: current.user.email,
    });
  } else if (record.draft.schemaVersion !== BUILDER_SCHEMA_VERSION) {
    record = await store.resetBuilderForUser({
      userId: current.user.id,
      email: current.user.email,
    });
  }

  const shareUrl = record.published ? await getShareUrlForSlug(record.slug) : null;

  return (
    <StudioShell
      email={current.user.email}
      initialBuilder={record.draft}
      initialShareUrl={shareUrl}
      initialPublishedAt={record.publishedAt}
      chatConfigured={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}

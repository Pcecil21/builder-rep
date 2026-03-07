import { notFound } from "next/navigation";
import PublicRepClient from "@/components/PublicRepClient";
import { getStore } from "@/lib/server/store";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const store = getStore();
  const builder = await store.getPublishedBuilderBySlug(resolvedParams.slug);

  if (!builder) {
    return {
      title: "Builder Rep Not Found",
    };
  }

  return {
    title: `${builder.displayName} | Builder Rep`,
    description: builder.shortBio,
  };
}

export default async function PublicRepPage({ params }) {
  const resolvedParams = await params;
  const store = getStore();
  const builder = await store.getPublishedBuilderBySlug(resolvedParams.slug);

  if (!builder) {
    notFound();
  }

  return <PublicRepClient builder={builder} slug={resolvedParams.slug} />;
}

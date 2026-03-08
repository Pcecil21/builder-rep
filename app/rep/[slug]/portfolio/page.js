import { notFound } from "next/navigation";
import PortfolioPageClient from "@/components/PortfolioPageClient";
import { getStore } from "@/lib/server/store";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const store = getStore();
  const builder = await store.getPublishedBuilderBySlug(resolvedParams.slug);

  if (!builder) {
    return {
      title: "Portfolio Not Found",
    };
  }

  return {
    title: `${builder.displayName} | Portfolio`,
    description: `${builder.displayName}'s project ecosystem and portfolio map.`,
  };
}

export default async function PublicPortfolioPage({ params }) {
  const resolvedParams = await params;
  const store = getStore();
  const builder = await store.getPublishedBuilderBySlug(resolvedParams.slug);

  if (!builder) {
    notFound();
  }

  return <PortfolioPageClient builder={builder} slug={resolvedParams.slug} />;
}

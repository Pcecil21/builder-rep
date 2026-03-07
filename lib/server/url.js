import { headers } from "next/headers";

export async function getBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function getShareUrlForSlug(slug) {
  return `${await getBaseUrl()}/rep/${slug}`;
}

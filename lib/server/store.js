import { createFileStore } from "@/lib/server/file-store";
import { createNeonStore } from "@/lib/server/neon-store";

let store;

function shouldRequireDatabase() {
  return process.env.REQUIRE_DATABASE === "true" || process.env.VERCEL_ENV === "production";
}

export function getStore() {
  if (!process.env.DATABASE_URL && shouldRequireDatabase()) {
    throw new Error(
      "DATABASE_URL is required for production deployments. The file store is only for local development.",
    );
  }

  if (!store) {
    store = process.env.DATABASE_URL ? createNeonStore() : createFileStore();
  }

  return store;
}

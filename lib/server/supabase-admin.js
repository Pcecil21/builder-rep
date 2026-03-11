import { createClient } from "@supabase/supabase-js";

let client;
let bucketReadyPromise;

function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("SUPABASE_URL is required for screenshot uploads.");
  }

  return value;
}

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for screenshot uploads.");
  }

  return value;
}

export function getStorageBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || "builder-assets";
}

export function getSupabaseAdmin() {
  if (!client) {
    client = createClient(getSupabaseUrl(), getServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return client;
}

export async function ensureStorageBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const supabase = getSupabaseAdmin();
      const bucketName = getStorageBucketName();
      const { data, error } = await supabase.storage.listBuckets();

      if (error) {
        throw new Error(error.message);
      }

      const existing = data?.find((bucket) => bucket.name === bucketName);

      if (!existing) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        });

        if (createError && !createError.message.toLowerCase().includes("already exists")) {
          throw new Error(createError.message);
        }
      }

      return bucketName;
    })();
  }

  return bucketReadyPromise;
}

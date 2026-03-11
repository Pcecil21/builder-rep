import { NextResponse } from "next/server";
import { requireRouteSession } from "@/lib/server/session-guards";
import {
  ensureStorageBucket,
  getStorageBucketName,
  getSupabaseAdmin,
} from "@/lib/server/supabase-admin";

function sanitizeFilename(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request) {
  const { current, response: unauthorizedResponse } = await requireRouteSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Images must be 10MB or smaller." }, { status: 413 });
    }

    await ensureStorageBucket();

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const path = `users/${current.user.id}/${Date.now()}-${sanitizeFilename(file.name || `upload.${ext}`)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();
    const bucketName = getStorageBucketName();
    const { error } = await supabase.storage.from(bucketName).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);

    return NextResponse.json({
      visual: {
        title: file.name.replace(/\.[^.]+$/, "") || "Screenshot",
        description: "",
        url: data.publicUrl,
        path,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload screenshot.";
    const status = message.includes("SUPABASE_") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

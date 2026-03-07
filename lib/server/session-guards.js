import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/auth";

export async function requirePageSession() {
  const current = await getCurrentSession();

  if (!current) {
    redirect("/login");
  }

  return current;
}

export async function requireRouteSession() {
  const current = await getCurrentSession();

  if (!current) {
    return {
      current: null,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return {
    current,
    response: null,
  };
}

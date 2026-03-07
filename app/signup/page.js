import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentSession } from "@/lib/server/auth";

export default async function SignupPage() {
  const current = await getCurrentSession();

  if (current) {
    redirect("/studio");
  }

  return <AuthForm mode="signup" />;
}

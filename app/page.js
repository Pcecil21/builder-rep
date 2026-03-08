import ChuckieLanding from "@/components/ChuckieLanding";
import { getCurrentSession } from "@/lib/server/auth";

export default async function LandingPage() {
  const current = await getCurrentSession();
  const createHref = current ? "/studio" : "/signup";
  const startHref = current ? "/studio" : "/signup";

  return <ChuckieLanding loginHref="/login" createHref={createHref} startHref={startHref} />;
}

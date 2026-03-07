import Link from "next/link";
import { getCurrentSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { getShareUrlForSlug } from "@/lib/server/url";

function Feature({ title, copy }) {
  return (
    <div className="landing-feature">
      <span className="landing-feature-kicker">Chuckie</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

export default async function LandingPage() {
  const current = await getCurrentSession();
  const builderRecord = current ? await getStore().getBuilderRecordByUserId(current.user.id) : null;
  const shareUrl =
    builderRecord?.published && builderRecord.slug
      ? await getShareUrlForSlug(builderRecord.slug)
      : null;

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="landing-brand">
          <div className="landing-brand-mark">◎</div>
          <div>
            <strong>Builder Rep</strong>
            <span>AI-native representation for builders</span>
          </div>
        </div>
        <div className="landing-nav-actions">
          {current ? (
            <>
              <Link className="ghost-button" href="/studio">
                Open Studio
              </Link>
              {shareUrl ? (
                <a className="ghost-button" href={shareUrl}>
                  View Published Rep
                </a>
              ) : null}
            </>
          ) : (
            <>
              <Link className="ghost-button" href="/login">
                Log In
              </Link>
              <Link className="solid-button" href="/signup">
                Create Your Rep
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-eyebrow">Launch Flow</div>
            <h1>Turn a one-off Chuckie demo into a product every builder can own.</h1>
            <p>
              Sign up, teach Chuckie how to represent your work, and publish a public link people can
              explore, question, and share.
            </p>
            <div className="landing-cta-row">
              <Link className="solid-button" href={current ? "/studio" : "/signup"}>
                {current ? "Continue Building" : "Start with Email"}
              </Link>
              <a className="ghost-button" href={current && shareUrl ? shareUrl : "/login"}>
                {current && shareUrl ? "Open Published Rep" : "Already have an account?"}
              </a>
            </div>
          </div>

          <div className="landing-panel">
            <div className="landing-panel-row">
              <span>1</span>
              <div>
                <strong>Sign up</strong>
                <p>Create an account with email and password.</p>
              </div>
            </div>
            <div className="landing-panel-row">
              <span>2</span>
              <div>
                <strong>Builder Studio</strong>
                <p>Walk Chuckie through your work and shape the rep in review.</p>
              </div>
            </div>
            <div className="landing-panel-row">
              <span>3</span>
              <div>
                <strong>Publish</strong>
                <p>Get a public link at `/rep/your-slug` and share it anywhere.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-grid">
          <Feature
            title="Interactive portfolio, not a static resume"
            copy="Chuckie answers questions, brings forward proof, and moves people into real work."
          />
          <Feature
            title="Draft privately, publish intentionally"
            copy="Your studio edits stay private until you hit publish. The public rep always serves the latest published version."
          />
          <Feature
            title="Builder-first workflow"
            copy="The onboarding conversation, project capture, and review flow all stay inside one studio experience."
          />
        </section>
      </main>
    </div>
  );
}

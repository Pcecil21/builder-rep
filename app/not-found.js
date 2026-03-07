import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card-head">
          <div className="landing-eyebrow">Not Found</div>
          <h1>This builder rep does not exist.</h1>
          <p>The link may be wrong, or the builder has not published their rep yet.</p>
        </div>
        <Link className="solid-button auth-submit" href="/">
          Back to Landing
        </Link>
      </div>
    </div>
  );
}

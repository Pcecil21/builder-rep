"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const COPY = {
  login: {
    title: "Log in to Builder Studio",
    action: "Log In",
    endpoint: "/api/auth/login",
    alternateHref: "/signup",
    alternateLabel: "Create an account",
  },
  signup: {
    title: "Create your builder rep",
    action: "Sign Up",
    endpoint: "/api/auth/signup",
    alternateHref: "/login",
    alternateLabel: "Already have an account?",
  },
};

export default function AuthForm({ mode }) {
  const config = COPY[mode];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || "Request failed.");
        return;
      }

      router.push("/studio");
      router.refresh();
    } catch {
      setError("Unable to reach the server right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <Link className="auth-home-link" href="/">
        ← Back to landing
      </Link>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card-head">
          <div className="landing-eyebrow">Builder Studio</div>
          <h1>{config.title}</h1>
          <p>Email and password for now. After auth, you go straight into the studio.</p>
        </div>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}

        <button className="solid-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Working..." : config.action}
        </button>

        <Link className="auth-alt-link" href={config.alternateHref}>
          {config.alternateLabel}
        </Link>
      </form>
    </div>
  );
}

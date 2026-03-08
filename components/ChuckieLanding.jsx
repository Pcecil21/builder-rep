"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChuckieLanding({ loginHref, createHref, startHref }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setLoaded(true), 100);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const fade = (delay) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  const push = (href) => router.push(href);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafaf8",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        color: "#1a1a1a",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; background: #fafaf8; }
        a { color: inherit; text-decoration: none; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <nav
        className="chuckie-nav"
        style={{
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...fade(0),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤙</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Chuckie</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span
            style={{
              fontSize: 13,
              color: "#7a7a78",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            onClick={() => push(loginHref)}
          >
            Log in
          </span>
          <button
            style={{
              background: "#1a1a1a",
              color: "#fafaf8",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "opacity 0.15s",
            }}
            onClick={() => push(createHref)}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = "1";
            }}
          >
            Create Your Rep
          </button>
        </div>
      </nav>

      <section
        className="chuckie-container"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "100px 48px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            right: -20,
            fontSize: 64,
            opacity: 0.08,
            animation: "float 6s ease-in-out infinite",
          }}
        >
          🤙
        </div>

        <div style={fade(0.1)}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "#2d8a2e",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 500,
            }}
          >
            Builder Representative
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(44px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginTop: 20,
            maxWidth: 750,
            ...fade(0.2),
          }}
        >
          Your work, represented
          <br />
          by an agent that
          <br />
          <span style={{ color: "#2d8a2e" }}>actually knows it.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "#4a4a4a",
            maxWidth: 520,
            marginTop: 28,
            ...fade(0.35),
          }}
        >
          Teach Chuckie about your agent builds, orchestration systems, and AI-native products.
          Publish a link. Anyone who visits can explore your work, ask questions, and see what
          you're capable of.
        </p>

        <div
          className="chuckie-cta-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 40,
            ...fade(0.5),
          }}
        >
          <button
            style={{
              background: "#1a1a1a",
              color: "#fafaf8",
              border: "none",
              borderRadius: 12,
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "opacity 0.15s",
            }}
            onClick={() => push(startHref)}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = "1";
            }}
          >
            Start Building →
          </button>
          <span
            style={{
              fontSize: 13,
              color: "#7a7a78",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Free to start
          </span>
        </div>
      </section>

      <section
        className="chuckie-container"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 48px 80px",
          ...fade(0.6),
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#a8a8a4",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          How it works
        </span>

        <div
          className="chuckie-steps"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 60,
            marginTop: 40,
          }}
        >
          {[
            {
              num: "01",
              title: "Teach Chuckie",
              desc: "Walk through a conversation about who you are and what you build. Drop project links, describe your approach. Chuckie learns your story.",
            },
            {
              num: "02",
              title: "Shape the rep",
              desc: "Review how Chuckie represents each project. Edit the framing, add screenshots, adjust what it emphasizes. You control the narrative.",
            },
            {
              num: "03",
              title: "Publish & share",
              desc: "Get a public link. Anyone who visits can explore your work through conversation — asking questions, drilling into projects, seeing your systems.",
            },
          ].map((step, index) => (
            <div key={index}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 32,
                  fontWeight: 400,
                  color: "#e2e2dc",
                  display: "block",
                  marginBottom: 16,
                }}
              >
                {step.num}
              </span>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  letterSpacing: "-0.01em",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  color: "#7a7a78",
                  lineHeight: 1.6,
                }}
              >
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="chuckie-divider" style={{ maxWidth: 900, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ height: 1, background: "#e2e2dc" }} />
      </div>

      <section
        className="chuckie-container"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 48px",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#a8a8a4",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          What visitors experience
        </span>

        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 56 }}>
          {[
            {
              title: "A conversation, not a portfolio",
              desc: "Visitors don't scroll through a static page. They talk to your representative. Chuckie answers questions, brings forward the right projects, and adapts to what the visitor actually cares about.",
              accent: "#2d8a2e",
            },
            {
              title: "Visual proof inline",
              desc: "When someone asks about your work, Chuckie doesn't just describe it — it shows project cards, architecture diagrams, tech stacks, and comparisons directly in the conversation. Rich components that make the work tangible.",
              accent: "#2874a6",
            },
            {
              title: "Three levels of depth",
              desc: "Quick overview, expanded summary, full deep dive — each project can be explored at the level the visitor wants. Screenshots, architecture diagrams, and design rationale are all there when someone wants to go deep.",
              accent: "#b83280",
            },
          ].map((item, index) => (
            <div key={index} style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 4,
                  height: 48,
                  borderRadius: 2,
                  background: item.accent,
                  flexShrink: 0,
                  marginTop: 4,
                  opacity: 0.5,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    color: "#1a1a1a",
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: "#4a4a4a",
                    lineHeight: 1.65,
                    maxWidth: 580,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="chuckie-divider" style={{ maxWidth: 900, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ height: 1, background: "#e2e2dc" }} />
      </div>

      <section
        className="chuckie-container"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          Portfolios show screenshots.
          <br />
          Chuckie shows <span style={{ color: "#2d8a2e" }}>what you can do.</span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: "#7a7a78",
            lineHeight: 1.6,
            maxWidth: 460,
            margin: "24px auto 0",
          }}
        >
          The best way to prove you can build agent systems is to let someone interact with one.
          Chuckie is that agent.
        </p>
        <button
          style={{
            background: "#1a1a1a",
            color: "#fafaf8",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 36,
            transition: "opacity 0.15s",
          }}
          onClick={() => push(createHref)}
          onMouseEnter={(event) => {
            event.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.opacity = "1";
          }}
        >
          Create Your Rep →
        </button>
      </section>

      <div className="chuckie-divider" style={{ maxWidth: 900, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ height: 1, background: "#e2e2dc" }} />
      </div>

      <section
        className="chuckie-container"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 48px",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#a8a8a4",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Built for
        </span>

        <div
          className="chuckie-built-for"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px 60px",
            marginTop: 36,
          }}
        >
          {[
            {
              who: "Agent builders",
              what: "Show off your OpenClaw teams, multi-agent systems, and orchestration work in a way that screenshots never could.",
            },
            {
              who: "Vibe coders",
              what: "You've shipped apps, dashboards, and tools with AI. Now let people explore them through a conversation with your rep.",
            },
            {
              who: "AI consultants",
              what: "Send Chuckie instead of a deck. Prospective clients can interrogate your past work before you ever get on a call.",
            },
            {
              who: "Freelancers & studios",
              what: "A living portfolio that answers questions, shows relevant work, and makes the case for you 24/7.",
            },
          ].map((item, index) => (
            <div key={index}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 6,
                }}
              >
                {item.who}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#7a7a78",
                  lineHeight: 1.6,
                }}
              >
                {item.what}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="chuckie-container chuckie-final-cta"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 48px 120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Ready to build your rep?
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#7a7a78",
              marginTop: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Free to start · Takes 10 minutes
          </div>
        </div>
        <button
          style={{
            background: "#1a1a1a",
            color: "#fafaf8",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            transition: "opacity 0.15s",
          }}
          onClick={() => push(startHref)}
          onMouseEnter={(event) => {
            event.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.opacity = "1";
          }}
        >
          Start Building →
        </button>
      </section>

      <footer
        className="chuckie-footer"
        style={{
          borderTop: "1px solid #e2e2dc",
          padding: "32px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤙</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#7a7a78" }}>Chuckie</span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: "#a8a8a4",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Builder representation for the agent era
        </span>
      </footer>
    </div>
  );
}

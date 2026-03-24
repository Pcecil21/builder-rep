"use client";

import { useEffect, useState } from "react";

function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function truncateId(id) {
  if (typeof id !== "string") return String(id).slice(0, 8);
  return id.slice(0, 8);
}

function StatCard({ label, value }) {
  return (
    <div className="studio-panel" style={{ flex: 1, minWidth: 140 }}>
      <div className="review-section-label">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function deriveStats(data) {
  const events = data.events || [];
  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const chatMessages = events.filter((e) => e.event_type === "chat_message").length;
  const visitors = data.visitors ?? 0;

  const chatQuestions = events
    .filter((e) => {
      if (e.event_type !== "chat_message") return false;
      try {
        const meta = typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata;
        return meta && meta.question;
      } catch {
        return false;
      }
    })
    .map((e) => {
      const meta = typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata;
      return { question: meta.question, timestamp: e.created_at };
    })
    .reverse()
    .slice(0, 20);

  const visitorCounts = {};
  for (const event of events) {
    const vid = event.visitor_id;
    if (vid) {
      visitorCounts[vid] = (visitorCounts[vid] || 0) + 1;
    }
  }
  const topVisitors = Object.entries(visitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return { visitors, pageViews, chatMessages, chatQuestions, topVisitors };
}

export default function StudioAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/studio/analytics");
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to load analytics.");
        }
        const payload = await response.json();
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics.");
          setLoading(false);
        }
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="interview-stack">
        <div className="studio-panel" style={{ padding: 24, textAlign: "center" }}>
          <div className="review-section-label">Analytics</div>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interview-stack">
        <div className="studio-error">{error}</div>
      </div>
    );
  }

  const stats = deriveStats(data);

  return (
    <div className="interview-stack">
      <div className="studio-panel">
        <div className="studio-panel-head">
          <div className="review-section-label">Analytics</div>
          <h2>Visitor Activity</h2>
          <p>How people are interacting with your public rep over the last {data.days} days.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard label="Unique Visitors" value={stats.visitors} />
        <StatCard label="Page Views" value={stats.pageViews} />
        <StatCard label="Chat Messages" value={stats.chatMessages} />
      </div>

      {stats.chatQuestions.length > 0 && (
        <div className="studio-panel">
          <div className="review-section-label">Recent Chat Questions</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.chatQuestions.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom: index < stats.chatQuestions.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ fontSize: 14, color: "var(--text)" }}>{item.question}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topVisitors.length > 0 && (
        <div className="studio-panel">
          <div className="review-section-label">Top Visitors</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.topVisitors.map(([visitorId, count]) => (
              <div
                key={visitorId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-soft)" }}>
                  {truncateId(visitorId)}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {count} {count === 1 ? "event" : "events"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.chatQuestions.length === 0 && stats.topVisitors.length === 0 && (
        <div className="studio-panel" style={{ textAlign: "center", padding: 24 }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            No visitor activity yet. Share your rep link to start getting traffic.
          </p>
        </div>
      )}
    </div>
  );
}

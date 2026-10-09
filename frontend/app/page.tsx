"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Health = { status: string } | null;

export default function Home() {
  const [health, setHealth] = useState<Health>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError("Backend not reachable yet — start it with uvicorn."));
  }, []);

  return (
    <main>
      <span className="badge">Phase 1 · Scaffold</span>
      <h1>StayOps AI</h1>
      <p style={{ color: "var(--muted)", maxWidth: 640 }}>
        A multi-agent AI system for autonomous PG and co-living operations. Seven
        specialized agents collaborate on leasing, tenant support, maintenance, rent
        collection, and vacancy recovery — coordinated by an orchestrator and watched by a
        facilitator.
      </p>

      <div className="card">
        <strong>Backend connection</strong>
        <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
          Calling <code>{API_URL}/health</code>
        </p>
        <p style={{ marginTop: 12 }}>
          {health ? (
            <>Status: <span className="badge">{health.status}</span></>
          ) : error ? (
            <span style={{ color: "#ff8a8a" }}>{error}</span>
          ) : (
            "Checking…"
          )}
        </p>
      </div>

      <div className="card">
        <strong>Next up</strong>
        <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
          The owner dashboard (overview, leads, rent, maintenance, revenue &amp; vacancy,
          and the Agent Activity timeline) is built in Phase 3 onward.
        </p>
      </div>
    </main>
  );
}

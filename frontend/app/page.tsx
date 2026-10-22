"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StayOpsLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="landing-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="landing-logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#landing-logo-grad)" />
      <path d="M20 8.5L8 18H12V31H28V18H32L20 8.5Z" fill="white" fillOpacity="0.96" />
      <path d="M17 22H23V31H17V22Z" fill="#1e1b4b" fillOpacity="0.85" />
      <circle cx="20" cy="15" r="2.2" fill="url(#landing-logo-accent)" />
      <circle cx="20" cy="15" r="4.2" stroke="url(#landing-logo-accent)" strokeWidth="0.8" strokeOpacity="0.7" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [mRes, iRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/metrics`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/integrations/status`).then((r) => (r.ok ? r.json() : null)),
        ]);
        setMetrics(mRes);
        setIntegrations(iRes);
      } catch (err) {
        console.error("Failed to load landing stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleQuickDemoLaunch = async (role: "admin" | "property_manager" | "tenant") => {
    setQuickLoginLoading(role);
    let email = "manager@stayops.ai";
    let password = "Manager@123";
    if (role === "admin") {
      email = "contact@sashankkarn.com.np";
      password = "Admin@123";
    } else if (role === "tenant") {
      email = "resident@stayops.ai";
      password = "Resident@123";
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        localStorage.setItem("stayops_user", JSON.stringify(data.user));
        localStorage.setItem("stayops_token", data.access_token);
        document.cookie = `stayops_token=${data.access_token}; path=/; max-age=86400`;
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setQuickLoginLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.9)",
          borderBottom: "1px solid #e2e8f0",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StayOpsLogo size={36} />
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              StayOps AI
            </span>
            <span
              style={{
                marginLeft: 8,
                background: "#eff6ff",
                color: "#2563eb",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 99,
                border: "1px solid #bfdbfe",
              }}
            >
              Multi-Agent v0.1
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#features" style={{ color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Features
          </a>
          <a href="#agents" style={{ color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            7 Specialized Agents
          </a>
          <a href="#integrations" style={{ color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            WhatsApp &amp; Integrations
          </a>
          <a href="#health" style={{ color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Platform Health
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
            <Link
              href="/login"
              style={{
                color: "#2563eb",
                background: "#f1f5f9",
                padding: "8px 16px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #cbd5e1",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
              }}
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* ------------------------------------------------------------- */}
      <section
        style={{
          padding: "70px 24px 60px",
          maxWidth: 1160,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 99,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: "#1e40af",
            marginBottom: 20,
          }}
        >
          <span>🚀 Production Ready</span>
          <span style={{ color: "#93c5fd" }}>•</span>
          <span>FastAPI + Next.js 14 + Meta Cloud WhatsApp v25.0</span>
        </div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 850,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "#0f172a",
            margin: "0 auto 18px",
            maxWidth: 900,
          }}
        >
          Autonomous Operations for <span style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PG, Hostels &amp; Co-Living</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#475569",
            lineHeight: 1.6,
            maxWidth: 760,
            margin: "0 auto 32px",
          }}
        >
          Seven specialized AI agents orchestrate resident move-outs, rent collections on WhatsApp, room turnovers, and vendor dispatch with rigorous human-in-the-loop safety gating.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
          <Link
            href="/dashboard"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              color: "#ffffff",
              padding: "14px 28px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Launch Operations Dashboard</span>
            <span>→</span>
          </Link>

          <Link
            href="/login"
            style={{
              background: "#ffffff",
              color: "#0f172a",
              padding: "14px 24px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
              border: "1px solid #cbd5e1",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            Sign In / Register
          </Link>
        </div>

        {/* Quick Demo Launch Bar */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px dashed #cbd5e1",
            borderRadius: 14,
            padding: "16px 20px",
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              ⚡ Quick Demo Instant Login:
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Click any role to auto-authenticate and enter the live workspace directly.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => handleQuickDemoLaunch("admin")}
              disabled={!!quickLoginLoading}
              style={{
                background: "#7c3aed",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {quickLoginLoading === "admin" ? "Launching..." : "🛡️ Admin (contact@sashankkarn.com.np)"}
            </button>

            <button
              onClick={() => handleQuickDemoLaunch("property_manager")}
              disabled={!!quickLoginLoading}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {quickLoginLoading === "property_manager" ? "Launching..." : "👔 Property Manager"}
            </button>

            <button
              onClick={() => handleQuickDemoLaunch("tenant")}
              disabled={!!quickLoginLoading}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {quickLoginLoading === "tenant" ? "Launching..." : "🏠 Resident Portal"}
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. LIVE PORTFOLIO METRICS BANNER */}
      {/* ------------------------------------------------------------- */}
      <section style={{ maxWidth: 1160, margin: "0 auto 60px", padding: "0 24px" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: "24px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Occupancy Rate</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
              {metrics ? `${metrics.occupancy?.occupancy_rate_percent}%` : "29%"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Real-time bed allocation</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Monthly Realization</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
              {metrics ? `₹${metrics.financials?.total_collected?.toLocaleString()}` : "₹31,000"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Ledger collection audit</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Residents</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {metrics ? metrics.counts?.active_tenants : "3"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Verified lease agreements</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Safety Gates</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706", marginTop: 4 }}>
              {metrics ? metrics.counts?.pending_approvals : "1"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Human approvals required</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. SEVEN SPECIALIZED AGENTS */}
      {/* ------------------------------------------------------------- */}
      <section id="agents" style={{ maxWidth: 1160, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>
            The 7 Specialized Autonomous Agents
          </h2>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 640, margin: "0 auto" }}>
            Each agent has designated domain responsibilities, authoritative tools, and strict supervisory oversight.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {[
            {
              id: "orchestrator",
              icon: "👑",
              name: "Central Orchestrator Agent",
              owner: "Sashank Karn",
              color: "#7c3aed",
              desc: "Workflow dependency graph synthesis, multi-agent dispatch, error retry policies, and platform audit logging.",
            },
            {
              id: "leasing",
              icon: "🎯",
              name: "Lead & Leasing Agent",
              owner: "Sonali Gupta",
              color: "#2563eb",
              desc: "Prospective tenant matching, budget filtering, property tour visit scheduling, and conversion analytics.",
            },
            {
              id: "tenant_support",
              icon: "💬",
              name: "Tenant Support Agent",
              owner: "Sonali Gupta / Prabin Yadav",
              color: "#0891b2",
              desc: "Resident inquiries, 15-day move-out notice intake, and automated complaint SLA classification.",
            },
            {
              id: "maintenance",
              icon: "🔧",
              name: "Maintenance & Vendor Agent",
              owner: "Prabin Yadav",
              color: "#ea580c",
              desc: "Work order triage, contractor scoring matrix, repair cost estimation, and room turnover inspections.",
            },
            {
              id: "collections",
              icon: "💳",
              name: "Rent & Collections Agent",
              owner: "Adarsh Jha",
              color: "#16a34a",
              desc: "Rent ledger auditing, late fee assessment, WhatsApp UPI reminders, and 30-day cashflow forecasting.",
            },
            {
              id: "vacancy_revenue",
              icon: "📈",
              name: "Vacancy & Revenue Agent",
              owner: "Adarsh Jha",
              color: "#ca8a04",
              desc: "Downtime revenue loss calculations, priority relisting queues, and real-time portfolio occupancy tracking.",
            },
            {
              id: "facilitator",
              icon: "🛡️",
              name: "Facilitator & Verification Agent",
              owner: "Sashank Karn",
              color: "#475569",
              desc: "Supervisory compliance, constraint validation, cross-agent data consistency, and validation scoring.",
            },
          ].map((a) => (
            <div
              key={a.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 24,
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: a.color, fontWeight: 600 }}>Lead: {a.owner}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. CORE WORKFLOWS & INTEGRATIONS */}
      {/* ------------------------------------------------------------- */}
      <section id="features" style={{ maxWidth: 1160, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>
            Operational Autonomy with Human Governance
          </h2>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 640, margin: "0 auto" }}>
            StayOps coordinates end-to-end PG operations without repetitive manual tasks.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>15-Day Move-Out Automation</h3>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              When a resident logs notice, Tenant Support notifies the Orchestrator. Maintenance schedules turnover inspection, Collections audits remaining dues and deposit deductions, and Vacancy Agent immediately queues the bed for relisting.
            </p>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>📱</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>WhatsApp Business Cloud API (v25.0)</h3>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              Live messaging via Meta Graph API v25.0 for payment receipts, rent reminders, inspection bookings, and webhooks for real-time incoming resident message ingestion with developer simulation mode.
            </p>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Human-in-the-Loop Safety Gates</h3>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              Agents cannot incur financial liabilities arbitrarily. Actions above ₹2,000 (such as major emergency repairs or deposit refunds) automatically enter the pending approval queue for property manager sign-off.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. CALL TO ACTION & FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer
        id="health"
        style={{
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <StayOpsLogo size={42} />
          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 14 }}>
            Experience StayOps AI in Action
          </h3>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            Try the multi-agent dashboard or sign in with your verified administrator account.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32 }}>
            <Link
              href="/dashboard"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "10px 22px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Open Operations Dashboard →
            </Link>
            <Link
              href="/login"
              style={{
                background: "#f1f5f9",
                color: "#334155",
                padding: "10px 20px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                border: "1px solid #cbd5e1",
              }}
            >
              Sign In to Account
            </Link>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            StayOps AI © 2026. Built by Sashank Karn, Sonali Gupta, Prabin Yadav, and Adarsh Jha.
          </div>
        </div>
      </footer>
    </div>
  );
}

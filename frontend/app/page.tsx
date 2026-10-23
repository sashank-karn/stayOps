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
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("stayops_user");
      if (stored) {
        setLoggedInUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("stayops_user");
      localStorage.removeItem("stayops_token");
    } catch {}
    setLoggedInUser(null);
  };
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [mRes, iRes, pRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/metrics`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/integrations/status`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/api/properties`).then((r) => (r.ok ? r.json() : [])),
        ]);
        setMetrics(mRes);
        setIntegrations(iRes);
        setProperties(pRes);
      } catch (err) {
        console.error("Failed to load landing stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

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
            {loggedInUser ? (
              <>
                <Link
                  href="/dashboard"
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>⚡</span>
                  <span>
                    {loggedInUser.role === "admin"
                      ? "Admin Console"
                      : loggedInUser.role === "tenant"
                      ? "Resident Hub"
                      : "Manager Hub"}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#ffffff",
                    border: "1px solid #fee2e2",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
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
            href="/login"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              color: "#ffffff",
              padding: "14px 30px",
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
            <span>Sign In to StayOps</span>
            <span>→</span>
          </Link>

          <a
            href="#architecture"
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
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Explore 7-Agent Architecture</span>
            <span style={{ fontSize: 12 }}>↓</span>
          </a>
        </div>

        {/* Enterprise Security & Trust Ribbon */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "16px 24px",
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: 16,
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 }}>
            <span style={{ color: "#16a34a", fontSize: 16 }}>🛡️</span> Enterprise Data Isolation
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 }}>
            <span style={{ color: "#2563eb", fontSize: 16 }}>⚡</span> 7 Autonomous AI Agents
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 }}>
            <span style={{ color: "#7c3aed", fontSize: 16 }}>📱</span> Meta WhatsApp Cloud API v25.0
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 }}>
            <span style={{ color: "#f59e0b", fontSize: 16 }}>🔒</span> Human-in-the-Loop Safety Gates
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
              {metrics?.occupancy?.occupancy_rate_percent !== undefined ? `${metrics.occupancy.occupancy_rate_percent}%` : "82.4%"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {metrics?.occupancy?.occupied_beds !== undefined ? `${metrics.occupancy.occupied_beds}/${metrics.occupancy.total_beds} beds allocated` : "Real-time bed allocation"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Monthly Realization</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
              {metrics?.financials?.total_collected !== undefined ? `₹${metrics.financials.total_collected.toLocaleString('en-IN')}` : "₹31,000"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Audited ledger collection</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Residents</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {metrics?.counts?.active_tenants !== undefined ? metrics.counts.active_tenants : "9"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Verified digital leases</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Safety Gates</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: (metrics?.counts?.pending_approvals ?? 0) > 0 ? "#d97706" : "#16a34a", marginTop: 4 }}>
              {metrics?.counts?.pending_approvals !== undefined ? metrics.counts.pending_approvals : "0"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {(metrics?.counts?.pending_approvals ?? 0) > 0 ? `${metrics.counts.pending_approvals} pending (> ₹5,000)` : "Human-in-the-loop active"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Managed Properties</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>
              {properties.length > 0 ? properties.length : "3"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Bengaluru &amp; Pune Hubs</div>
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
              tag: "Autonomous Multi-Agent Bus",
              color: "#7c3aed",
              desc: "Workflow dependency graph synthesis, multi-agent dispatch, error retry policies, and platform audit logging.",
            },
            {
              id: "leasing",
              icon: "🎯",
              name: "Lead & Leasing Agent",
              tag: "Inventory Matching & Outreach",
              color: "#2563eb",
              desc: "Prospective tenant matching, budget filtering, property tour visit scheduling, and conversion analytics.",
            },
            {
              id: "tenant_support",
              icon: "💬",
              name: "Tenant Support Agent",
              tag: "Resident Concierge & Notice",
              color: "#0891b2",
              desc: "Resident inquiries, 15-day move-out notice intake, and automated complaint SLA classification.",
            },
            {
              id: "maintenance",
              icon: "🔧",
              name: "Maintenance & Vendor Agent",
              tag: "Work Orders & Vendor Ranking",
              color: "#ea580c",
              desc: "Work order triage, contractor scoring matrix, repair cost estimation, and room turnover inspections.",
            },
            {
              id: "collections",
              icon: "💳",
              name: "Rent & Collections Agent",
              tag: "Ledgers & Automated Reminders",
              color: "#16a34a",
              desc: "Rent ledger auditing, late fee assessment, WhatsApp UPI reminders, and 30-day cashflow forecasting.",
            },
            {
              id: "vacancy_revenue",
              icon: "📈",
              name: "Vacancy & Revenue Agent",
              tag: "Occupancy & Revenue Recovery",
              color: "#ca8a04",
              desc: "Downtime revenue loss calculations, priority relisting queues, and real-time portfolio occupancy tracking.",
            },
            {
              id: "facilitator",
              icon: "🛡️",
              name: "Facilitator & Verification Agent",
              tag: "Compliance & Safety Gate Auditor",
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
                  <div style={{ fontSize: 11, color: a.color, fontWeight: 600 }}>{a.tag}</div>
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

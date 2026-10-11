"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("moveout_demo");
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Move-out Demo state
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [demoNoticeDays, setDemoNoticeDays] = useState<number>(15);
  const [moveOutResult, setMoveOutResult] = useState<any>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<boolean>(false);

  // Lead inquiry form state
  const [leadForm, setLeadForm] = useState({
    full_name: "",
    phone: "",
    budget: 12000,
    preferred_location: "Bengaluru",
    preferred_room_type: "Double",
  });
  const [leadInquiryResult, setLeadInquiryResult] = useState<any>(null);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, mRes, pRes, tRes, lRes, tkRes, aRes, wRes] = await Promise.all([
        fetch(`${API_URL}/health`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/dashboard/metrics`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/properties`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/tenants`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/leads`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/tickets`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/approvals`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/workflows`).then((r) => r.json()).catch(() => []),
      ]);

      setHealth(hRes);
      setMetrics(mRes);
      setProperties(pRes || []);
      setTenants(tRes || []);
      setLeads(lRes || []);
      setTickets(tkRes || []);
      setApprovals(aRes || []);
      setWorkflows(wRes || []);

      if (tRes && tRes.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tRes[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger 15-day move-out workflow
  const triggerMoveOutDemo = async () => {
    if (!selectedTenantId) return;
    setRunningWorkflow(true);
    setMoveOutResult(null);
    try {
      const res = await fetch(`${API_URL}/api/workflows/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          notice_days: demoNoticeDays,
          reason: "Relocating for professional advancement",
        }),
      });
      const data = await res.json();
      setMoveOutResult(data);
      fetchData(); // Refresh counts and approvals
    } catch (err) {
      console.error("Workflow trigger error:", err);
    } finally {
      setRunningWorkflow(false);
    }
  };

  // Submit new lead inquiry
  const submitLeadInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/workflows/lead-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const data = await res.json();
      setLeadInquiryResult(data);
      fetchData();
    } catch (err) {
      console.error("Lead inquiry error:", err);
    }
  };

  // Human-in-the-loop review
  const handleApproval = async (approvalId: string, action: "approved" | "rejected") => {
    try {
      await fetch(`${API_URL}/api/approvals/${approvalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewed_by: "Property Manager" }),
      });
      fetchData();
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b1020", color: "#e8ecf5" }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#11182c",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
              StayOps AI <span style={{ fontSize: 12, color: "#9aa7bd", fontWeight: 400 }}>· Team Synexis</span>
            </div>
            <div style={{ fontSize: 12, color: "#9aa7bd" }}>Autonomous PG &amp; Co-Living Multi-Agent Platform</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: health?.status === "ok" ? "#10b981" : "#ef4444",
                boxShadow: health?.status === "ok" ? "0 0 10px #10b981" : "none",
              }}
            />
            <span>Backend: {health?.status === "ok" ? "Operational" : "Offline"}</span>
          </div>
          <span className="badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c084fc" }}>
            7 Specialized Agents Active
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* KPI Summary Cards */}
        {metrics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div className="card" style={{ marginTop: 0, padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Occupancy Rate
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#60a5fa" }}>
                {metrics.occupancy?.occupancy_rate_percent}%
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {metrics.occupancy?.occupied_beds} / {metrics.occupancy?.total_beds} Beds Active
              </div>
            </div>

            <div className="card" style={{ marginTop: 0, padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Monthly Collected
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#34d399" }}>
                ₹{metrics.financials?.total_collected?.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Rate: {metrics.financials?.collection_rate_percent}% Billed
              </div>
            </div>

            <div className="card" style={{ marginTop: 0, padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Overdue Dues
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#f87171" }}>
                ₹{metrics.financials?.total_outstanding?.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Requires Collections Escalation</div>
            </div>

            <div className="card" style={{ marginTop: 0, padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Active Residents
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#e8ecf5" }}>
                {metrics.counts?.active_tenants}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {metrics.counts?.notice_tenants} On Move-Out Notice
              </div>
            </div>

            <div className="card" style={{ marginTop: 0, padding: 18 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Pending Approvals
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginTop: 4,
                  color: metrics.counts?.pending_approvals > 0 ? "#fbbf24" : "#9aa7bd",
                }}
              >
                {metrics.counts?.pending_approvals}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Human Safety Gates</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: 12,
            marginBottom: 24,
            overflowX: "auto",
          }}
        >
          {[
            { id: "moveout_demo", label: "★ 15-Day Move-Out Multi-Agent Demo" },
            { id: "inventory", label: "Properties & Rooms" },
            { id: "tenants", label: "Tenants & Leases" },
            { id: "leads", label: "Leads Pipeline & Enquiry" },
            { id: "maintenance", label: "Maintenance & Vendors" },
            { id: "approvals", label: `Approval Queue (${approvals.filter((a) => a.status === "pending").length})` },
            { id: "workflows", label: "Agent Task Audit Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: activeTab === tab.id ? "rgba(91, 140, 255, 0.2)" : "transparent",
                color: activeTab === tab.id ? "#93c5fd" : "#9aa7bd",
                border: activeTab === tab.id ? "1px solid rgba(91, 140, 255, 0.4)" : "1px solid transparent",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: 15-Day Move-Out Demonstration                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "moveout_demo" && (
          <div>
            <div className="card" style={{ marginTop: 0, border: "1px solid rgba(91, 140, 255, 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px 0", fontSize: 20 }}>
                    Multi-Agent Scenario: Resident 15-Day Move-Out Notice
                  </h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, maxWidth: 750 }}>
                    Demonstrates autonomous coordination approved by faculty: Tenant Support validates notice →
                    Parallel execution of Vacancy Recovery &amp; Rent Auditing → Sequential Lead outreach by Leasing Agent →
                    Maintenance turnover scheduling → Supervisory verification by Facilitator Agent.
                  </p>
                </div>
                <span className="badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                  Autonomous Coordination
                </span>
              </div>

              {/* Trigger controls */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-end",
                  marginTop: 20,
                  padding: "16px",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                    Select Resident submitting move-out notice:
                  </label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#1e293b",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.property_name} · Room {t.room_number}) · Status: {t.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: 140 }}>
                  <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                    Notice Days:
                  </label>
                  <input
                    type="number"
                    value={demoNoticeDays}
                    onChange={(e) => setDemoNoticeDays(Number(e.target.value))}
                    min={1}
                    max={90}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#1e293b",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </div>

                <button
                  onClick={triggerMoveOutDemo}
                  disabled={runningWorkflow}
                  style={{
                    backgroundColor: runningWorkflow ? "#475569" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 24px",
                    fontWeight: 700,
                    cursor: runningWorkflow ? "not-allowed" : "pointer",
                    fontSize: 14,
                    boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {runningWorkflow ? "Coordinating Agents…" : "▶ Execute Move-Out Workflow"}
                </button>
              </div>

              {/* Execution Progress & Output Timeline */}
              {moveOutResult && (
                <div style={{ marginTop: 28 }}>
                  <h3 style={{ fontSize: 17, marginBottom: 16 }}>Execution Audit Trail &amp; Agent Handoffs</h3>

                  {/* Flow Steps */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {moveOutResult.timeline?.map((step: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "14px 18px",
                          borderRadius: 10,
                          backgroundColor: step.is_parallel ? "rgba(139, 92, 246, 0.12)" : "rgba(255,255,255,0.04)",
                          borderLeft: step.is_parallel ? "4px solid #a855f7" : "4px solid #3b82f6",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Step {step.step}:</span>
                            <span
                              className="badge"
                              style={{
                                background: step.is_parallel ? "rgba(168, 85, 247, 0.25)" : "rgba(59, 130, 246, 0.2)",
                                color: step.is_parallel ? "#c084fc" : "#93c5fd",
                              }}
                            >
                              {Array.isArray(step.agents) ? step.agents.join(" + ") : step.agent}
                            </span>
                            {step.is_parallel && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#c084fc",
                                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                }}
                              >
                                ⚡ EXECUTED IN PARALLEL
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13.5, color: "#e2e8f0", marginTop: 4 }}>{step.action}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{step.duration_ms} ms</div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Agent Result Cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 16,
                      marginTop: 24,
                    }}
                  >
                    {/* Collections Agent Output */}
                    <div className="card" style={{ marginTop: 0, padding: 18, backgroundColor: "#172036" }}>
                      <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700 }}>
                        Rent &amp; Collections Agent
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Ledger Audit &amp; Settlement</div>
                      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        <div>
                          Outstanding Rent:{" "}
                          <strong style={{ color: moveOutResult.rent_status?.outstanding_balance > 0 ? "#f87171" : "#34d399" }}>
                            ₹{moveOutResult.rent_status?.outstanding_balance?.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          Security Deposit: ₹{moveOutResult.rent_status?.security_deposit?.toLocaleString()}
                        </div>
                        <div>
                          Net Refund / Dues:{" "}
                          <strong style={{ color: "#34d399" }}>
                            ₹{moveOutResult.rent_status?.net_deposit_settlement?.toLocaleString()}
                          </strong>
                        </div>
                        <div style={{ color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>
                          {moveOutResult.rent_status?.recommendation}
                        </div>
                      </div>
                    </div>

                    {/* Vacancy & Revenue Agent Output */}
                    <div className="card" style={{ marginTop: 0, padding: 18, backgroundColor: "#172036" }}>
                      <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>
                        Vacancy &amp; Revenue Recovery Agent
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Downtime Mitigation</div>
                      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        <div>
                          Daily Revenue Risk:{" "}
                          <strong style={{ color: "#fbbf24" }}>
                            ₹{moveOutResult.vacancy_recovery?.daily_revenue_risk}/day
                          </strong>
                        </div>
                        <div>
                          Projected 30-Day Loss: ₹{moveOutResult.vacancy_recovery?.projected_30d_loss?.toLocaleString()}
                        </div>
                        <div>
                          Pipeline Matches:{" "}
                          <strong style={{ color: "#34d399" }}>
                            {moveOutResult.vacancy_recovery?.matched_lead_count} Qualified Leads
                          </strong>
                        </div>
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>
                          Top Lead: {moveOutResult.vacancy_recovery?.matched_leads?.[0]?.name} (Score:{" "}
                          {moveOutResult.vacancy_recovery?.matched_leads?.[0]?.match_score}%)
                        </div>
                      </div>
                    </div>

                    {/* Lead & Leasing Agent Output */}
                    <div className="card" style={{ marginTop: 0, padding: 18, backgroundColor: "#172036" }}>
                      <div style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                        Lead &amp; Leasing Agent
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Outreach &amp; Visit Proposals</div>
                      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        <div>Proposals Prepared: {moveOutResult.leasing_proposals?.proposal_count}</div>
                        {moveOutResult.leasing_proposals?.prepared_proposals?.map((p: any, i: number) => (
                          <div key={i} style={{ marginTop: 8, padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                            <strong>{p.lead_name}:</strong> &ldquo;{p.draft_message}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Facilitator Supervisory Output */}
                    <div className="card" style={{ marginTop: 0, padding: 18, backgroundColor: "#172036" }}>
                      <div style={{ fontSize: 12, color: "#f472b6", fontWeight: 700 }}>
                        Monitoring &amp; Facilitator Agent
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Supervisory Verification</div>
                      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        <div>
                          Status:{" "}
                          <span
                            className="badge"
                            style={{
                              background: moveOutResult.facilitator_verification?.is_healthy
                                ? "rgba(16,185,129,0.2)"
                                : "rgba(239,68,68,0.2)",
                              color: moveOutResult.facilitator_verification?.is_healthy ? "#34d399" : "#f87171",
                            }}
                          >
                            {moveOutResult.facilitator_verification?.facilitator_status}
                          </span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          {moveOutResult.facilitator_verification?.checks_passed?.map((chk: string, i: number) => (
                            <div key={i} style={{ color: "#94a3b8", fontSize: 12 }}>
                              ✓ {chk}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: Properties & Rooms                                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "inventory" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {properties.map((p) => (
              <div key={p.id} className="card" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{p.name}</h3>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{p.address}, {p.city}</div>
                  </div>
                  <span className="badge">{p.code}</span>
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Capacity:</span> <strong>{p.total_beds} Beds</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Available:</span>{" "}
                    <strong style={{ color: "#34d399" }}>{p.available_beds} Beds</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Floors:</span> <strong>{p.total_floors}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>House Rules:</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>{p.rules_summary}</div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {p.amenities?.map((a: string, i: number) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 6 }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: Tenants & Leases                                       */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "tenants" && (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Resident Directory &amp; Active Leases</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "10px 8px" }}>Tenant Name</th>
                  <th style={{ padding: "10px 8px" }}>Property</th>
                  <th style={{ padding: "10px 8px" }}>Room / Bed</th>
                  <th style={{ padding: "10px 8px" }}>Monthly Rent</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.full_name}</td>
                    <td style={{ padding: "12px 8px", color: "#94a3b8" }}>{t.property_name}</td>
                    <td style={{ padding: "12px 8px" }}>Room {t.room_number} ({t.bed_label})</td>
                    <td style={{ padding: "12px 8px" }}>₹{t.monthly_rent?.toLocaleString()}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        className="badge"
                        style={{
                          background: t.status === "notice" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                          color: t.status === "notice" ? "#f87171" : "#34d399",
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: Leads Pipeline & Enquiry Form                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "leads" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Active Prospective Leads</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {leads.map((l) => (
                  <div key={l.id} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{l.full_name}</strong>
                      <span className="badge">{l.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                      Budget: ₹{l.budget?.toLocaleString()} · {l.preferred_location} · {l.preferred_room_type} Room
                    </div>
                    {l.notes && <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{l.notes}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Submit New Tenant Enquiry (Leasing Agent)</h3>
              <form onSubmit={submitLeadInquiry} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={leadForm.full_name}
                    onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1e293b", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1e293b", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Budget (INR)</label>
                    <input
                      type="number"
                      value={leadForm.budget}
                      onChange={(e) => setLeadForm({ ...leadForm, budget: Number(e.target.value) })}
                      style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1e293b", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Room Type</label>
                    <select
                      value={leadForm.preferred_room_type}
                      onChange={(e) => setLeadForm({ ...leadForm, preferred_room_type: e.target.value })}
                      style={{ width: "100%", padding: 10, borderRadius: 8, background: "#1e293b", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Triple">Triple</option>
                    </select>
                  </div>
                </div>

                <button type="submit" style={{ padding: "11px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                  Match Available Rooms via Leasing Agent
                </button>
              </form>

              {leadInquiryResult && (
                <div style={{ marginTop: 16, padding: 12, background: "rgba(16,185,129,0.15)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)" }}>
                  <div style={{ fontWeight: 700, color: "#34d399", fontSize: 14 }}>Leasing Agent Response:</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{leadInquiryResult.agent_response}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: Maintenance & Vendors                                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "maintenance" && (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Maintenance Tickets &amp; Trade Vendor Assignments</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tickets.map((tk) => (
                <div key={tk.id} style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{tk.title}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                      Category: {tk.category} · Assigned Vendor: <strong style={{ color: "#e2e8f0" }}>{tk.vendor_name}</strong> · Est: ₹{tk.estimated_cost?.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge">{tk.severity}</span>
                    <span className="badge" style={{ background: tk.status === "resolved" ? "rgba(16,185,129,0.2)" : "rgba(251,191,36,0.2)", color: tk.status === "resolved" ? "#34d399" : "#fbbf24" }}>
                      {tk.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: Approval Queue                                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "approvals" && (
          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Human-in-the-Loop Safety Approvals</h3>
              <span className="badge">Configured Cost Threshold: ₹2,000 INR</span>
            </div>

            {approvals.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No pending approvals. Actions under ₹2,000 execute automatically.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {approvals.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: 18,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ fontSize: 15 }}>{a.description}</strong>
                        <span className="badge" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                          Est Cost: ₹{a.estimated_cost?.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                        Agent: {a.agent_name} · Action: {a.action_type} · Status: <strong>{a.status}</strong>
                      </div>
                    </div>

                    {a.status === "pending" ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => handleApproval(a.id, "approved")}
                          style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(a.id, "rejected")}
                          style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="badge" style={{ background: a.status === "approved" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: a.status === "approved" ? "#34d399" : "#f87171" }}>
                        {a.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: Agent Task Audit Log                                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "workflows" && (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Multi-Agent Execution History</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {workflows.map((wf) => (
                <div key={wf.id} style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 15 }}>{wf.workflow_type}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>{wf.created_at}</span>
                    </div>
                    <span className="badge">{wf.status}</span>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {wf.tasks?.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: t.is_parallel ? "rgba(168,85,247,0.2)" : "rgba(59,130,246,0.15)",
                          color: t.is_parallel ? "#c084fc" : "#93c5fd",
                        }}
                      >
                        {t.receiver_agent}: {t.task_type} {t.is_parallel && "⚡"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

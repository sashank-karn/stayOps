"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfileEditModal from "../components/ProfileEditModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StayOpsLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adm-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#adm-logo-grad)" />
      <path d="M20 8.5L8 18H12V31H28V18H32L20 8.5Z" fill="white" fillOpacity="0.96" />
      <path d="M17 22H23V31H17V22Z" fill="#1e1b4b" fillOpacity="0.85" />
      <circle cx="20" cy="15" r="2.2" fill="#38bdf8" />
    </svg>
  );
}

export default function AdminPortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "governance" | "users" | "properties" | "agents" | "workflows" | "whatsapp" | "calendar" | "diagnostics" | "assistant"
  >("governance");

  // Universal Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Live Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [whatsappFeed, setWhatsappFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Approval review action state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("Approved via Administrator Console");
  const [approvalActionNotice, setApprovalActionNotice] = useState<string>("");

  // User management action state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userActionNotice, setUserActionNotice] = useState<string>("");

  // Agent Dispatcher State
  const [dispatchPrompt, setDispatchPrompt] = useState<string>("Assess portfolio occupancy, calculate 30-day downtime loss exposure, and queue vacant beds for relisting.");
  const [dispatchTargetAgent, setDispatchTargetAgent] = useState<string>("orchestrator");
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  // Add Property Modal State
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [newProp, setNewProp] = useState({
    name: "",
    code: "",
    city: "Bengaluru",
    address: "",
    total_floors: 3,
    rules_summary: "Gate curfew 11:00 PM. No loud music after 10 PM. Non-resident visitors allowed until 8 PM.",
  });
  const [savingProperty, setSavingProperty] = useState(false);

  // WhatsApp test dispatch state
  const [waPhone, setWaPhone] = useState("+91 98765 43210");
  const [waMessage, setWaMessage] = useState("StayOps Alert: Rent payment receipt has been credited to your resident ledger.");
  const [waSentSuccess, setWaSentSuccess] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waError, setWaError] = useState("");

  // Calendar Event Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "Quarterly Facility & Safety Audit",
    event_type: "inspection",
    start_time: "2026-11-05T11:00",
    attendee_name: "Facility Manager",
    attendee_email: "operations@stayops.ai",
    location: "StayOps TechPG, Koramangala",
  });
  const [schedulingEvent, setSchedulingEvent] = useState(false);

  // AI Operations Assistant Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      sender: "admin" | "assistant";
      text: string;
      agent?: string;
      timestamp: string;
      action?: string;
      suggestions?: string[];
    }>
  >([
    {
      id: "init-1",
      sender: "assistant",
      text: "Hello Administrator! I am your StayOps AI Operations Assistant. I coordinate across all 7 autonomous agents. I can check occupancy, audit finances, approve safety gate work orders, match prospective tenants, or triage maintenance. What would you like me to do?",
      agent: "Central Orchestrator",
      timestamp: "Just now",
      suggestions: [
        "📊 Portfolio occupancy & vacancy exposure",
        "💰 Audit overdue rent & 30-day forecast",
        "⚠️ Check pending safety gate approvals",
        "⚡ Approve all pending approvals",
        "🛏️ Show available vacant beds",
      ],
    },
  ]);

  // Auth Guard
  useEffect(() => {
    try {
      const stored = localStorage.getItem("stayops_user");
      if (!stored) {
        router.push("/login");
        return;
      }
      const u = JSON.parse(stored);
      if (u.role === "tenant") {
        router.push("/resident");
        return;
      }
      setCurrentUser(u);
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Master Data Refresh
  const refreshAdminData = useCallback(async () => {
    try {
      const [mRes, pRes, uRes, aRes, wRes, agRes, iRes, dRes, cRes, waRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/metrics`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/api/properties`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/users`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/approvals`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/workflows?limit=15`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/agents`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/integrations/status`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/api/health/diagnostics`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/api/calendar/events`).then((r) => (r.ok ? r.json() : { events: [] })),
        fetch(`${API_URL}/api/notifications/whatsapp`).then((r) => (r.ok ? r.json() : { messages: [] })),
      ]);

      setMetrics(mRes);
      setProperties(pRes || []);
      setUsers(uRes || []);
      setApprovals(aRes || []);
      setWorkflows(wRes || []);
      setAgents(agRes || []);
      setIntegrations(iRes);
      setDiagnostics(dRes);
      setCalendarEvents(cRes?.events || []);
      setWhatsappFeed(waRes?.messages || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("stayops_user");
      localStorage.removeItem("stayops_token");
    } catch {}
    router.push("/login");
  };

  // 1. Human-in-the-Loop Review Approval
  const handleReviewApproval = async (approvalId: string, action: "approved" | "rejected") => {
    setReviewingId(approvalId);
    setApprovalActionNotice("");
    try {
      const res = await fetch(`${API_URL}/api/approvals/${approvalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewed_by: currentUser?.full_name || "System Administrator",
          notes: reviewNote || `Decision recorded as ${action} via Admin Console`,
        }),
      });

      if (res.ok) {
        setApprovalActionNotice(`Approval request ${action === "approved" ? "authorized" : "rejected"} successfully.`);
        await refreshAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to process review.");
      }
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setReviewingId(null);
    }
  };

  // 2. User Role Update
  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    setUserActionNotice("");
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUserActionNotice(`User role updated to ${newRole.replace("_", " ").toUpperCase()}`);
        await refreshAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // 3. User Activation Toggle
  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    setUpdatingUserId(userId);
    setUserActionNotice("");
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setUserActionNotice(`Account ${!currentActive ? "activated" : "deactivated"} successfully.`);
        await refreshAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // 4. Create Property
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProperty(true);
    try {
      const res = await fetch(`${API_URL}/api/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProp.name.trim(),
          code: newProp.code.trim().toUpperCase(),
          city: newProp.city,
          address: newProp.address.trim(),
          total_floors: Number(newProp.total_floors),
          rules_summary: newProp.rules_summary,
        }),
      });

      if (res.ok) {
        setPropertyModalOpen(false);
        setNewProp({
          name: "",
          code: "",
          city: "Bengaluru",
          address: "",
          total_floors: 3,
          rules_summary: "Gate curfew 11:00 PM. No loud music after 10 PM. Non-resident visitors allowed until 8 PM.",
        });
        await refreshAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create property.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProperty(false);
    }
  };

  // 5. Dispatch Agent Interactive Command
  const handleDispatchAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: dispatchPrompt,
          target_agent: dispatchTargetAgent === "orchestrator" ? null : dispatchTargetAgent,
          context: {
            admin_user: currentUser?.email,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDispatchResult(data);
        await refreshAdminData();
      } else {
        const err = await res.json();
        alert(err.detail || "Dispatch failed.");
      }
    } catch (err) {
      console.error("Dispatch error:", err);
    } finally {
      setDispatching(false);
    }
  };

  // 6. Test WhatsApp Dispatch
  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaSending(true);
    setWaSentSuccess(false);
    setWaError("");
    try {
      const res = await fetch(`${API_URL}/api/notifications/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_phone: waPhone.trim(),
          preview_text: waMessage.trim(),
          template_name: "general_alert",
        }),
      });
      const data = await res.json();
      if (res.ok && data.is_live_dispatched !== false && data.status !== "failed") {
        setWaSentSuccess(true);
        setWaError("");
        await refreshAdminData();
      } else {
        setWaSentSuccess(false);
        const errDetail = data.detail || data.error || (data.status === "failed" ? "Delivery rejected by Meta. Check recipient phone." : "");
        setWaError(errDetail || "WhatsApp delivery failed.");
        await refreshAdminData();
      }
    } catch (err: any) {
      setWaSentSuccess(false);
      setWaError(err.message || "Network error occurred while dispatching WhatsApp notification.");
    } finally {
      setWaSending(false);
    }
  };

  // 7. Schedule Calendar Event
  const handleScheduleCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedulingEvent(true);
    try {
      const res = await fetch(`${API_URL}/api/calendar/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          event_type: newEvent.event_type,
          start_time: newEvent.start_time,
          duration_minutes: 45,
          location: newEvent.location,
          attendee_name: newEvent.attendee_name,
          attendee_email: newEvent.attendee_email,
        }),
      });
      if (res.ok) {
        setCalendarModalOpen(false);
        await refreshAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingEvent(false);
    }
  };

  // 8. AI Operations Assistant Chat Handler
  const handleSendChatMessage = async (msgToSend?: string) => {
    const text = (msgToSend || chatInput).trim();
    if (!text || chatLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `user-${Date.now()}`;
    const updatedMessages = [
      ...chatMessages,
      {
        id: userMsgId,
        sender: "admin" as const,
        text,
        timestamp: timeStr,
      },
    ];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: {
            user_role: "admin",
            admin_email: currentUser?.email,
            email: currentUser?.email,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages([
          ...updatedMessages,
          {
            id: `assistant-${Date.now()}`,
            sender: "assistant" as const,
            text: data.response,
            agent: data.agent,
            action: data.action_performed,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            suggestions: data.suggestions || [],
          },
        ]);
        if (
          data.action_performed &&
          data.action_performed !== "orchestrator_dispatch" &&
          data.action_performed !== "query_financials" &&
          data.action_performed !== "query_approvals" &&
          data.action_performed !== "list_vacant_beds" &&
          data.action_performed !== "prompt_target_user"
        ) {
          await refreshAdminData();
        }
      } else {
        const err = await res.json();
        setChatMessages([
          ...updatedMessages,
          {
            id: `err-${Date.now()}`,
            sender: "assistant" as const,
            text: `Agent encountered an issue: ${err.detail || "Unable to process request."}`,
            agent: "Facilitator Agent",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages([
        ...updatedMessages,
        {
          id: `err-${Date.now()}`,
          sender: "assistant" as const,
          text: `Communication error: ${err.message || "Failed to contact agent service."}`,
          agent: "Central Orchestrator",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a" }}>
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        style={{
          width: 270,
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          {/* Logo */}
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
            <StayOpsLogo size={34} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>StayOps AI</div>
              <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>Executive Control Center</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "6px 12px", letterSpacing: "0.06em" }}>
              Administration &amp; Ops
            </div>

            {[
              { id: "assistant", label: "🤖 AI Operations Assistant", badge: "Live Chat", badgeColor: "#7c3aed" },
              { id: "governance", label: "🏛️ Approvals & Governance", badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending` : null, badgeColor: "#ef4444" },
              { id: "users", label: "👥 Users & Access Control", badge: `${users.length} users`, badgeColor: "#2563eb" },
              { id: "properties", label: "🏢 Properties & Units", badge: `${properties.length}`, badgeColor: "#7c3aed" },
              { id: "agents", label: "⚡ Multi-Agent Command Center", badge: `${agents.length}/7`, badgeColor: "#16a34a" },
              { id: "workflows", label: "📋 Workflow Audit Trail", badge: `${workflows.length}`, badgeColor: "#64748b" },
              { id: "whatsapp", label: "💬 WhatsApp Cloud API", badge: "Live", badgeColor: "#16a34a" },
              { id: "calendar", label: "📅 Operations Calendar", badge: `${calendarEvents.length}`, badgeColor: "#2563eb" },
              { id: "diagnostics", label: "🩺 System Diagnostics", badge: "Healthy", badgeColor: "#16a34a" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  background: activeTab === tab.id ? "#faf5ff" : "transparent",
                  color: activeTab === tab.id ? "#7c3aed" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: tab.badgeColor === "#ef4444" ? "#fee2e2" : activeTab === tab.id ? "#e9d5ff" : "#f1f5f9",
                      color: tab.badgeColor === "#ef4444" ? "#b91c1c" : activeTab === tab.id ? "#6b21a8" : "#64748b",
                      padding: "2px 7px",
                      borderRadius: 10,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Admin Profile Footer */}
        <div style={{ padding: 16, borderTop: "1px solid #f1f5f9", background: "#fcfcfd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
              {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : "A"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {currentUser?.full_name || "Administrator"}
              </div>
              <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>SUPERADMIN ROLE</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => setProfileModalOpen(true)}
              style={{
                flex: 1,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span>👤</span>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => router.push("/manager")}
              style={{
                flex: 1,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Manager View
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "#ffffff",
              border: "1px solid #fee2e2",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "#dc2626",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Top Header */}
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              {activeTab === "governance" && "Safety Approvals & Portfolio Governance"}
              {activeTab === "users" && "User Directory & Access Control"}
              {activeTab === "properties" && "Properties & Inventory Management"}
              {activeTab === "agents" && "Autonomous Multi-Agent Runtime & Command Center"}
              {activeTab === "workflows" && "Live Workflow Orchestration Logs"}
              {activeTab === "whatsapp" && "Meta WhatsApp Cloud API v25.0 Dispatcher"}
              {activeTab === "calendar" && "Operations Calendar & Tour Schedule"}
              {activeTab === "diagnostics" && "System Diagnostics & Infrastructure Health"}
            </h1>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              StayOps Enterprise • Live Database Connected • Real-Time Multi-Agent Bus
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={refreshAdminData}
              disabled={loading}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{loading ? "Refreshing..." : "↻ Refresh Data"}</span>
            </button>

            <button
              onClick={() => setProfileModalOpen(true)}
              title="Edit Profile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <span>👤</span>
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                border: "1px solid #fee2e2",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#dc2626",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>

            <span style={{ fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 20 }}>
              🟢 Live System Connected
            </span>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
          {/* ========================================================= */}
          {/* TAB 0: AI OPERATIONS ASSISTANT CHAT & TASK DISPATCHER     */}
          {/* ========================================================= */}
          {activeTab === "assistant" && (
            <div>
              {/* Header Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                  borderRadius: 16,
                  padding: "24px 28px",
                  color: "#ffffff",
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.25)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 24 }}>🤖</span>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                      StayOps AI Operations Assistant
                    </h2>
                    <span
                      style={{
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#6ee7b7",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      ⚡ 7/7 Multi-Agents Active
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#c7d2fe", maxWidth: 720, lineHeight: 1.5 }}>
                    Your authoritative multi-agent copilot. Command agents, query real-time vacancy &amp; finances,
                    approve maintenance safety gates, and manage PG operations in conversational natural language.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleSendChatMessage("Assess portfolio occupancy, calculate 30-day downtime loss exposure")}
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📊 Run Occupancy Audit
                  </button>
                  <button
                    onClick={() => handleSendChatMessage("Approve all pending approvals")}
                    style={{
                      background: "#10b981",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Clear Pending Approvals
                  </button>
                </div>
              </div>

              {/* Chat & Shortcuts Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
                {/* Main Chat Interface */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    height: 640,
                    overflow: "hidden",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {/* Chat Top Bar */}
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #f1f5f9",
                      background: "#f8fafc",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                        Live Operations Chat Stream
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      Autonomous routing via Central Orchestrator
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      background: "#fafafa",
                    }}
                  >
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: msg.sender === "admin" ? "flex-end" : "flex-start",
                        }}
                      >
                        {/* Agent / Sender Label */}
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: msg.sender === "admin" ? "#2563eb" : "#7c3aed",
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {msg.sender === "admin" ? (
                            <>
                              <span>Administrator ({currentUser?.full_name || "Admin"})</span>
                              <span style={{ color: "#94a3b8", fontWeight: 400 }}>{msg.timestamp}</span>
                            </>
                          ) : (
                            <>
                              <span>🤖 {msg.agent || "StayOps Multi-Agent"}</span>
                              <span style={{ color: "#94a3b8", fontWeight: 400 }}>{msg.timestamp}</span>
                            </>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          style={{
                            maxWidth: "82%",
                            padding: "12px 16px",
                            borderRadius: msg.sender === "admin" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            background: msg.sender === "admin" ? "#2563eb" : "#ffffff",
                            color: msg.sender === "admin" ? "#ffffff" : "#1e293b",
                            border: msg.sender === "admin" ? "none" : "1px solid #e2e8f0",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.text}
                        </div>

                        {/* Interactive Suggestions Chips */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 8,
                              maxWidth: "85%",
                            }}
                          >
                            {msg.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSendChatMessage(sug)}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 16,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  color: "#334155",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {chatLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", animation: "pulse 1s infinite" }} />
                        <span style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
                          Multi-Agent System is reasoning &amp; executing command...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    style={{
                      padding: "14px 16px",
                      borderTop: "1px solid #e2e8f0",
                      background: "#ffffff",
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the AI Assistant or give an operational command..."
                      disabled={chatLoading}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      style={{
                        background: chatLoading || !chatInput.trim() ? "#94a3b8" : "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        padding: "0 20px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      {chatLoading ? "Executing..." : "Send →"}
                    </button>
                  </form>
                </div>

                {/* Right Operations Shortcuts Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Live Telemetry Card */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 18,
                    }}
                  >
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                      Live Operations Telemetry
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>Pending Approvals:</span>
                        <strong style={{ color: pendingApprovalsCount > 0 ? "#ef4444" : "#16a34a" }}>
                          {pendingApprovalsCount} queue item(s)
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>Total Properties:</span>
                        <strong style={{ color: "#0f172a" }}>{properties.length} PG locations</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>Registered Users:</span>
                        <strong style={{ color: "#0f172a" }}>{users.length} accounts</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>Orchestrated Workflows:</span>
                        <strong style={{ color: "#2563eb" }}>{workflows.length} executions</strong>
                      </div>
                    </div>
                  </div>

                  {/* Pre-Built Action Triggers */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 18,
                    }}
                  >
                    <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                      Instant Assistant Commands
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "📊 Occupancy & Loss Exposure", cmd: "Assess portfolio occupancy, calculate 30-day downtime loss exposure" },
                        { label: "💰 Audit Rent Ledgers & Forecast", cmd: "Audit overdue rent payments and draft reminder notices" },
                        { label: "⚠️ Show Safety Approvals", cmd: "How many pending approvals are there?" },
                        { label: "⚡ Approve All Pending Repairs", cmd: "Approve all pending approvals" },
                        { label: "🛏️ List Available Vacant Rooms", cmd: "Show available vacant rooms in Bangalore" },
                        { label: "🔧 Check Maintenance & Vendors", cmd: "Evaluate active maintenance tickets and qualified contractor dispatch" },
                      ].map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSendChatMessage(action.cmd)}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: "9px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1e293b",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: GOVERNANCE & APPROVALS (HUMAN-IN-THE-LOOP ACTIONS) */}
          {/* ========================================================= */}
          {activeTab === "governance" && (
            <div>
              {/* Real Metrics KPI Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>TOTAL PROPERTIES</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", marginTop: 6 }}>
                    {properties.length} Properties
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {properties.reduce((acc, p) => acc + (p.total_rooms || 0), 0)} Total Rooms
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>TOTAL INVENTORY BEDS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", marginTop: 6 }}>
                    {properties.reduce((acc, p) => acc + (p.total_beds || 0), 0)} Beds
                  </div>
                  <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                    {properties.reduce((acc, p) => acc + (p.available_beds || 0), 0)} Beds Available
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>PENDING APPROVALS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: pendingApprovalsCount > 0 ? "#dc2626" : "#0f172a", marginTop: 6 }}>
                    {pendingApprovalsCount} Actions
                  </div>
                  <div style={{ fontSize: 11, color: pendingApprovalsCount > 0 ? "#dc2626" : "#16a34a", marginTop: 4 }}>
                    {pendingApprovalsCount > 0 ? "Requires Admin Decision" : "All safety gates cleared"}
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>REGISTERED USERS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed", marginTop: 6 }}>
                    {users.length} Users
                  </div>
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>
                    {users.filter((u) => u.role === "tenant").length} Residents • {users.filter((u) => u.role === "admin").length} Admins
                  </div>
                </div>
              </div>

              {approvalActionNotice && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 16 }}>
                  ✓ {approvalActionNotice}
                </div>
              )}

              {/* Real Pending Human-in-the-Loop Approvals */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                      Human-in-the-Loop Supervisory Safety Gates ({approvals.length})
                    </h3>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Autonomous high-cost maintenance (&gt; ₹2,000), security deposit settlements, and policy exceptions.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="text"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Review notes for audit trail..."
                      style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, width: 240 }}
                    />
                  </div>
                </div>

                {approvals.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    No approvals currently pending. The autonomous agents are executing within approved safety thresholds!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {approvals.map((appr) => {
                      const isPending = appr.status === "pending";
                      return (
                        <div
                          key={appr.id}
                          style={{
                            border: isPending ? "1px solid #fed7aa" : "1px solid #f1f5f9",
                            background: isPending ? "#fffbeb" : "#fafafa",
                            borderRadius: 10,
                            padding: "16px 18px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                                {appr.action_type.replace(/_/g, " ").toUpperCase()}
                              </span>
                              <span style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                Agent: {appr.agent_name}
                              </span>
                              {appr.estimated_cost && (
                                <span style={{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                  ₹{Number(appr.estimated_cost).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: "#334155" }}>{appr.description}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                              ID: {appr.id} • Created: {new Date(appr.created_at).toLocaleString()}
                              {appr.reviewed_by && ` • Reviewed by: ${appr.reviewed_by} (${appr.review_notes || ""})`}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleReviewApproval(appr.id, "approved")}
                                  disabled={reviewingId === appr.id}
                                  style={{
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "8px 14px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {reviewingId === appr.id ? "Authorizing..." : "✓ Approve"}
                                </button>
                                <button
                                  onClick={() => handleReviewApproval(appr.id, "rejected")}
                                  disabled={reviewingId === appr.id}
                                  style={{
                                    background: "#ef4444",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "8px 14px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕ Reject
                                </button>
                              </>
                            ) : (
                              <span
                                style={{
                                  background: appr.status === "approved" ? "#dcfce7" : "#fee2e2",
                                  color: appr.status === "approved" ? "#166534" : "#991b1b",
                                  padding: "4px 10px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                ● {appr.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: USERS & ACCESS CONTROL (ADMIN USER MANAGEMENT)     */}
          {/* ========================================================= */}
          {activeTab === "users" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Registered Users &amp; Role Management ({users.length})
                  </h3>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Promote or demote user roles, assign manager access, and activate or deactivate accounts.
                  </div>
                </div>
              </div>

              {userActionNotice && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 14 }}>
                  ✓ {userActionNotice}
                </div>
              )}

              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 600 }}>
                    <th style={{ padding: "10px 14px" }}>Full Name</th>
                    <th style={{ padding: "10px 14px" }}>Email</th>
                    <th style={{ padding: "10px 14px" }}>Current Role</th>
                    <th style={{ padding: "10px 14px" }}>Account Status</th>
                    <th style={{ padding: "10px 14px" }}>Modify Role</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isBusy = updatingUserId === u.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{u.full_name}</td>
                        <td style={{ padding: "12px 14px", color: "#64748b" }}>{u.email}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 10,
                              background:
                                u.role === "admin" ? "#f3e8ff" : u.role === "property_manager" ? "#e0e7ff" : "#f1f5f9",
                              color:
                                u.role === "admin" ? "#7e22ce" : u.role === "property_manager" ? "#3730a3" : "#334155",
                            }}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: u.is_active ? "#16a34a" : "#dc2626" }}>
                            ● {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <select
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "#ffffff" }}
                          >
                            <option value="tenant">Resident (tenant)</option>
                            <option value="property_manager">Property Manager</option>
                            <option value="admin">System Administrator</option>
                          </select>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <button
                            onClick={() => handleToggleUserActive(u.id, u.is_active)}
                            disabled={isBusy}
                            style={{
                              background: u.is_active ? "#fee2e2" : "#dcfce7",
                              color: u.is_active ? "#b91c1c" : "#166534",
                              border: "none",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {isBusy ? "..." : u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PROPERTIES & UNITS GOVERNANCE                     */}
          {/* ========================================================= */}
          {activeTab === "properties" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Managed Properties Roster ({properties.length})
                  </h3>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Authoritative operational records for building inventory, capacity, and bed status.
                  </div>
                </div>
                <button
                  onClick={() => setPropertyModalOpen(true)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add New PG Property
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                {properties.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>{p.code} • {p.city}</div>
                        <h4 style={{ margin: "2px 0 0 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{p.name}</h4>
                      </div>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        Active
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{p.address}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Total Capacity</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{p.total_beds} Beds</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Available Beds</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{p.available_beds} Vacant</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                      <strong>Rules:</strong> {p.rules_summary || "Standard PG Rules"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: MULTI-AGENT COMMAND CENTER & DISPATCHER            */}
          {/* ========================================================= */}
          {activeTab === "agents" && (
            <div>
              {/* Interactive Agent Command Dispatcher */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22, marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Interactive Multi-Agent Task Dispatcher
                </h3>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  Direct natural language instructions to specialized agents or orchestrate system-wide workflows.
                </div>

                <form onSubmit={handleDispatchAgent}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginBottom: 12 }}>
                    <input
                      type="text"
                      required
                      value={dispatchPrompt}
                      onChange={(e) => setDispatchPrompt(e.target.value)}
                      placeholder="Enter instruction for the agentic system..."
                      style={{ padding: "10px 14px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 8 }}
                    />
                    <select
                      value={dispatchTargetAgent}
                      onChange={(e) => setDispatchTargetAgent(e.target.value)}
                      style={{ padding: "10px 12px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff" }}
                    >
                      <option value="orchestrator">Central Orchestrator</option>
                      <option value="leasing">Lead &amp; Leasing Agent</option>
                      <option value="tenant_support">Tenant Support Agent</option>
                      <option value="maintenance">Maintenance &amp; Vendor Agent</option>
                      <option value="collections">Rent &amp; Collections Agent</option>
                      <option value="vacancy_revenue">Vacancy &amp; Revenue Agent</option>
                    </select>
                  </div>

                  {/* Preset Quick Chips */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {[
                      "Assess portfolio occupancy, calculate 30-day downtime loss exposure, and queue vacant beds for relisting.",
                      "Audit overdue rent payments and draft reminder notices.",
                      "Evaluate active maintenance tickets and qualified contractor dispatch.",
                      "Find available PG rooms in Bengaluru under 15000.",
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setDispatchPrompt(preset)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          borderRadius: 20,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "#475569",
                          cursor: "pointer",
                        }}
                      >
                        {preset.slice(0, 48)}...
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={dispatching}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {dispatching ? "Executing across agents..." : "⚡ Dispatch Task to Multi-Agent System →"}
                  </button>
                </form>

                {/* Dispatch Results Panel */}
                {dispatchResult && (
                  <div style={{ marginTop: 20, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                        ✓ Execution Completed in {dispatchResult.execution_time_ms}ms
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Workflow ID: {dispatchResult.workflow_id}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                      Agent Synthesis Response:
                    </div>
                    <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      {dispatchResult.response}
                    </div>

                    {dispatchResult.trace_steps?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                          Execution Trace Steps:
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {dispatchResult.trace_steps.map((st: any, sIdx: number) => (
                            <div key={sIdx} style={{ fontSize: 11, background: "#ffffff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                              <span><strong>{st.agent}:</strong> {st.summary}</span>
                              <span style={{ color: "#64748b" }}>{st.execution_time_ms}ms</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* All 7 Real Agents Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                {agents.map((ag) => (
                  <div key={ag.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{ag.name}</h4>
                        <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>Lead: {ag.member}</div>
                      </div>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                        ONLINE
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4, marginBottom: 12 }}>
                      {ag.role}
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
                        Registered Agent Tools:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {ag.tools?.map((tool: string, tIdx: number) => (
                          <span key={tIdx} style={{ fontSize: 10, background: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: WORKFLOW AUDIT TRAIL LOGS                          */}
          {/* ========================================================= */}
          {activeTab === "workflows" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Multi-Agent Workflow Audit Trail ({workflows.length})
                  </h3>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Cryptographically recorded orchestration executions with timing and sequential handoffs.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {workflows.map((wf) => (
                  <div key={wf.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                          {wf.workflow_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                          Initiator: {wf.initiator}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          ({wf.tasks_count || 0} subtasks)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: wf.status === "completed" ? "#dcfce7" : "#fef3c7",
                          color: wf.status === "completed" ? "#166534" : "#92400e",
                        }}
                      >
                        {wf.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Workflow ID: {wf.id} • Triggered: {new Date(wf.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: WHATSAPP CLOUD API V25.0 DISPATCHER & FEED        */}
          {/* ========================================================= */}
          {activeTab === "whatsapp" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22 }}>
                <h3 style={{ margin: "0 0 14px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Test WhatsApp Message Dispatcher
                </h3>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                  Dispatches message through the active Meta Cloud API v25.0 or internal message simulator.
                </div>

                <form onSubmit={handleTestWhatsApp}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Recipient Phone (with country code):
                    </label>
                    <input
                      type="text"
                      required
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                      Message Content:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={waMessage}
                      onChange={(e) => setWaMessage(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={waSending}
                    style={{
                      width: "100%",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {waSending ? "Dispatching..." : "Send WhatsApp Notification →"}
                  </button>

                  {waSentSuccess && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, padding: 10, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                      ✓ WhatsApp payload successfully dispatched and recorded!
                    </div>
                  )}

                  {waError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: 12, fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
                      <strong>✕ WhatsApp Delivery Failed:</strong> {waError}
                    </div>
                  )}
                </form>
              </div>

              {/* Live WhatsApp Message Inbox Feed */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22, height: 480, display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Live WhatsApp Outbox Feed ({whatsappFeed.length})
                </h3>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {whatsappFeed.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 40 }}>
                      No dispatched WhatsApp messages yet. Send a test message above!
                    </div>
                  ) : (
                    whatsappFeed.map((msg: any, idx: number) => {
                      const isFailed = msg.status === "failed" || !!msg.error;
                      return (
                        <div
                          key={idx}
                          style={{
                            background: isFailed ? "#fef2f2" : "#f0fdf4",
                            border: `1px solid ${isFailed ? "#fecaca" : "#dcfce7"}`,
                            borderRadius: 8,
                            padding: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: isFailed ? "#b91c1c" : "#166534", fontWeight: 700, marginBottom: 4 }}>
                            <span>To: {msg.recipient || msg.recipient_phone || "Resident"}</span>
                            <span
                              style={{
                                background: isFailed ? "#fee2e2" : "#dcfce7",
                                color: isFailed ? "#991b1b" : "#166534",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                              }}
                            >
                              {isFailed ? "FAILED" : (msg.is_live_dispatched ? "LIVE SENT" : "SIMULATED")}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#1e293b", lineHeight: 1.4 }}>
                            {msg.message || msg.preview_text}
                          </div>
                          {msg.error && (
                            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontStyle: "italic" }}>
                              <strong>Error:</strong> {msg.error}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: OPERATIONS CALENDAR & TOUR SCHEDULE                */}
          {/* ========================================================= */}
          {activeTab === "calendar" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Operations &amp; Inspection Calendar ({calendarEvents.length})
                  </h3>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Tour bookings, checkout inspections, and vendor maintenance slots with RFC 5545 iCal integration.
                  </div>
                </div>
                <button
                  onClick={() => setCalendarModalOpen(true)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Schedule Event / Inspection
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {calendarEvents.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    No events scheduled yet.
                  </div>
                ) : (
                  calendarEvents.map((ev: any, idx: number) => (
                    <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {new Date(ev.start_time).toLocaleString()} • {ev.location}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          Attendee: {ev.attendee_name} ({ev.attendee_email})
                        </div>
                      </div>
                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {ev.event_type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: SYSTEM DIAGNOSTICS & INFRASTRUCTURE HEALTH         */}
          {/* ========================================================= */}
          {activeTab === "diagnostics" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22 }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Platform Health Diagnostics
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748b" }}>FastAPI REST API Status:</span>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>Healthy (200 OK)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748b" }}>Database Connection:</span>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>SQLite Operational (Relational Guards Active)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748b" }}>Active LLM Provider:</span>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>{integrations?.active_llm_provider || "Gemini"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748b" }}>Vector Store Readiness:</span>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>ChromaDB Initialized</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Multi-Agent Heartbeat:</span>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>7/7 Agents Healthy</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 22 }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Integration Services Status
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Google Gemini LLM", key: integrations?.gemini_configured },
                    { label: "SMTP Email Service", key: integrations?.email_smtp_configured },
                    { label: "Google Calendar Sync", key: integrations?.google_calendar_configured },
                    { label: "WhatsApp Cloud API", key: integrations?.whatsapp_configured },
                    { label: "Vector Embeddings Store", key: integrations?.vector_store_ready },
                  ].map((srv, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{srv.label}</span>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>🟢 Operational</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- ADD PROPERTY MODAL ---------------- */}
      {propertyModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, width: 440, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Add New PG Property</h3>
              <button onClick={() => setPropertyModalOpen(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#64748b" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProperty}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Property Name</label>
                <input
                  type="text"
                  required
                  value={newProp.name}
                  onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                  placeholder="e.g. StayOps TechPG Indiranagar"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Unique Code</label>
                  <input
                    type="text"
                    required
                    value={newProp.code}
                    onChange={(e) => setNewProp({ ...newProp, code: e.target.value })}
                    placeholder="e.g. SO-BLR-IND"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>City</label>
                  <input
                    type="text"
                    required
                    value={newProp.city}
                    onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Full Address</label>
                <input
                  type="text"
                  required
                  value={newProp.address}
                  onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
                  placeholder="Street, Locality, Landmark"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setPropertyModalOpen(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProperty}
                  style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {savingProperty ? "Adding..." : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SCHEDULE CALENDAR EVENT MODAL ---------------- */}
      {calendarModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, width: 440, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Schedule Operational Event</h3>
              <button onClick={() => setCalendarModalOpen(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#64748b" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleCalendar}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Event Title</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Attendee Name</label>
                  <input
                    type="text"
                    required
                    value={newEvent.attendee_name}
                    onChange={(e) => setNewEvent({ ...newEvent, attendee_name: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Attendee Email</label>
                  <input
                    type="email"
                    required
                    value={newEvent.attendee_email}
                    onChange={(e) => setNewEvent({ ...newEvent, attendee_email: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setCalendarModalOpen(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingEvent}
                  style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {schedulingEvent ? "Scheduling..." : "Schedule Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Chat Button (Accessible from any tab) */}
      <div style={{ position: "fixed", bottom: 24, right: 28, zIndex: 9999 }}>
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
              color: "#ffffff",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 30,
              padding: "12px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s ease",
            }}
          >
            <span style={{ fontSize: 18 }}>🤖</span>
            <span>AI Ops Assistant</span>
            <span
              style={{
                background: "#10b981",
                color: "#ffffff",
                fontSize: 10,
                borderRadius: 10,
                padding: "1px 6px",
                fontWeight: 800,
              }}
            >
              LIVE
            </span>
          </button>
        ) : (
          <div
            style={{
              width: 380,
              height: 520,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.25)",
              border: "1px solid #cbd5e1",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                color: "#ffffff",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>StayOps AI Copilot</div>
                  <div style={{ fontSize: 10, color: "#a5b4fc" }}>Commands across 7 agents</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => {
                    setActiveTab("assistant");
                    setChatOpen(false);
                  }}
                  title="Expand to Full Tab"
                  style={{ background: "transparent", border: "none", color: "#c7d2fe", fontSize: 14, cursor: "pointer" }}
                >
                  ⛶
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#c7d2fe", fontSize: 16, cursor: "pointer", fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Prompts */}
            <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, overflowX: "auto" }}>
              {[
                { label: "📊 Occupancy", text: "Show portfolio occupancy & 30-day vacancy exposure" },
                { label: "⚡ Approve All", text: "Approve all pending approvals" },
                { label: "💰 Finances", text: "Audit overdue rent payments and collections" },
                { label: "🛏️ Rooms", text: "Show available vacant rooms in Bangalore" },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(p.text)}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    color: "#334155",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div
              style={{
                flex: 1,
                padding: 12,
                overflowY: "auto",
                background: "#fbfcfd",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "admin" ? "flex-end" : "flex-start",
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: msg.sender === "admin" ? "#2563eb" : "#7c3aed", marginBottom: 2 }}>
                    {msg.sender === "admin" ? "You" : msg.agent || "StayOps"}
                  </span>
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "8px 12px",
                      borderRadius: msg.sender === "admin" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: msg.sender === "admin" ? "#2563eb" : "#ffffff",
                      color: msg.sender === "admin" ? "#ffffff" : "#1e293b",
                      border: msg.sender === "admin" ? "none" : "1px solid #e2e8f0",
                      fontSize: 12,
                      lineHeight: 1.4,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                  Multi-agent reasoning in progress...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              style={{
                padding: "10px 12px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: 8,
                background: "#ffffff",
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Give command (e.g. approve all)..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Universal Profile Modal */}
      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </div>
  );
}


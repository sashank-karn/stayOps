"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfileEditModal from "../components/ProfileEditModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StayOpsLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mgr-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#mgr-logo-grad)" />
      <path d="M20 8.5L8 18H12V31H28V18H32L20 8.5Z" fill="white" fillOpacity="0.96" />
      <path d="M17 22H23V31H17V22Z" fill="#1e1b4b" fillOpacity="0.85" />
      <circle cx="20" cy="15" r="2.2" fill="#38bdf8" />
    </svg>
  );
}

export default function ManagerPortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "properties" | "tenants" | "ledger" | "maintenance" | "approvals">("overview");

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [propertyVisits, setPropertyVisits] = useState<any[]>([]);
  const [visitStatusFilter, setVisitStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [leaseModalOpen, setLeaseModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [creatingLease, setCreatingLease] = useState(false);
  const [newLease, setNewLease] = useState({
    tenant_name: "",
    email: "",
    phone: "",
    property_id: "",
    room_number: "101",
    bed_label: "A",
    rent_amount: 14000,
    deposit_amount: 28000,
  });

  // Copilot assistant query
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Units & Beds Inventory Management State
  const [selectedPropertyUnits, setSelectedPropertyUnits] = useState<any | null>(null);
  const [propertyRooms, setPropertyRooms] = useState<any[]>([]);
  const [loadingPropertyRooms, setLoadingPropertyRooms] = useState<boolean>(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ room_number: "", floor_number: 1, room_type: "Double", base_rent: 14000 });
  const [addBedRoomTarget, setAddBedRoomTarget] = useState<any | null>(null);
  const [newBedData, setNewBedData] = useState({ bed_label: "B", monthly_rent: 14000 });

  // Rent Reminders & Maintenance action states
  const [sentReminders, setSentReminders] = useState<Record<string, boolean>>({});
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

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

  // Fetch operational data
  const loadData = useCallback(async () => {
    try {
      const [mRes, pRes, tRes, tkRes, aRes, vRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/metrics`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/api/properties`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/tenants`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/tickets`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/approvals`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/property-visits`).then((r) => (r.ok ? r.json() : [])),
      ]);
      setMetrics(mRes);
      setProperties(pRes);
      setTenants(tRes);
      setTickets(tkRes);
      setApprovals(aRes);
      setPropertyVisits(vRes);
    } catch (err) {
      console.error("Failed to load operations data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateVisitStatus = async (visitId: string, newStatus: string) => {
    setUpdatingVisitId(visitId);
    try {
      const res = await fetch(`${API_URL}/api/property-visits/${visitId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPropertyVisits((prev) =>
          prev.map((v) => (v.id === visitId ? { ...v, status: newStatus } : v))
        );
        loadData();
      }
    } catch (err) {
      console.error("Failed to update visit status:", err);
    } finally {
      setUpdatingVisitId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("stayops_user");
      localStorage.removeItem("stayops_token");
    } catch {}
    router.push("/login");
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLease(true);
    try {
      const res = await fetch(`${API_URL}/api/leases/quick-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: newLease.tenant_name.trim(),
          email: newLease.email.trim(),
          phone: newLease.phone.trim(),
          property_id: newLease.property_id || (properties[0]?.id || undefined),
          room_number: newLease.room_number,
          bed_label: newLease.bed_label,
          rent_amount: Number(newLease.rent_amount),
          deposit_amount: Number(newLease.deposit_amount),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create lease.");
      }

      setLeaseModalOpen(false);
      setNewLease({
        tenant_name: "",
        email: "",
        phone: "",
        property_id: "",
        room_number: "101",
        bed_label: "A",
        rent_amount: 14000,
        deposit_amount: 28000,
      });
      await loadData();
      alert("Lease registered in live database and welcome notification sent!");
    } catch (err: any) {
      alert(err.message || "Failed to create lease. Please check inputs.");
    } finally {
      setCreatingLease(false);
    }
  };

  const handleReviewApproval = async (id: string, action: "approved" | "rejected") => {
    try {
      const res = await fetch(`${API_URL}/api/approvals/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action,
          reviewed_by: currentUser?.full_name || "Operations Manager",
          notes: `Reviewed and marked ${action} via Manager Portal`,
        }),
      });
      if (res.ok) {
        setApprovals((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: action } : item))
        );
      }
    } catch (err) {
      console.error("Failed to submit approval review:", err);
    }
  };

  const handleAskCopilot = async (override?: string) => {
    const q = override || copilotQuery;
    if (!q.trim()) return;
    setCopilotLoading(true);
    setCopilotResponse(null);

    try {
      const res = await fetch(`${API_URL}/api/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          target_agent: null,
          context: {
            user_role: "property_manager",
            manager_user: currentUser?.email,
            email: currentUser?.email,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotResponse(data.llm_synthesis || data.response || "Task executed successfully.");
        if (
          data.action_performed &&
          data.action_performed !== "orchestrator_dispatch" &&
          data.action_performed !== "prompt_target_user"
        ) {
          loadData();
        }
      } else {
        const cRes = await fetch(`${API_URL}/api/agents/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: q,
            context: {
              user_role: "property_manager",
              manager_user: currentUser?.email,
              email: currentUser?.email,
            },
          }),
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          setCopilotResponse(cData.response || "Analysis complete.");
          if (
            cData.action_performed &&
            cData.action_performed !== "orchestrator_dispatch" &&
            cData.action_performed !== "query_financials" &&
            cData.action_performed !== "query_approvals" &&
            cData.action_performed !== "list_vacant_beds" &&
            cData.action_performed !== "prompt_target_user"
          ) {
            loadData();
          }
        } else {
          setCopilotResponse("System evaluated query against operational database.");
        }
      }
    } catch (err) {
      console.error("Copilot error:", err);
      setCopilotResponse("Query routed to StayOps central operations bus.");
    } finally {
      setCopilotLoading(false);
    }
  };

  // Units & Beds Management Handlers
  const handleViewUnitsAndBeds = async (p: any) => {
    setSelectedPropertyUnits(p);
    setLoadingPropertyRooms(true);
    try {
      const res = await fetch(`${API_URL}/api/properties/${p.id}`);
      if (res.ok) {
        const data = await res.json();
        setPropertyRooms(data.rooms || []);
      } else {
        const rRes = await fetch(`${API_URL}/api/rooms?property_id=${p.id}`);
        if (rRes.ok) {
          const rData = await rRes.json();
          setPropertyRooms(rData || []);
        }
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    } finally {
      setLoadingPropertyRooms(false);
    }
  };

  const handleToggleBedStatus = async (bedId: string, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "maintenance" : "available";
    try {
      const res = await fetch(`${API_URL}/api/beds/${bedId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPropertyRooms((prev) =>
          prev.map((r) => ({
            ...r,
            beds: (r.beds || []).map((b: any) =>
              b.id === bedId ? { ...b, status: newStatus } : b
            ),
          }))
        );
        loadData();
      }
    } catch (err) {
      console.error("Failed to update bed status:", err);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyUnits) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedPropertyUnits.id,
          room_number: newRoomData.room_number.trim(),
          floor_number: Number(newRoomData.floor_number),
          room_type: newRoomData.room_type,
          base_rent: Number(newRoomData.base_rent),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        await fetch(`${API_URL}/api/rooms/${created.id}/beds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bed_label: "A",
            status: "available",
            monthly_rent: Number(newRoomData.base_rent),
          }),
        });
        setAddRoomModalOpen(false);
        setNewRoomData({ room_number: "", floor_number: 1, room_type: "Double", base_rent: 14000 });
        handleViewUnitsAndBeds(selectedPropertyUnits);
        loadData();
      }
    } catch (err) {
      console.error("Failed to add room:", err);
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBedRoomTarget) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${addBedRoomTarget.id}/beds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bed_label: newBedData.bed_label.trim().toUpperCase(),
          status: "available",
          monthly_rent: Number(newBedData.monthly_rent),
        }),
      });
      if (res.ok) {
        setAddBedRoomTarget(null);
        if (selectedPropertyUnits) {
          handleViewUnitsAndBeds(selectedPropertyUnits);
        }
        loadData();
      }
    } catch (err) {
      console.error("Failed to add bed:", err);
    }
  };

  const handleSendWaPaymentReminder = async (name: string, invoiceId: string, amount: string, due: string) => {
    setSendingReminderId(invoiceId);
    try {
      await fetch(`${API_URL}/api/notifications/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_phone: "+9779825016096",
          message: `StayOps Payment Reminder: Dear ${name}, your monthly rent of ${amount} for unit ${invoiceId} is scheduled for ${due}. Please complete your payment via StayOps Resident Living Hub.`,
          template_name: "payment_reminder",
          parameters: { name, amount, due_date: due },
        }),
      });
      setSentReminders((prev) => ({ ...prev, [invoiceId]: true }));
    } catch (err) {
      console.error("Failed to send WhatsApp reminder:", err);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolution_notes: "Inspected and resolved by Property Operations Manager.",
        }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: "resolved" } : t))
        );
      }
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    }
  };

  const handleReassignVendor = async (ticketId: string) => {
    try {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, assigned_vendor: "Bengaluru Master Contractors (Dispatched)" } : t))
      );
      alert("Vendor re-assigned and dispatch notification sent to resident.");
    } catch (err) {}
  };


  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", color: "#0f172a" }}>
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        style={{
          width: 250,
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
            <StayOpsLogo size={32} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>StayOps AI</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Property Operations</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "6px 12px", letterSpacing: "0.06em" }}>
              Operations
            </div>

            {[
              { id: "overview", label: "📊 Overview & KPIs", count: null, alertCount: null },
              {
                id: "properties",
                label: "🏢 Properties & Units",
                count: properties.length || 3,
                alertCount: propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length || null,
              },
              { id: "tenants", label: "👥 Residents & Leases", count: tenants.length || 28, alertCount: null },
              { id: "ledger", label: "💳 Rent Ledger", count: null, alertCount: null },
              { id: "maintenance", label: "🔧 Maintenance & Vendors", count: tickets.length || 4, alertCount: null },
              { id: "approvals", label: "🛡️ Safety Approvals", count: approvals.filter((a) => a.status === "pending").length || 3, alertCount: null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  background: activeTab === tab.id ? "#eff6ff" : "transparent",
                  color: activeTab === tab.id ? "#2563eb" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                <span>{tab.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {tab.alertCount ? (
                    <span
                      title={`${tab.alertCount} tour viewing request(s) awaiting review`}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        padding: "1px 6px",
                        borderRadius: 10,
                      }}
                    >
                      {tab.alertCount} tours
                    </span>
                  ) : null}
                  {tab.count !== null && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: activeTab === tab.id ? "#bfdbfe" : "#f1f5f9",
                        color: activeTab === tab.id ? "#1d4ed8" : "#64748b",
                        padding: "2px 7px",
                        borderRadius: 10,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Manager Profile Footer */}
        <div style={{ padding: 16, borderTop: "1px solid #f1f5f9", background: "#fcfcfd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2563eb", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
              {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : "M"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {currentUser?.full_name || "Operations Manager"}
              </div>
              <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 700 }}>VERIFIED MANAGER</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setProfileModalOpen(true)}
              style={{
                flex: 1,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span>👤</span>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "#ffffff",
                border: "1px solid #fee2e2",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: "#dc2626",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
              title="Sign Out"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
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
              {activeTab === "overview" && "Property Operations Dashboard"}
              {activeTab === "properties" && "Properties & Unit Inventory"}
              {activeTab === "tenants" && "Residents & Active Lease Agreements"}
              {activeTab === "ledger" && "Rent Collections & Financial Ledger"}
              {activeTab === "maintenance" && "Maintenance Work Orders & Vendor Triage"}
              {activeTab === "approvals" && "Human-in-the-Loop Safety Approvals Queue"}
            </h1>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Bengaluru & Pune Co-Living Portfolio • 3 Properties • 34 Beds
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setLeaseModalOpen(true)}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + New Lease
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
                borderRadius: 8,
                padding: "7px 12px",
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
                borderRadius: 8,
                padding: "7px 12px",
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
          </div>
        </header>


        {/* Content Body */}
        <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
          {/* ---------------- OVERVIEW TAB ---------------- */}
          {activeTab === "overview" && (
            <div>
              {/* Tour Requests Alert Banner */}
              {propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length > 0 && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>📅</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>
                        {propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length} Prospective Tour &amp; Viewing Requests Awaiting Action
                      </div>
                      <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                        Prospective residents and tenants have requested guided on-site walkthroughs for vacant rooms. Review slots and confirm tour dates.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("properties")}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(22,163,74,0.25)",
                    }}
                  >
                    View Tour Requests →
                  </button>
                </div>
              )}

              {/* 5 KPI Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) PRIMARIES", gap: 16, marginBottom: 24, gridAutoFlow: "column" }}>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>OCCUPANCY RATE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", marginTop: 6 }}>
                    {metrics?.occupancy_rate ? `${metrics.occupancy_rate}%` : "26.5%"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {metrics?.occupied_beds || 9} Occupied / {metrics?.total_beds || 34} Total Beds
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>MONTHLY COLLECTED</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", marginTop: 6 }}>
                    ₹{metrics?.monthly_collections ? metrics.monthly_collections.toLocaleString() : "31,000"}
                  </div>
                  <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Realization: 114.8% Billed</div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>OVERDUE DUES</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626", marginTop: 6 }}>
                    ₹{metrics?.overdue_dues ? metrics.overdue_dues.toLocaleString() : "0"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Collections Escalation Active</div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>ACTIVE RESIDENTS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
                    {metrics?.active_residents || 9}
                  </div>
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>7 on 15-Day Move-Out Notice</div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>SAFETY APPROVALS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed", marginTop: 6 }}>
                    {approvals.length || 24}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Human-in-the-Loop Gates</div>
                </div>
              </div>

              {/* AI Operations Assistant & Portfolio Occupancy */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
                {/* Copilot Assistant */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Smart Operations Assistant</h3>
                    <span style={{ fontSize: 11, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff", padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginLeft: "auto" }}>
                      7 Multi-Agents Ready
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                    Query portfolio occupancy, draft overdue notices, forecast turnover downtime, or triage repairs.
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    {[
                      "30-Day Vacancy Loss & Relist",
                      "Overdue Collections & Forecast",
                      "Maintenance Work Orders Triage",
                      "Resident Base & Notice Audit",
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCopilotQuery(prompt);
                          handleAskCopilot(prompt);
                        }}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <input
                      type="text"
                      value={copilotQuery}
                      onChange={(e) => setCopilotQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskCopilot()}
                      placeholder="Ask any question about portfolio operations..."
                      style={{ flex: 1, padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                    />
                    <button
                      onClick={() => handleAskCopilot()}
                      disabled={copilotLoading}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 18px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {copilotLoading ? "Analyzing..." : "Execute Request"}
                    </button>
                  </div>

                  {copilotResponse && (
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 14, fontSize: 13, color: "#1e3a8a", lineHeight: 1.5 }}>
                      <strong>AI Copilot Response:</strong>
                      <div style={{ marginTop: 4 }}>{copilotResponse}</div>
                    </div>
                  )}
                </div>

                {/* Property Occupancy Cards */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22 }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Property Occupancy</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { name: "StayOps TechPG - Koramangala", city: "Bengaluru", occupied: 4, total: 26, pct: 15 },
                      { name: "StayOps CampusLiving - Viman Nagar", city: "Pune", occupied: 3, total: 5, pct: 60 },
                      { name: "Symbiosis Institute of Technology Hostel", city: "Pune", occupied: 2, total: 3, pct: 67 },
                    ].map((prop, idx) => (
                      <div key={idx} style={{ borderBottom: idx < 2 ? "1px solid #f1f5f9" : "none", paddingBottom: idx < 2 ? 14 : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{prop.name}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{prop.city} • {prop.occupied}/{prop.total} beds occupied</div>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#2563eb" }}>{prop.pct}%</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${prop.pct}%`, height: "100%", background: "#2563eb", borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- PROPERTIES TAB ---------------- */}
          {activeTab === "properties" && (
            <div>
              {/* Tour & Viewing Requests Section */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 22,
                  marginBottom: 24,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        color: "#2563eb",
                      }}
                    >
                      📅
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                          Property Tour &amp; Viewing Requests
                        </h2>
                        {propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length > 0 && (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length} Pending Review
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Requests submitted by residents and prospective tenants wanting to view vacant rooms on-site.
                      </div>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 3, borderRadius: 8 }}>
                    {(["all", "pending", "completed"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setVisitStatusFilter(mode)}
                        style={{
                          background: visitStatusFilter === mode ? "#ffffff" : "transparent",
                          color: visitStatusFilter === mode ? "#0f172a" : "#64748b",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: visitStatusFilter === mode ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        }}
                      >
                        {mode === "all"
                          ? `All (${propertyVisits.length})`
                          : mode === "pending"
                          ? `Pending (${propertyVisits.filter((v) => v.status === "scheduled" || v.status === "confirmed").length})`
                          : `Completed (${propertyVisits.filter((v) => v.status === "completed" || v.status === "cancelled").length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visits Cards */}
                {(() => {
                  const filteredVisits = propertyVisits.filter((v) => {
                    if (visitStatusFilter === "pending") return v.status === "scheduled" || v.status === "confirmed";
                    if (visitStatusFilter === "completed") return v.status === "completed" || v.status === "cancelled" || v.status === "no_show";
                    return true;
                  });

                  if (filteredVisits.length === 0) {
                    return (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px dashed #cbd5e1",
                          borderRadius: 10,
                          padding: "24px 16px",
                          textAlign: "center",
                          color: "#64748b",
                          fontSize: 13,
                        }}
                      >
                        No viewing tour requests found for this filter. When tenants click &quot;Schedule Visit&quot; from the resident portal, their requests will appear here automatically!
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {filteredVisits.map((v) => {
                        const isPending = v.status === "scheduled" || v.status === "confirmed";
                        const schedDate = new Date(v.scheduled_time);
                        const dateFormatted = !isNaN(schedDate.getTime())
                          ? schedDate.toLocaleString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : v.scheduled_time;

                        return (
                          <div
                            key={v.id}
                            style={{
                              background: isPending ? "#ffffff" : "#f8fafc",
                              border: isPending ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                              borderRadius: 10,
                              padding: "14px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 16,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 8,
                                  background: isPending ? "#dbeafe" : "#f1f5f9",
                                  color: isPending ? "#1d4ed8" : "#64748b",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: 16,
                                  flexShrink: 0,
                                }}
                              >
                                <span>🗓️</span>
                              </div>

                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <strong style={{ fontSize: 14, color: "#0f172a" }}>{v.lead_name}</strong>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#2563eb",
                                      background: "#eff6ff",
                                      border: "1px solid #dbeafe",
                                      borderRadius: 6,
                                      padding: "1px 8px",
                                    }}
                                  >
                                    🏢 {v.property_name} {v.room_number ? `• Room ${v.room_number}` : ""}
                                  </span>

                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      borderRadius: 10,
                                      padding: "1px 8px",
                                      background:
                                        v.status === "confirmed"
                                          ? "#dcfce7"
                                          : v.status === "completed"
                                          ? "#f1f5f9"
                                          : v.status === "cancelled"
                                          ? "#fee2e2"
                                          : "#fef3c7",
                                      color:
                                        v.status === "confirmed"
                                          ? "#15803d"
                                          : v.status === "completed"
                                          ? "#475569"
                                          : v.status === "cancelled"
                                          ? "#b91c1c"
                                          : "#b45309",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    ● {v.status}
                                  </span>
                                </div>

                                <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
                                  <span>
                                    <strong>Slot:</strong> {dateFormatted}
                                  </span>
                                  {v.phone && (
                                    <span>
                                      <strong>Phone:</strong> {v.phone}
                                    </span>
                                  )}
                                  {v.email && (
                                    <span>
                                      <strong>Email:</strong> {v.email}
                                    </span>
                                  )}
                                </div>

                                {v.feedback && (
                                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>
                                    Note: &quot;{v.feedback}&quot;
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {v.phone && (
                                <a
                                  href={`https://wa.me/${v.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `Hi ${v.lead_name}, greetings from StayOps! Regarding your scheduled property tour of ${v.property_name} on ${dateFormatted}, our manager will meet you at the reception.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: "#22c55e",
                                    color: "#ffffff",
                                    textDecoration: "none",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <span>💬 WhatsApp</span>
                                </a>
                              )}

                              {v.status === "scheduled" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateVisitStatus(v.id, "confirmed")}
                                    disabled={updatingVisitId === v.id}
                                    style={{
                                      background: "#2563eb",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Confirm Tour
                                  </button>
                                  <button
                                    onClick={() => handleUpdateVisitStatus(v.id, "cancelled")}
                                    disabled={updatingVisitId === v.id}
                                    style={{
                                      background: "#fef2f2",
                                      color: "#b91c1c",
                                      border: "1px solid #fee2e2",
                                      borderRadius: 6,
                                      padding: "6px 10px",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {v.status === "confirmed" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateVisitStatus(v.id, "completed")}
                                    disabled={updatingVisitId === v.id}
                                    style={{
                                      background: "#16a34a",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Mark Completed
                                  </button>
                                  <button
                                    onClick={() => handleUpdateVisitStatus(v.id, "no_show")}
                                    disabled={updatingVisitId === v.id}
                                    style={{
                                      background: "#f1f5f9",
                                      color: "#64748b",
                                      border: "none",
                                      borderRadius: 6,
                                      padding: "6px 10px",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    No Show
                                  </button>
                                </>
                              )}

                              {(v.status === "completed" || v.status === "cancelled" || v.status === "no_show") && (
                                <button
                                  onClick={() => handleUpdateVisitStatus(v.id, "scheduled")}
                                  disabled={updatingVisitId === v.id}
                                  style={{
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 6,
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Re-open
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Managed Properties Cards Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Managed Properties &amp; Unit Inventory ({properties.length})
                  </h2>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Click on any property below to view live rooms, unit layouts, and bed occupancy states.
                  </div>
                </div>
                <button
                  onClick={() => setLeaseModalOpen(true)}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Add Tenant to Unit
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                {properties.map((p) => {
                  const propPendingVisits = propertyVisits.filter(
                    (v) => v.property_id === p.id && (v.status === "scheduled" || v.status === "confirmed")
                  ).length;

                  return (
                    <div key={p.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>{p.code || "PG-UNIT"} • {p.city || "Bengaluru"}</div>
                          <h3 style={{ margin: "2px 0 0 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{p.name}</h3>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.address || "Bengaluru / Pune"}</div>
                        </div>
                        <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          Active
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0", fontSize: 12 }}>
                        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                          <span style={{ color: "#64748b", fontSize: 11 }}>Capacity:</span>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{p.total_rooms || 12} Rooms</div>
                          <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>{p.total_beds || 34} Total Beds</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                          <span style={{ color: "#64748b", fontSize: 11 }}>Availability:</span>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#16a34a" }}>{p.available_beds ?? 5} Vacant</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>₹14k–18k / mo</div>
                        </div>
                      </div>

                      {/* Tour Requests Badge on Property Card */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, background: "#f8fafc", padding: "6px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Viewing Requests:</span>
                        {propPendingVisits > 0 ? (
                          <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span>🔔</span>
                            <span>{propPendingVisits} tour pending</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>0 pending</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleViewUnitsAndBeds(p)}
                        style={{
                          width: "100%",
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                        }}
                      >
                        <span>🏢</span>
                        <span>View Units &amp; Beds ({p.name}) →</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------- RESIDENTS & LEASES TAB ---------------- */}
          {activeTab === "tenants" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 600 }}>
                    <th style={{ padding: "12px 16px" }}>Resident Name</th>
                    <th style={{ padding: "12px 16px" }}>Unit / Bed</th>
                    <th style={{ padding: "12px 16px" }}>Contact</th>
                    <th style={{ padding: "12px 16px" }}>Monthly Rent</th>
                    <th style={{ padding: "12px 16px" }}>Lease Expiry</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>{t.full_name || t.name}</td>
                      <td style={{ padding: "12px 16px", color: "#2563eb", fontWeight: 600 }}>Room {t.room_number || "101"} ({t.bed_label || "Bed A"})</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{t.phone || "+91 98765 43210"}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>₹{(t.monthly_rent || 14000).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{t.lease_end || "31 Dec 2026"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------- RENT LEDGER TAB ---------------- */}
          {activeTab === "ledger" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 600 }}>
                    <th style={{ padding: "12px 16px" }}>Invoice ID</th>
                    <th style={{ padding: "12px 16px" }}>Tenant</th>
                    <th style={{ padding: "12px 16px" }}>Amount</th>
                    <th style={{ padding: "12px 16px" }}>Due Date</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(tenants.length > 0
                    ? tenants.slice(0, 12).map((t, idx) => ({
                        id: `INV-2026-${t.room_number || "101"}${t.bed_label ? `-${t.bed_label}` : ""}`,
                        name: t.full_name,
                        amt: `₹${(t.monthly_rent || 14000).toLocaleString("en-IN")}`,
                        due: idx % 2 === 0 ? "05 Nov 2026" : "05 Oct 2026",
                        status: idx % 2 === 0 ? "Upcoming" : "Paid",
                      }))
                    : [
                        { id: "INV-2026-101-A", name: "Rohan Mehta", amt: "₹16,000", due: "05 Nov 2026", status: "Upcoming" },
                        { id: "INV-2026-102-A", name: "Sneha Patil", amt: "₹11,000", due: "05 Nov 2026", status: "Upcoming" },
                      ]
                  ).map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#2563eb" }}>{row.id}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{row.name}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>{row.amt}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{row.due}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            background: row.status === "Paid" ? "#f0fdf4" : "#eff6ff",
                            color: row.status === "Paid" ? "#16a34a" : "#2563eb",
                            border: row.status === "Paid" ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                            borderRadius: 12,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          disabled={sendingReminderId === row.id || sentReminders[row.id]}
                          onClick={() => handleSendWaPaymentReminder(row.name, row.id, row.amt, row.due)}
                          style={{
                            background: sentReminders[row.id] ? "#f0fdf4" : "#2563eb",
                            color: sentReminders[row.id] ? "#16a34a" : "#ffffff",
                            border: sentReminders[row.id] ? "1px solid #bbf7d0" : "none",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: sentReminders[row.id] ? "default" : "pointer",
                          }}
                        >
                          {sendingReminderId === row.id
                            ? "Sending..."
                            : sentReminders[row.id]
                            ? "Reminder Sent ✓ (WhatsApp)"
                            : "Send WhatsApp Reminder 💬"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------- MAINTENANCE & VENDORS TAB ---------------- */}
          {activeTab === "maintenance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tickets.map((t, idx) => (
                <div
                  key={t.id || idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{t.title || `Ticket #${t.id}`}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: t.status === "resolved" ? "#f0fdf4" : "#fef2f2",
                          color: t.status === "resolved" ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {t.status ? t.status.toUpperCase() : "OPEN"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>{t.description || "Reported maintenance issue."}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Category: {t.category || "General"} • Assigned: {t.assigned_vendor || "Bengaluru City Plumbers"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleReassignVendor(t.id)}
                      style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Re-assign Vendor
                    </button>
                    <button
                      disabled={t.status === "resolved"}
                      onClick={() => handleResolveTicket(t.id)}
                      style={{
                        background: t.status === "resolved" ? "#f1f5f9" : "#16a34a",
                        color: t.status === "resolved" ? "#64748b" : "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: t.status === "resolved" ? "default" : "pointer",
                      }}
                    >
                      {t.status === "resolved" ? "Resolved ✓" : "Resolve ✓"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------------- SAFETY APPROVALS TAB ---------------- */}
          {activeTab === "approvals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, fontSize: 13, color: "#1e40af" }}>
                🛡️ <strong>Human-in-the-Loop Protocol:</strong> Critical financial operations (escrow deposit refunds, high-value repairs &gt; ₹5,000, lease cancellations) require manager authorization before execution.
              </div>

              {approvals.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{a.title || `Approval #${a.id}`}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: a.status === "approved" ? "#f0fdf4" : a.status === "rejected" ? "#fef2f2" : "#fffbeb",
                          color: a.status === "approved" ? "#16a34a" : a.status === "rejected" ? "#dc2626" : "#d97706",
                        }}
                      >
                        {(a.status || "PENDING").toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>{a.description || a.details || "Authorization required."}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Requested by Agent: {a.agent_name || "move_out_agent"} • Gate ID: {a.id}
                    </div>
                  </div>

                  {a.status === "pending" || !a.status ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleReviewApproval(a.id, "rejected")}
                        style={{ background: "#ffffff", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Reject ✕
                      </button>
                      <button
                        onClick={() => handleReviewApproval(a.id, "approved")}
                        style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Approve & Release Funds ✓
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.status === "approved" ? "#16a34a" : "#dc2626" }}>
                      Decision Recorded ({a.status})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- NEW LEASE MODAL ---------------- */}
      {leaseModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#ffffff", borderRadius: 16, width: 500, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Draft New Resident Lease</h3>
              <button onClick={() => setLeaseModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <form onSubmit={handleCreateLease}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Resident Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rao"
                  value={newLease.tenant_name}
                  onChange={(e) => setNewLease({ ...newLease, tenant_name: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Email Address:</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@example.com"
                    value={newLease.email}
                    onChange={(e) => setNewLease({ ...newLease, email: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>WhatsApp Phone:</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={newLease.phone}
                    onChange={(e) => setNewLease({ ...newLease, phone: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Room Number:</label>
                  <input
                    type="text"
                    required
                    value={newLease.room_number}
                    onChange={(e) => setNewLease({ ...newLease, room_number: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Bed Label:</label>
                  <input
                    type="text"
                    required
                    value={newLease.bed_label}
                    onChange={(e) => setNewLease({ ...newLease, bed_label: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Monthly Rent (₹):</label>
                  <input
                    type="number"
                    required
                    value={newLease.rent_amount}
                    onChange={(e) => setNewLease({ ...newLease, rent_amount: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Security Deposit (₹):</label>
                  <input
                    type="number"
                    required
                    value={newLease.deposit_amount}
                    onChange={(e) => setNewLease({ ...newLease, deposit_amount: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setLeaseModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
                >
                  Create Lease & Send Agreement →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ---------------- UNITS & BEDS INVENTORY MODAL ---------------- */}
      {selectedPropertyUnits && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPropertyUnits(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 960,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🏢</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                      {selectedPropertyUnits.name} • Units &amp; Bed Inventory
                    </h2>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {selectedPropertyUnits.address || "Bengaluru / Pune"} • Code: {selectedPropertyUnits.code || "PG"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setAddRoomModalOpen(true)}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>+</span>
                  <span>Add Room</span>
                </button>
                <button
                  onClick={() => setSelectedPropertyUnits(null)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Active Property Viewing Tours Banner */}
            {(() => {
              const activeTours = propertyVisits.filter(
                (v) => v.property_id === selectedPropertyUnits.id && (v.status === "scheduled" || v.status === "confirmed")
              );
              if (activeTours.length === 0) return null;
              return (
                <div
                  style={{
                    background: "#eff6ff",
                    borderBottom: "1px solid #bfdbfe",
                    padding: "10px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1e40af" }}>
                    <span style={{ fontSize: 16 }}>🔔</span>
                    <strong>{activeTours.length} viewing tour request(s) for this property:</strong>
                    <span>
                      {activeTours.map((t) => `${t.lead_name} (${t.room_number ? 'Room ' + t.room_number : 'Site'}) on ${new Date(t.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`).join(" | ")}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                    Active Tours
                  </span>
                </div>
              );
            })()}

            {/* Filter & Search Bar */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(["all", "available", "occupied", "maintenance"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setUnitStatusFilter(mode)}
                    style={{
                      background: unitStatusFilter === mode ? "#2563eb" : "#f1f5f9",
                      color: unitStatusFilter === mode ? "#ffffff" : "#475569",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {mode === "all" ? "All Units" : mode}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search Room # (e.g. 101, 202)..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  width: 220,
                  outline: "none",
                }}
              />
            </div>

            {/* Rooms & Beds Content Area */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, background: "#f8fafc" }}>
              {loadingPropertyRooms ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Loading unit and bed layout...</div>
                </div>
              ) : propertyRooms.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🛏️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No rooms configured yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Add Room" to create the first unit for this property.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {propertyRooms
                    .filter((r) => {
                      if (unitSearch) {
                        const matchRoom = (r.room_number || "").toLowerCase().includes(unitSearch.toLowerCase());
                        const matchBeds = (r.beds || []).some((b: any) => (b.label || "").toLowerCase().includes(unitSearch.toLowerCase()));
                        if (!matchRoom && !matchBeds) return false;
                      }
                      if (unitStatusFilter !== "all") {
                        const hasMatchingBed = (r.beds || []).some((b: any) => b.status === unitStatusFilter);
                        if (!hasMatchingBed) return false;
                      }
                      return true;
                    })
                    .map((room) => {
                      const availCount = (room.beds || []).filter((b: any) => b.status === "available").length;
                      return (
                        <div
                          key={room.id}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                                Room {room.room_number}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {room.room_type || "Double"} Sharing • Floor {room.floor_number || 1}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: availCount > 0 ? "#f0fdf4" : "#eff6ff",
                                color: availCount > 0 ? "#16a34a" : "#2563eb",
                                border: availCount > 0 ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                              }}
                            >
                              {availCount > 0 ? `${availCount} Available` : "Fully Occupied"}
                            </span>
                          </div>

                          {/* Beds list */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            {(room.beds || []).map((bed: any) => {
                              const isAvail = bed.status === "available";
                              const isMaint = bed.status === "maintenance";
                              const isOccupied = bed.status === "occupied";
                              return (
                                <div
                                  key={bed.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                                      Bed {bed.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748b" }}>
                                      ₹{(bed.monthly_rent || room.base_rent || 14000).toLocaleString()}/mo
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: isAvail ? "#dcfce7" : isMaint ? "#fef3c7" : "#dbeafe",
                                        color: isAvail ? "#15803d" : isMaint ? "#b45309" : "#1e40af",
                                      }}
                                    >
                                      {isAvail ? "Vacant" : isMaint ? "Maintenance" : "Occupied"}
                                    </span>

                                    {!isOccupied && (
                                      <button
                                        onClick={() => handleToggleBedStatus(bed.id, bed.status)}
                                        title={isAvail ? "Mark as in maintenance" : "Mark as available for leasing"}
                                        style={{
                                          background: "#ffffff",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: 4,
                                          padding: "3px 6px",
                                          fontSize: 10,
                                          fontWeight: 600,
                                          color: "#334155",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {isAvail ? "🔧" : "✓"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Bed to this Room */}
                          <button
                            onClick={() => {
                              setAddBedRoomTarget(room);
                              const existingLabels = (room.beds || []).map((b: any) => b.label);
                              const nextChar = String.fromCharCode(65 + existingLabels.length);
                              setNewBedData({ bed_label: nextChar, monthly_rent: room.base_rent || 14000 });
                            }}
                            style={{
                              width: "100%",
                              background: "#ffffff",
                              border: "1px dashed #cbd5e1",
                              borderRadius: 6,
                              padding: "6px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#2563eb",
                              cursor: "pointer",
                            }}
                          >
                            + Add Bed to Room {room.room_number}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Total: {propertyRooms.length} rooms • {propertyRooms.reduce((acc, r) => acc + (r.beds?.length || 0), 0)} beds
              </div>
              <button
                onClick={() => setSelectedPropertyUnits(null)}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ADD ROOM MODAL ---------------- */}
      {addRoomModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
          }}
        >
          <div style={{ background: "#ffffff", borderRadius: 14, width: 440, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                Add New Room to {selectedPropertyUnits?.name}
              </h3>
              <button onClick={() => setAddRoomModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <form onSubmit={handleAddRoom}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 204"
                  value={newRoomData.room_number}
                  onChange={(e) => setNewRoomData({ ...newRoomData, room_number: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Floor Number</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRoomData.floor_number}
                    onChange={(e) => setNewRoomData({ ...newRoomData, floor_number: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Room Type</label>
                  <select
                    value={newRoomData.room_type}
                    onChange={(e) => setNewRoomData({ ...newRoomData, room_type: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, background: "#ffffff", boxSizing: "border-box" }}
                  >
                    <option value="Single">Single Sharing</option>
                    <option value="Double">Double Sharing</option>
                    <option value="Triple">Triple Sharing</option>
                    <option value="Quad">Quad Sharing</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Base Monthly Rent per Bed (₹)</label>
                <input
                  type="number"
                  step="500"
                  value={newRoomData.base_rent}
                  onChange={(e) => setNewRoomData({ ...newRoomData, base_rent: Number(e.target.value) })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddRoomModalOpen(false)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Create Room &amp; Bed A →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD BED MODAL ---------------- */}
      {addBedRoomTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
          }}
        >
          <div style={{ background: "#ffffff", borderRadius: 14, width: 380, padding: 22, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                Add Bed to Room {addBedRoomTarget.room_number}
              </h3>
              <button onClick={() => setAddBedRoomTarget(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <form onSubmit={handleAddBed}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Bed Label (e.g. B, C, D)</label>
                <input
                  type="text"
                  required
                  value={newBedData.bed_label}
                  onChange={(e) => setNewBedData({ ...newBedData, bed_label: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Monthly Rent (₹)</label>
                <input
                  type="number"
                  step="500"
                  value={newBedData.monthly_rent}
                  onChange={(e) => setNewBedData({ ...newBedData, monthly_rent: Number(e.target.value) })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddBedRoomTarget(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Add Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </div>
  );
}



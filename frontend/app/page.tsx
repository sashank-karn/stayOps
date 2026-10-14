"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StayOpsLogo({ size = 38 }: { size?: number }) {
  const gradId = `stayops-grad-${size}`;
  const accentId = `stayops-accent-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={accentId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
      {/* Modern architectural roofline + building silhouette */}
      <path
        d="M20 8.5L8 18H12V31H28V18H32L20 8.5Z"
        fill="white"
        fillOpacity="0.96"
      />
      {/* Modern entrance door */}
      <path
        d="M17 22H23V31H17V22Z"
        fill="#1e1b4b"
        fillOpacity="0.85"
      />
      {/* Smart beacon / AI pulse dot */}
      <circle cx="20" cy="15" r="2.2" fill={`url(#${accentId})`} />
      <circle cx="20" cy="15" r="4.2" stroke={`url(#${accentId})`} strokeWidth="0.8" strokeOpacity="0.7" />
    </svg>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rentRecords, setRentRecords] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any>(null);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auth state (null by default; verified via cookies/localStorage on boot)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authRole, setAuthRole] = useState("property_manager");
  const [authError, setAuthError] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authStep, setAuthStep] = useState<"details" | "otp">("details");
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [devOtp, setDevOtp] = useState<string>("");
  const [otpSentMessage, setOtpSentMessage] = useState<string>("");
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  // Modals state
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>("");

  // Pay Rent Modal state
  const [selectedRentRecord, setSelectedRentRecord] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");

  // New Property Form
  const [newProperty, setNewProperty] = useState({
    name: "",
    code: "",
    address: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    total_floors: 3,
    amenities: ["Wi-Fi", "Daily Cleaning", "Mess Food"],
    rules_summary: "Gate closes at 11:00 PM. No smoking.",
  });

  // New Room Form
  const [newRoom, setNewRoom] = useState({
    property_id: "",
    room_number: "",
    floor_number: 1,
    room_type: "Double",
    base_rent: 11000,
  });

  // New Tenant & Lease Form
  const [newTenantForm, setNewTenantForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    property_id: "",
    bed_id: "",
    monthly_rent: 11000,
    security_deposit: 22000,
    start_date: new Date().toISOString().split("T")[0],
  });

  // New Ticket Form
  const [newTicketForm, setNewTicketForm] = useState({
    property_id: "",
    title: "",
    description: "",
    category: "Plumbing",
    severity: "Medium",
  });

  // Interactive Agent Workspace Studio state
  const [agentPrompt, setAgentPrompt] = useState<string>(
    "Analyze our portfolio vacancy revenue loss exposure and sort priority turnover relistings."
  );
  const [targetAgent, setTargetAgent] = useState<string>("");
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [dispatching, setDispatching] = useState<boolean>(false);

  // 15-Day Move-Out Flagship Demo state
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [demoNoticeDays, setDemoNoticeDays] = useState<number>(15);
  const [moveOutResult, setMoveOutResult] = useState<any>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<boolean>(false);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, mRes, pRes, rRes, tRes, rrRes, lRes, tkRes, vRes, aRes, wRes, nRes, agRes, dRes] =
        await Promise.all([
          fetch(`${API_URL}/health`).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/dashboard/metrics`).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/properties`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/rooms`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/tenants`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/rent-records`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/leads`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/tickets`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/vendors`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/approvals`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/workflows`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/notifications`).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/agents`).then((r) => r.json()).catch(() => []),
          fetch(`${API_URL}/api/health/diagnostics`).then((r) => r.json()).catch(() => null),
        ]);

      setHealth(hRes);
      setMetrics(mRes);
      setProperties(pRes || []);
      setRooms(rRes || []);
      setTenants(tRes || []);
      setRentRecords(rrRes || []);
      setLeads(lRes || []);
      setTickets(tkRes || []);
      setVendors(vRes || []);
      setApprovals(aRes || []);
      setWorkflows(wRes || []);
      setNotifications(nRes);
      setAvailableAgents(agRes || []);
      setDiagnostics(dRes);

      if (tRes && tRes.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tRes[0].id);
      }
      if (pRes && pRes.length > 0 && !newRoom.property_id) {
        setNewRoom((prev) => ({ ...prev, property_id: pRes[0].id }));
        setNewTenantForm((prev) => ({ ...prev, property_id: pRes[0].id }));
        setNewTicketForm((prev) => ({ ...prev, property_id: pRes[0].id }));
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if session token/user is preserved in localStorage or cookies
    try {
      const storedUser = localStorage.getItem("stayops_user");
      const storedToken = localStorage.getItem("stayops_token");
      if (storedUser && storedToken) {
        setCurrentUser({ ...JSON.parse(storedUser), token: storedToken });
        setAuthModalOpen(false);
      } else {
        // No session found -> open sign-in modal immediately at the beginning
        setCurrentUser(null);
        setAuthModalOpen(true);
      }
    } catch {
      setCurrentUser(null);
      setAuthModalOpen(true);
    }
    fetchData();
  }, []);

  // Quick switch demo user with persistent storage and cookie
  const handleQuickLogin = async (role: string) => {
    let email = "manager@stayops.ai";
    let password = "Manager@123";
    if (role === "admin") {
      email = "admin@stayops.ai";
      password = "Admin@123";
    } else if (role === "tenant") {
      email = "resident@stayops.ai";
      password = "Resident@123";
    }

    try {
      setAuthError("");
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        const userObj = { ...data.user, token: data.access_token };
        localStorage.setItem("stayops_user", JSON.stringify(data.user));
        localStorage.setItem("stayops_token", data.access_token);
        document.cookie = `stayops_token=${data.access_token}; path=/; max-age=86400`;
        setCurrentUser(userObj);
        setAuthModalOpen(false);
      } else {
        setAuthError(data.detail || "Authentication failed");
      }
    } catch (e: any) {
      setAuthError(e.message || "Quick login error");
    }
  };

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const resetAuthForm = () => {
    setAuthEmail("");
    setAuthPassword("");
    setAuthFullName("");
    setAuthOtp("");
    setDevOtp("");
    setAuthError("");
    setOtpSentMessage("");
    setAuthStep("details");
    setOtpCountdown(0);
  };

  const toggleAuthMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthError("");
    setOtpSentMessage("");
    setAuthStep("details");
    setAuthOtp("");
  };

  // Dispatch OTP verification code to email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError("");
    setOtpSentMessage("");

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(authEmail.trim())) {
      setAuthError("Please provide a valid email address (e.g., manager@stayops.ai).");
      return;
    }
    if (!authFullName.trim() && authMode === "register") {
      setAuthError("Please provide your full name.");
      return;
    }
    if (authPassword.length < 6 && authMode === "register") {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), purpose: "registration" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Failed to dispatch verification code.");
        setOtpLoading(false);
        return;
      }
      setOtpSentMessage(data.message || "Verification code dispatched to your email!");
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }
      setAuthStep("otp");
      setOtpCountdown(60);
    } catch (err: any) {
      setAuthError(err.message || "Network error while requesting verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Custom Login/Register with OTP verification & persistence
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(authEmail.trim())) {
      setAuthError("Please provide a valid email address (e.g., manager@stayops.ai).");
      return;
    }

    // Step 1 of registration -> trigger OTP dispatch
    if (authMode === "register" && authStep === "details") {
      await handleSendOtp();
      return;
    }

    // Step 2 of registration -> ensure OTP entered
    if (authMode === "register" && authStep === "otp") {
      if (!authOtp.trim() || authOtp.trim().length < 4) {
        setAuthError("Please enter the 6-digit verification code sent to your email.");
        return;
      }
    }

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body: any =
      authMode === "login"
        ? { email: authEmail.trim(), password: authPassword }
        : {
            email: authEmail.trim(),
            password: authPassword,
            full_name: authFullName.trim(),
            role: authRole,
            otp: authOtp.trim(),
          };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Authentication failed");
        return;
      }
      const token = data.access_token || "";
      const userObj = { ...(data.user || { email: authEmail, full_name: authFullName, role: authRole, is_verified: true }), token };
      localStorage.setItem("stayops_user", JSON.stringify(data.user || userObj));
      if (token) {
        localStorage.setItem("stayops_token", token);
        document.cookie = `stayops_token=${token}; path=/; max-age=86400`;
      }
      setCurrentUser(userObj);
      setAuthModalOpen(false);
      resetAuthForm();
    } catch (e: any) {
      setAuthError(e.message || "Network error");
    }
  };

  // Sign out user and clear stored tokens/cookies
  const handleLogout = () => {
    localStorage.removeItem("stayops_user");
    localStorage.removeItem("stayops_token");
    document.cookie = "stayops_token=; path=/; max-age=0";
    setCurrentUser(null);
    setAuthModalOpen(true);
  };

  // Dispatch interactive agent task
  const handleDispatchAgentTask = async (presetPrompt?: string) => {
    const promptToSend = presetPrompt || agentPrompt;
    if (!promptToSend) return;
    setDispatching(true);
    setDispatchResult(null);

    try {
      const res = await fetch(`${API_URL}/api/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          target_agent: targetAgent || null,
        }),
      });
      const data = await res.json();
      setDispatchResult(data);
      fetchData(); // refresh audit logs and counts
    } catch (err) {
      console.error("Dispatch error:", err);
    } finally {
      setDispatching(false);
    }
  };

  // Flagship Move-Out Multi-Agent Workflow
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
      fetchData();
    } catch (err) {
      console.error("Workflow trigger error:", err);
    } finally {
      setRunningWorkflow(false);
    }
  };

  // Human-in-the-loop review
  const handleApproval = async (approvalId: string, action: "approved" | "rejected") => {
    try {
      await fetch(`${API_URL}/api/approvals/${approvalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewed_by: currentUser.full_name }),
      });
      fetchData();
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  // Submit simulated rent payment
  const handlePayRentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentRecord) return;
    setModalSubmitting(true);
    setModalError("");

    try {
      const res = await fetch(`${API_URL}/api/rent-records/${selectedRentRecord.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: "Recorded via StayOps Financial Dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.detail || "Payment failed");
        return;
      }
      setModalType(null);
      setSelectedRentRecord(null);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Network error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Submit New Property (with automatic initial room and bed provisioning)
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_URL}/api/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProperty),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.detail || "Failed to create property");
        return;
      }

      // Automatically provision standard Room 101 with Bed A & Bed B so the new property immediately has inventory for leases
      try {
        const roomRes = await fetch(`${API_URL}/api/rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: data.id,
            room_number: "101",
            floor_number: 1,
            room_type: "Double",
            base_rent: 11000,
          }),
        });
        const roomData = await roomRes.json();
        if (roomRes.ok && roomData.id) {
          await fetch(`${API_URL}/api/rooms/${roomData.id}/beds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bed_label: "A", status: "available", monthly_rent: 11000 }),
          });
          await fetch(`${API_URL}/api/rooms/${roomData.id}/beds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bed_label: "B", status: "available", monthly_rent: 11000 }),
          });
        }
      } catch (provisionErr) {
        console.warn("Auto room provisioning note:", provisionErr);
      }

      setModalType(null);
      await fetchData();
    } catch (e: any) {
      setModalError(e.message || "Network error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Submit New Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.detail || "Failed to create room");
        return;
      }
      // Automatically add Bed A to room
      await fetch(`${API_URL}/api/rooms/${data.id}/beds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bed_label: "A", status: "available", monthly_rent: newRoom.base_rent }),
      });
      setModalType(null);
      fetchData();
    } catch (e: any) {
      setModalError(e.message || "Network error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Submit New Tenant & Lease
  const handleCreateTenantLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError("");

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(newTenantForm.email.trim())) {
      setModalError("Please provide a valid resident email address (e.g., resident@example.com).");
      setModalSubmitting(false);
      return;
    }

    const cleanPhoneDigits = newTenantForm.phone.replace(/\D/g, "");
    if (cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 15) {
      setModalError("Please provide a valid 10 to 15 digit mobile phone number.");
      setModalSubmitting(false);
      return;
    }

    try {
      // 1. Create Tenant
      const tRes = await fetch(`${API_URL}/api/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newTenantForm.full_name.trim(),
          email: newTenantForm.email.trim().toLowerCase(),
          phone: newTenantForm.phone.trim(),
        }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) {
        setModalError(tData.detail || "Failed to register tenant");
        return;
      }

      // 2. Create Lease
      const lRes = await fetch(`${API_URL}/api/leases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tData.id,
          bed_id: newTenantForm.bed_id,
          start_date: newTenantForm.start_date,
          monthly_rent: newTenantForm.monthly_rent,
          security_deposit: newTenantForm.security_deposit,
        }),
      });
      const lData = await lRes.json();
      if (!lRes.ok) {
        setModalError(lData.detail || "Failed to allocate lease");
        return;
      }

      setModalType(null);
      fetchData();
    } catch (e: any) {
      setModalError(e.message || "Network error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Submit New Maintenance Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicketForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.detail || "Failed to create ticket");
        return;
      }
      setModalType(null);
      fetchData();
    } catch (e: any) {
      setModalError(e.message || "Network error");
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="app-layout">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <aside className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StayOpsLogo size={38} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 6, color: "#0f172a" }}>
                StayOps AI
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Smart Property Operations</div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="sidebar-nav">
          <div className="sidebar-section-title">Overview</div>
          <button
            onClick={() => setActiveTab("overview")}
            className={`sidebar-item ${activeTab === "overview" ? "active" : ""}`}
          >
            <span>📊 Dashboard</span>
            {metrics?.counts?.pending_approvals > 0 && (
              <span className="badge badge-warning" style={{ fontSize: 10, padding: "2px 6px" }}>
                {metrics.counts.pending_approvals}
              </span>
            )}
          </button>

          <div className="sidebar-section-title">Smart Automation</div>
          <button
            onClick={() => setActiveTab("agent_studio")}
            className={`sidebar-item ${activeTab === "agent_studio" ? "active" : ""}`}
          >
            <span>✨ AI Operations Copilot</span>
            <span className="badge badge-purple" style={{ fontSize: 10, padding: "2px 6px" }}>
              7 Assistants
            </span>
          </button>
          <button
            onClick={() => setActiveTab("moveout_demo")}
            className={`sidebar-item ${activeTab === "moveout_demo" ? "active" : ""}`}
          >
            <span>📋 Move-Out Automation</span>
            <span className="badge badge-success" style={{ fontSize: 10, padding: "2px 6px" }}>
              15-Day
            </span>
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`sidebar-item ${activeTab === "diagnostics" ? "active" : ""}`}
          >
            <span>🩺 Platform Health</span>
          </button>

          <div className="sidebar-section-title">Operations</div>
          <button
            onClick={() => setActiveTab("properties")}
            className={`sidebar-item ${activeTab === "properties" ? "active" : ""}`}
          >
            <span>🏢 Properties &amp; Units</span>
            <span className="badge badge-neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
              {properties.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`sidebar-item ${activeTab === "tenants" ? "active" : ""}`}
          >
            <span>👥 Residents &amp; Leases</span>
            <span className="badge badge-neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
              {tenants.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("rent_ledger")}
            className={`sidebar-item ${activeTab === "rent_ledger" ? "active" : ""}`}
          >
            <span>💳 Rent Ledger &amp; Collections</span>
            {metrics?.financials?.total_outstanding > 0 && (
              <span className="badge badge-danger" style={{ fontSize: 10, padding: "2px 6px" }}>
                Overdue
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`sidebar-item ${activeTab === "maintenance" ? "active" : ""}`}
          >
            <span>🔧 Maintenance &amp; Vendors</span>
            <span className="badge badge-neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
              {tickets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`sidebar-item ${activeTab === "leads" ? "active" : ""}`}
          >
            <span>🎯 Resident Inquiries</span>
            <span className="badge badge-neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
              {leads.length}
            </span>
          </button>

          <div className="sidebar-section-title">Governance</div>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`sidebar-item ${activeTab === "approvals" ? "active" : ""}`}
          >
            <span>🛡️ Approvals Queue</span>
            {approvals.filter((a) => a.status === "pending").length > 0 && (
              <span className="badge badge-warning" style={{ fontSize: 10, padding: "2px 6px" }}>
                {approvals.filter((a) => a.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`sidebar-item ${activeTab === "notifications" ? "active" : ""}`}
          >
            <span>🔔 Action Items</span>
            {notifications?.urgent_count > 0 && (
              <span className="badge badge-danger" style={{ fontSize: 10, padding: "2px 6px" }}>
                {notifications.urgent_count}
              </span>
            )}
          </button>
        </div>

        {/* Sidebar Footer: User Card & Sign Out */}
        {currentUser && (
          <div className="sidebar-footer">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {currentUser.full_name?.charAt(0) || "U"}
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser.full_name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {currentUser.role?.replace("_", " ").toUpperCase()}
                    </div>
                    {currentUser.is_verified && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          padding: "0px 5px",
                          borderRadius: 8,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                        title="Email verified via OTP Authorization"
                      >
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#dc2626",
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                🚪
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <div className="main-content">
        {/* Sticky Top Bar */}
        <header className="top-bar">
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {activeTab === "overview" && "📊 Property Operations Dashboard"}
              {activeTab === "agent_studio" && "✨ AI Operations Copilot"}
              {activeTab === "moveout_demo" && "📋 15-Day Move-Out Automation"}
              {activeTab === "properties" && "🏢 Properties & Unit Inventory"}
              {activeTab === "tenants" && "👥 Residents & Lease Agreements"}
              {activeTab === "rent_ledger" && "💳 Rent Collections & Ledger"}
              {activeTab === "maintenance" && "🔧 Maintenance & Service Providers"}
              {activeTab === "leads" && "🎯 Resident Inquiries & Tours"}
              {activeTab === "approvals" && "🛡️ Approvals & Verification Queue"}
              {activeTab === "notifications" && "🔔 Action Items & Reminders"}
              {activeTab === "diagnostics" && "🩺 Platform Health & System Status"}
            </h1>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Smart PG &amp; Co-Living Operations Platform
            </div>
          </div>

          {/* Top Bar Actions & Demo Role Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUser ? (
              <>
                <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: 3, border: "1px solid #e2e8f0" }}>
                  <button
                    onClick={() => handleQuickLogin("property_manager")}
                    style={{
                      background: currentUser.role === "property_manager" ? "#2563eb" : "transparent",
                      color: currentUser.role === "property_manager" ? "#ffffff" : "#64748b",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    👔 Manager
                  </button>
                  <button
                    onClick={() => handleQuickLogin("admin")}
                    style={{
                      background: currentUser.role === "admin" ? "#7c3aed" : "transparent",
                      color: currentUser.role === "admin" ? "#ffffff" : "#64748b",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    🛡️ Admin
                  </button>
                  <button
                    onClick={() => handleQuickLogin("tenant")}
                    style={{
                      background: currentUser.role === "tenant" ? "#16a34a" : "transparent",
                      color: currentUser.role === "tenant" ? "#ffffff" : "#64748b",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    🏠 Resident
                  </button>
                </div>

                {/* Notifications trigger */}
                {notifications && (
                  <button
                    onClick={() => setActiveTab("notifications")}
                    style={{
                      background: notifications.urgent_count > 0 ? "#fef2f2" : "#f8fafc",
                      border: notifications.urgent_count > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: notifications.urgent_count > 0 ? "#dc2626" : "#475569",
                    }}
                  >
                    🔔 <span>{notifications.total_notifications}</span>
                    {notifications.urgent_count > 0 && (
                      <span className="badge badge-danger" style={{ fontSize: 10, padding: "1px 5px" }}>
                        {notifications.urgent_count}
                      </span>
                    )}
                  </button>
                )}

                {/* Quick Add modal buttons */}
                <button
                  onClick={() => setModalType("add_tenant")}
                  className="btn-primary"
                  style={{ fontSize: 12, padding: "7px 14px" }}
                >
                  + New Lease
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="btn-primary"
                style={{ fontSize: 13, padding: "8px 18px" }}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
        {/* ------------------------------------------------------------- */}
        {/* TAB 0: Dashboard Overview */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div>
            {/* KPI Summary Cards */}
            {metrics && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Occupancy Rate
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#2563eb" }}>
                    {metrics.occupancy?.occupancy_rate_percent}%
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {metrics.occupancy?.occupied_beds} Occupied / {metrics.occupancy?.total_beds} Total Beds
                  </div>
                </div>

                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Monthly Collected
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#16a34a" }}>
                    ₹{metrics.financials?.total_collected?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Realization: {metrics.financials?.collection_rate_percent}% Billed
                  </div>
                </div>

                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Overdue Dues
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#dc2626" }}>
                    ₹{metrics.financials?.total_outstanding?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Collections Escalation Active
                  </div>
                </div>

                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Active Residents
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#0f172a" }}>
                    {metrics.counts?.active_tenants}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {metrics.counts?.notice_tenants} on 15-Day Move-Out Notice
                  </div>
                </div>

                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Safety Approvals
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      marginTop: 6,
                      color: metrics.counts?.pending_approvals > 0 ? "#d97706" : "#64748b",
                    }}
                  >
                    {metrics.counts?.pending_approvals}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Human-in-the-Loop Gates
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard 2-Column Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Left Column: Multi-Agent Interactive Runner & Workflows */}
              <div>
                {/* Agent Quick Runner Card */}
                <div className="card" style={{ marginTop: 0, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
                        ⚡ Smart Operations Assistant
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                        Ask questions or coordinate property tasks in natural language.
                      </div>
                    </div>
                    <span className="badge badge-purple">7 Assistants Ready</span>
                  </div>

                  {/* Preset quick action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {[
                      { label: "📉 30-Day Vacancy Loss & Relist", p: "Analyze our 30-day vacancy revenue loss exposure and sort priority turnover relistings." },
                      { label: "💳 Overdue Collections & Forecast", p: "Run overdue rent collection audit, overdue aging buckets, and 30-day cashflow forecast." },
                      { label: "🔧 Maintenance Work Orders Triage", p: "Triage open maintenance tickets, evaluate severity, and check contractor availability." },
                      { label: "👥 Resident Base & Notice Audit", p: "Audit active residents, lease contracts, and move-out notices." },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setAgentPrompt(preset.p);
                          handleDispatchAgentTask(preset.p);
                        }}
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: "5px 10px" }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      value={agentPrompt}
                      onChange={(e) => setAgentPrompt(e.target.value)}
                      placeholder="Ask to audit rent dues, check room availability, schedule cleaning..."
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => handleDispatchAgentTask()}
                      disabled={dispatching || !agentPrompt}
                      className="btn-primary"
                      style={{ minWidth: 140 }}
                    >
                      {dispatching ? "Processing..." : "Execute Request"}
                    </button>
                  </div>

                  {/* Execution Response */}
                  {dispatchResult && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 16,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="badge badge-success">Task Completed</span>
                          <span style={{ fontSize: 13, color: "#64748b" }}>
                            Lead Assistant: <strong style={{ color: "#0f172a" }}>{dispatchResult.primary_agent}</strong>
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Processing Time: <strong style={{ color: "#16a34a" }}>{dispatchResult.execution_time_ms} ms</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: 13, lineHeight: 1.6, color: "#0f172a", marginBottom: 12 }}>
                        {dispatchResult.response}
                      </div>

                      {dispatchResult.trace_steps && (
                        <div style={{ borderTop: "1px solid #dbeafe", paddingTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                            Action Timeline ({dispatchResult.trace_steps.length} steps)
                          </div>
                          {dispatchResult.trace_steps.map((st: any, idx: number) => (
                            <div key={idx} style={{ fontSize: 12, padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <strong style={{ color: "#2563eb" }}>[{st.agent}]</strong> {st.summary}
                              </div>
                              <span style={{ color: "#64748b" }}>{st.execution_time_ms} ms</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Flagship Move-Out Highlight Card */}
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                        📋 Automated 15-Day Resident Move-Out
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        Automatically coordinates resident notice, rent balance, turnover maintenance, and relisting.
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("moveout_demo")}
                      className="btn-primary"
                      style={{ fontSize: 12, padding: "7px 14px" }}
                    >
                      Open Move-Out Flow →
                    </button>
                  </div>
                </div>

                {/* Recent Multi-Agent Tasks Table */}
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Recent Automated Actions</div>
                    <button onClick={() => setActiveTab("diagnostics")} className="btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }}>
                      View System Health
                    </button>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Workflow Type</th>
                        <th>Status</th>
                        <th>Tasks</th>
                        <th>Initiator</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflows.slice(0, 5).map((w) => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 600 }}>{w.workflow_type}</td>
                          <td>
                            <span className={`badge ${w.status === "completed" ? "badge-success" : "badge-warning"}`}>
                              {w.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{w.tasks_count} agent tasks</td>
                          <td style={{ fontSize: 12, color: "#64748b" }}>{w.initiator}</td>
                          <td style={{ fontSize: 12, color: "#64748b" }}>{new Date(w.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Inventory Snapshot, Urgent Alerts & Quick Launchpad */}
              <div style={{ display: "grid", gap: 20 }}>
                {/* Property Occupancy Breakdown */}
                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Property Occupancy</div>
                    <button onClick={() => setActiveTab("properties")} className="btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }}>
                      Manage All
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {properties.map((p) => {
                      const occPct = p.total_beds > 0 ? Math.round(((p.total_beds - p.available_beds) / p.total_beds) * 100) : 0;
                      return (
                        <div key={p.id} style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{p.name}</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{occPct}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {p.city} · {p.total_beds - p.available_beds}/{p.total_beds} beds occupied
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: "100%", height: 6, background: "#e2e8f0", borderRadius: 9999, marginTop: 6, overflow: "hidden" }}>
                            <div style={{ width: `${occPct}%`, height: "100%", background: "#2563eb", borderRadius: 9999 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Urgent Operational Alerts */}
                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                    ⚠️ Urgent Operational Items
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {approvals.filter((a) => a.status === "pending").length > 0 && (
                      <div
                        onClick={() => setActiveTab("approvals")}
                        style={{
                          cursor: "pointer",
                          padding: "10px 12px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#b45309" }}>
                          🛡️ {approvals.filter((a) => a.status === "pending").length} Approvals Awaiting Decision
                        </div>
                        <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>
                          Human-in-the-loop safety gating requires review →
                        </div>
                      </div>
                    )}

                    {tickets.filter((t) => t.severity === "Emergency" && t.status !== "resolved").length > 0 && (
                      <div
                        onClick={() => setActiveTab("maintenance")}
                        style={{
                          cursor: "pointer",
                          padding: "10px 12px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#dc2626" }}>
                          🔧 Emergency Repairs Pending
                        </div>
                        <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>
                          Click to view triage and vendor assignment →
                        </div>
                      </div>
                    )}

                    <div
                      onClick={() => setActiveTab("rent_ledger")}
                      style={{
                        cursor: "pointer",
                        padding: "10px 12px",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#1d4ed8" }}>
                        💳 Collections Recovery
                      </div>
                      <div style={{ fontSize: 11, color: "#1e40af", marginTop: 2 }}>
                        {rentRecords.filter((r) => r.status === "overdue").length} overdue notices ready for follow-up →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Launchpad */}
                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚡ Quick Launchpad</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button
                      onClick={() => setModalType("add_tenant")}
                      className="btn-primary"
                      style={{ width: "100%", textAlign: "center", fontSize: 13 }}
                    >
                      + Register Resident &amp; Lease
                    </button>
                    <button
                      onClick={() => setModalType("add_property")}
                      className="btn-secondary"
                      style={{ width: "100%", textAlign: "center", fontSize: 13 }}
                    >
                      + Add Managed Property
                    </button>
                    <button
                      onClick={() => setModalType("create_ticket")}
                      className="btn-secondary"
                      style={{ width: "100%", textAlign: "center", fontSize: 13 }}
                    >
                      + Submit Maintenance Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
{activeTab === "agent_studio" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>
                  ✨ AI Operations Copilot
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Directly dispatch natural-language operations requests to the 7 specialized assistants.
                </div>
              </div>
            </div>

            {/* Registered Agents Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {availableAgents.map((ag) => (
                <div
                  key={ag.id}
                  onClick={() => setTargetAgent(targetAgent === ag.id ? "" : ag.id)}
                  className="card"
                  style={{
                    marginTop: 0,
                    padding: 16,
                    cursor: "pointer",
                    borderColor: targetAgent === ag.id ? "#2563eb" : "#e2e8f0",
                    backgroundColor: targetAgent === ag.id ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{ag.name}</div>
                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                      Online
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#4f46e5", marginTop: 2 }}>{ag.member}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{ag.role}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {ag.tools.slice(0, 3).map((t: string) => (
                      <span key={t} style={{ fontSize: 10, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt Console Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Prompt Central Orchestrator
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                Target:{" "}
                <span style={{ color: targetAgent ? "#60a5fa" : "#34d399", fontWeight: 700 }}>
                  {targetAgent ? `Specific (${targetAgent})` : "Auto-Routing (Orchestrator Evaluates Keywords)"}
                </span>
              </div>

              {/* Preset Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {[
                  { label: "📉 30-Day Vacancy Loss & Relist Queue", p: "Analyze our 30-day vacancy revenue loss exposure and sort priority turnover relistings." },
                  { label: "💳 Overdue Rent Collections & Forecast", p: "Run overdue rent collection audit, overdue aging buckets, and 30-day cashflow forecast." },
                  { label: "🔧 Maintenance Work Orders & Contractor Triage", p: "Triage open maintenance tickets, evaluate severity, and check contractor availability." },
                  { label: "👥 Resident Base & Notice Audit", p: "Audit active residents, lease contracts, and move-out notices." },
                  { label: "🩺 Full Multi-Agent Bus Diagnostics", p: "Execute comprehensive multi-agent bus health audit, diagnostics, and resilience telemetry." },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setAgentPrompt(preset.p);
                      handleDispatchAgentTask(preset.p);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: 12 }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Enter custom instructions for StayOps multi-agent operations..."
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => handleDispatchAgentTask()}
                  disabled={dispatching || !agentPrompt}
                  className="btn-primary"
                  style={{ minWidth: 140 }}
                >
                  {dispatching ? "Executing..." : "Dispatch Task"}
                </button>
              </div>

              {/* Execution Result Box */}
              {dispatchResult && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 20,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="badge badge-success">Workflow Completed</span>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Primary Agent: <strong style={{ color: "#0f172a" }}>{dispatchResult.primary_agent}</strong>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Latency: <strong style={{ color: "#16a34a" }}>{dispatchResult.execution_time_ms} ms</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#0f172a", marginBottom: 16 }}>
                    {dispatchResult.response}
                  </div>

                  {/* Step-by-Step Trace */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                      Trace Audit Steps ({dispatchResult.trace_steps?.length || 0})
                    </div>
                    {dispatchResult.trace_steps?.map((step: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          padding: "6px 0",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#2563eb" }}>[{step.agent}]</strong> {step.summary}
                        </div>
                        <div style={{ color: "#64748b" }}>{step.execution_time_ms} ms</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: Flagship 15-Day Move-Out Multi-Agent Workflow */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "moveout_demo" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>
                ★ 15-Day Move-Out Multi-Agent Coordination
              </h2>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Simulates simultaneous collaboration across Tenant Support, Vacancy Revenue, Collections, Leasing, and Maintenance with supervisory Facilitator approval gating.
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                    Select Tenant on Move-Out Notice:
                  </label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.property_name} · Room {t.room_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                    Notice Days (Policy requirement: 15):
                  </label>
                  <input
                    type="number"
                    value={demoNoticeDays}
                    onChange={(e) => setDemoNoticeDays(Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                </div>

                <button
                  onClick={triggerMoveOutDemo}
                  disabled={runningWorkflow || !selectedTenantId}
                  className="btn-primary"
                  style={{ height: 42, minWidth: 180 }}
                >
                  {runningWorkflow ? "Orchestrating..." : "Execute Workflow"}
                </button>
              </div>

              {moveOutResult && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 20,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      Workflow Summary: <span style={{ color: "#16a34a" }}>{moveOutResult.status.toUpperCase()}</span>
                    </div>
                    {moveOutResult.pending_approval && (
                      <span className="badge badge-warning">Safety Gate: Manager Approval Pending</span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Tenant &amp; Room</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{moveOutResult.tenant_name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{moveOutResult.property_name} · Room {moveOutResult.room_number}</div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Rent &amp; Deposit</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        Dues: ₹{moveOutResult.rent_status?.outstanding_balance || 0}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Deposit: ₹{moveOutResult.rent_status?.security_deposit || 0}
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Vacancy Recovery</div>
                      <div style={{ fontWeight: 600, marginTop: 4, color: "#2563eb" }}>
                        {moveOutResult.vacancy_recovery?.matched_lead_count || 0} Leads Matched
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Immediate relist triggered</div>
                    </div>

                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Turnover Inspection</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        Est: ₹{moveOutResult.maintenance_turnover?.estimated_cost || 0}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Vendor: {moveOutResult.maintenance_turnover?.vendor_name || "General Maintenance"}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {moveOutResult.timeline && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        Multi-Agent Event Timeline
                      </div>
                      {moveOutResult.timeline.map((step: any, i: number) => (
                        <div key={i} style={{ fontSize: 13, padding: "4px 0", color: "#334155" }}>
                          ✓ <strong style={{ color: "#2563eb" }}>{step.agent}:</strong> {step.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: Properties & Units */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "properties" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Managed Properties &amp; Inventory</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Physical buildings, room types, bed inventory, and live availability.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModalType("add_room")} className="btn-secondary">
                  + Add Room
                </button>
                <button onClick={() => setModalType("add_property")} className="btn-primary">
                  + Add Property
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
              {properties.map((p) => (
                <div key={p.id} className="card" style={{ marginTop: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                    <span className="badge">{p.code}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{p.address}, {p.city}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "16px 0" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{p.total_rooms}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Rooms</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{p.total_beds}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Total Beds</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{p.available_beds}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Available</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    <strong>Amenities:</strong> {p.amenities?.join(" · ")}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    <strong>Rules:</strong> {p.rules_summary}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Inventory List */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>Room &amp; Bed Configurations</h3>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room #</th>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Base Rent</th>
                    <th>Status</th>
                    <th>Beds</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.room_number}</td>
                      <td>{r.property_name}</td>
                      <td>{r.room_type}</td>
                      <td>₹{r.base_rent?.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${r.is_available ? "badge-success" : "badge-warning"}`}>
                          {r.is_available ? "Available" : "Full"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {r.beds?.map((b: any) => (
                            <span
                              key={b.id}
                              className={`badge ${b.status === "available" ? "badge-success" : "badge-warning"}`}
                              style={{ fontSize: 11 }}
                            >
                              Bed {b.label}: {b.status}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: Residents & Leases */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "tenants" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Resident Directory &amp; Leases</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Active leases, contact information, and bed allocation.
                </div>
              </div>
              <button onClick={() => setModalType("add_tenant")} className="btn-primary">
                + Register Tenant &amp; Lease
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident Name</th>
                    <th>Contact</th>
                    <th>Property &amp; Room</th>
                    <th>Bed</th>
                    <th>Monthly Rent</th>
                    <th>Lease Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.full_name}</td>
                      <td style={{ fontSize: 13, color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>✉️ {t.email}</span>
                          {t.email && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#16a34a",
                                background: "#dcfce7",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span>📞 {t.phone}</span>
                          {t.phone && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#16a34a",
                                background: "#dcfce7",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>{t.property_name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Room {t.room_number}</div>
                      </td>
                      <td>
                        <span className="badge">{t.bed_label}</span>
                      </td>
                      <td>₹{t.monthly_rent?.toLocaleString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            t.status === "active"
                              ? "badge-success"
                              : t.status === "notice"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedTenantId(t.id);
                            setActiveTab("moveout_demo");
                          }}
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Notice Workflow
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: Rent Ledger & Financials */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "rent_ledger" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Rent Billing &amp; Payment Ledger</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Itemized invoices, overdue balances, and simulated payment receipt recording.
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Room</th>
                    <th>Billing Month</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rentRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.tenant_name}</td>
                      <td>Room {r.room_number}</td>
                      <td>{r.billing_month}</td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{r.due_date}</td>
                      <td>₹{r.amount_due?.toLocaleString()}</td>
                      <td style={{ color: "#16a34a" }}>₹{r.amount_paid?.toLocaleString()}</td>
                      <td style={{ color: r.balance_remaining > 0 ? "#f87171" : "#9aa7bd", fontWeight: 700 }}>
                        ₹{r.balance_remaining?.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === "paid"
                              ? "badge-success"
                              : r.status === "overdue"
                              ? "badge-danger"
                              : "badge-warning"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {r.balance_remaining > 0 && (
                          <button
                            onClick={() => {
                              setSelectedRentRecord(r);
                              setPaymentAmount(r.balance_remaining);
                              setModalType("pay_rent");
                            }}
                            className="btn-primary"
                            style={{ fontSize: 11, padding: "5px 10px" }}
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: Maintenance & Vendors */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "maintenance" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Maintenance &amp; Contractor Management</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Work orders, severity triage, SLA response, and accredited vendors.
                </div>
              </div>
              <button onClick={() => setModalType("create_ticket")} className="btn-primary">
                + New Maintenance Ticket
              </button>
            </div>

            {/* Tickets Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title &amp; Issue</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Estimated Cost</th>
                    <th>Assigned Vendor</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{t.description}</div>
                      </td>
                      <td>{t.category}</td>
                      <td>
                        <span
                          className={`badge ${
                            t.severity === "Emergency"
                              ? "badge-danger"
                              : t.severity === "High"
                              ? "badge-warning"
                              : ""
                          }`}
                        >
                          {t.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${t.status === "resolved" ? "badge-success" : "badge-warning"}`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>₹{t.estimated_cost?.toLocaleString()}</td>
                      <td>{t.vendor_name}</td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{t.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vendors Directory */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Accredited Service Vendors</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {vendors.map((v) => (
                <div key={v.id} className="card" style={{ marginTop: 0, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{v.name}</div>
                    <span className="badge badge-success">★ {v.rating}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Trade: {v.category}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Phone: {v.phone}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", marginTop: 8 }}>
                    ₹{v.hourly_rate} / hour
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: Leads Pipeline */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "leads" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Prospective Tenant Leads Pipeline</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Inquiries, room matching, and automated visit scheduling.
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead Name</th>
                    <th>Phone</th>
                    <th>Location Preference</th>
                    <th>Room Type</th>
                    <th>Budget</th>
                    <th>Move-in Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.full_name}</td>
                      <td style={{ fontSize: 13, color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>📞 {l.phone}</span>
                          {l.phone && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#16a34a",
                                background: "#dcfce7",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{l.preferred_location}</td>
                      <td>{l.preferred_room_type}</td>
                      <td>₹{l.budget?.toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{l.move_in_date || "Flexible"}</td>
                      <td>
                        <span className="badge badge-purple">{l.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 8: Approvals Queue */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "approvals" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Human-in-the-Loop Approval Queue</h2>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                High-cost turnover repairs, security deposit deductions, and sensitive multi-agent safety gates.
              </div>
            </div>

            {approvals.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                ✓ No pending approval requests. All agent operations compliant.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {approvals.map((appr) => (
                  <div key={appr.id} className="card" style={{ marginTop: 0, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{appr.description}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          Originating Agent: <strong style={{ color: "#2563eb" }}>{appr.agent_name}</strong> · Type: {appr.action_type}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>
                          ₹{appr.estimated_cost?.toLocaleString()}
                        </div>
                        <span className={`badge ${appr.status === "approved" ? "badge-success" : appr.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                          {appr.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {appr.status === "pending" && (
                      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                        <button onClick={() => handleApproval(appr.id, "rejected")} className="btn-secondary" style={{ color: "#dc2626" }}>
                          Reject Action
                        </button>
                        <button onClick={() => handleApproval(appr.id, "approved")} className="btn-primary">
                          Authorize Execution
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 9: Notifications & Urgent Recommendations */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "notifications" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Operational Alerts &amp; Recommendations</h2>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Real-time compilation of overdue collections, pending safety gates, emergency repairs, and vacancy suggestions.
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {notifications?.notifications?.map((n: any) => (
                <div
                  key={n.id}
                  className="card"
                  style={{
                    marginTop: 0,
                    padding: 16,
                    borderLeft: `4px solid ${
                      n.severity === "critical"
                        ? "#ef4444"
                        : n.severity === "urgent"
                        ? "#f59e0b"
                        : n.severity === "warning"
                        ? "#fbbf24"
                        : "#3b82f6"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{n.title}</div>
                    <span
                      className={`badge ${
                        n.severity === "critical" || n.severity === "urgent"
                          ? "badge-danger"
                          : n.severity === "warning"
                          ? "badge-warning"
                          : ""
                      }`}
                    >
                      {n.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>{n.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 10: Platform Health & Diagnostics */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "diagnostics" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 20, fontWeight: 700 }}>Platform Health &amp; Diagnostics</h2>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Live health verification across smart assistants, primary database integrity, and task queues.
              </div>
            </div>

            {diagnostics && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="card" style={{ marginTop: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Active Assistants &amp; Services</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {diagnostics.agent_bus?.agents?.map((a: any) => (
                      <div
                        key={a.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "#f8fafc", border: "1px solid #f1f5f9",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <strong style={{ color: "#2563eb" }}>{a.name}</strong> · {a.role}
                        </div>
                        <span className="badge badge-success">{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginTop: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>System Status &amp; Reliability</div>
                  <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Parallel Task Engine:</span>
                      <strong style={{ color: "#16a34a" }}>{diagnostics.subsystem_resilience?.parallel_executor}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Facilitator Supervisor:</span>
                      <strong style={{ color: "#16a34a" }}>{diagnostics.subsystem_resilience?.facilitator_supervision}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Background Task Queue:</span>
                      <strong style={{ color: "#16a34a" }}>{diagnostics.subsystem_resilience?.dead_letter_queue}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Completed Workflows:</span>
                      <strong>{diagnostics.system_state?.completed_workflows_count}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Pay Rent */}
      {/* ------------------------------------------------------------- */}
      {modalType === "pay_rent" && selectedRentRecord && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Record Resident Payment</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Simulates verified rent payment receipt against {selectedRentRecord.tenant_name}&apos;s billing notice.
            </div>

            {modalError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{modalError}</div>}

            <form onSubmit={handlePayRentSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Amount to Record (₹):</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  max={selectedRentRecord.balance_remaining}
                  min={1}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Payment Channel:</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="UPI">UPI (Google Pay / PhonePe)</option>
                  <option value="Bank Transfer">NEFT / RTGS Bank Transfer</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Cash">Cash at Reception</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting} className="btn-primary">
                  {modalSubmitting ? "Recording..." : "Record Payment Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Add Property */}
      {/* ------------------------------------------------------------- */}
      {modalType === "add_property" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Add Managed PG Property</h3>
            {modalError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{modalError}</div>}
            <form onSubmit={handleCreateProperty}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Property Name:</label>
                <input
                  type="text"
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  placeholder="e.g. StayOps Residency - HSR Layout"
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Property Code:</label>
                <input
                  type="text"
                  value={newProperty.code}
                  onChange={(e) => setNewProperty({ ...newProperty, code: e.target.value })}
                  placeholder="e.g. SO-BLR-HSR"
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Address:</label>
                <input
                  type="text"
                  value={newProperty.address}
                  onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  placeholder="Sector 2, HSR Layout"
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>City:</label>
                  <input
                    type="text"
                    value={newProperty.city}
                    onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total Floors:</label>
                  <input
                    type="number"
                    value={newProperty.total_floors}
                    onChange={(e) => setNewProperty({ ...newProperty, total_floors: Number(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting} className="btn-primary">
                  {modalSubmitting ? "Creating..." : "Save Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Add Room */}
      {/* ------------------------------------------------------------- */}
      {modalType === "add_room" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Add Room to Property</h3>
            {modalError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{modalError}</div>}
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Target Property:</label>
                <select
                  value={newRoom.property_id}
                  onChange={(e) => setNewRoom({ ...newRoom, property_id: e.target.value })}
                  required
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Room Number:</label>
                  <input
                    type="text"
                    value={newRoom.room_number}
                    onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                    placeholder="e.g. 202"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Floor Number:</label>
                  <input
                    type="number"
                    value={newRoom.floor_number}
                    onChange={(e) => setNewRoom({ ...newRoom, floor_number: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Room Type:</label>
                  <select
                    value={newRoom.room_type}
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Triple">Triple</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Monthly Rent (₹):</label>
                  <input
                    type="number"
                    value={newRoom.base_rent}
                    onChange={(e) => setNewRoom({ ...newRoom, base_rent: Number(e.target.value) })}
                    min={1000}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting} className="btn-primary">
                  {modalSubmitting ? "Creating..." : "Save Room &amp; Bed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Add Tenant & Lease (Includes Explicit Property Selection) */}
      {/* ------------------------------------------------------------- */}
      {modalType === "add_tenant" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700 }}>Register Resident &amp; Allocate Lease</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Select a managed property, assign an available bed, and create the lease agreement.
            </div>
            {modalError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{modalError}</div>}
            <form onSubmit={handleCreateTenantLease}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Full Name:</label>
                <input
                  type="text"
                  value={newTenantForm.full_name}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, full_name: e.target.value })}
                  placeholder="e.g. Priya Sundaram"
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                    Email Address: <span style={{ fontSize: 11, color: "#16a34a" }}>✓ Verified format</span>
                  </label>
                  <input
                    type="email"
                    value={newTenantForm.email}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                    placeholder="priya@example.com"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                    Phone Number: <span style={{ fontSize: 11, color: "#16a34a" }}>✓ 10-digit mobile</span>
                  </label>
                  <input
                    type="tel"
                    value={newTenantForm.phone}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>

              {/* 1. Property Selector (All properties appear here immediately) */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                  Select Property:
                </label>
                <select
                  value={newTenantForm.property_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const propRooms = rooms.filter((r) => r.property_id === pid);
                    const availBed = propRooms.flatMap((r) => (r.beds || []).filter((b: any) => b.status === "available"))[0];
                    setNewTenantForm({
                      ...newTenantForm,
                      property_id: pid,
                      bed_id: availBed ? availBed.id : "",
                      monthly_rent: availBed ? availBed.rent : newTenantForm.monthly_rent,
                      security_deposit: availBed ? availBed.rent * 2 : newTenantForm.security_deposit,
                    });
                  }}
                  required
                >
                  <option value="">-- Choose Managed Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city}) · {p.available_beds || 0} Available Beds
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Bed Selector filtered by chosen property */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                  Assign Available Bed:
                </label>
                {(() => {
                  const targetRooms = rooms.filter(
                    (r) => !newTenantForm.property_id || r.property_id === newTenantForm.property_id
                  );
                  const availableBeds = targetRooms.flatMap((r) =>
                    (r.beds || [])
                      .filter((b: any) => b.status === "available")
                      .map((b: any) => ({
                        ...b,
                        room_number: r.room_number,
                        property_name: r.property_name,
                        property_id: r.property_id,
                      }))
                  );

                  if (availableBeds.length === 0) {
                    return (
                      <div
                        style={{
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          padding: "12px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          color: "#92400e",
                        }}
                      >
                        <div>⚠️ No vacant beds found for this property currently.</div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newTenantForm.property_id) {
                              setModalError("Please select a property first.");
                              return;
                            }
                            try {
                              const rRes = await fetch(`${API_URL}/api/rooms`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  property_id: newTenantForm.property_id,
                                  room_number: `10${Math.floor(Math.random() * 90 + 10)}`,
                                  floor_number: 1,
                                  room_type: "Double",
                                  base_rent: 11000,
                                }),
                              });
                              const rData = await rRes.json();
                              if (rRes.ok && rData.id) {
                                const bRes = await fetch(`${API_URL}/api/rooms/${rData.id}/beds`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ bed_label: "A", status: "available", monthly_rent: 11000 }),
                                });
                                const bData = await bRes.json();
                                await fetchData();
                                if (bRes.ok && bData.id) {
                                  setNewTenantForm((prev) => ({
                                    ...prev,
                                    bed_id: bData.id,
                                    monthly_rent: 11000,
                                    security_deposit: 22000,
                                  }));
                                }
                              }
                            } catch (err: any) {
                              setModalError(err.message || "Failed to auto-create room and bed.");
                            }
                          }}
                          className="btn-secondary"
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            padding: "6px 12px",
                            borderColor: "#f59e0b",
                            color: "#b45309",
                            background: "#ffffff",
                          }}
                        >
                          + Quick-Provision Room &amp; Available Bed for this Property
                        </button>
                      </div>
                    );
                  }

                  return (
                    <select
                      value={newTenantForm.bed_id}
                      onChange={(e) => {
                        const bid = e.target.value;
                        const matched = availableBeds.find((b) => b.id === bid);
                        setNewTenantForm({
                          ...newTenantForm,
                          bed_id: bid,
                          property_id: matched ? matched.property_id : newTenantForm.property_id,
                          monthly_rent: matched && matched.rent ? matched.rent : newTenantForm.monthly_rent,
                          security_deposit: matched && matched.rent ? matched.rent * 2 : newTenantForm.security_deposit,
                        });
                      }}
                      required
                    >
                      <option value="">-- Choose an Available Bed --</option>
                      {availableBeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.property_name} · Room {b.room_number} · Bed {b.label} (₹{b.rent || b.monthly_rent}/mo)
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Monthly Rent (₹):</label>
                  <input
                    type="number"
                    value={newTenantForm.monthly_rent}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, monthly_rent: Number(e.target.value) })}
                    min={1000}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Security Deposit (₹):</label>
                  <input
                    type="number"
                    value={newTenantForm.security_deposit}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, security_deposit: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting || !newTenantForm.bed_id} className="btn-primary">
                  {modalSubmitting ? "Allocating..." : "Create Lease"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Create Ticket */}
      {/* ------------------------------------------------------------- */}
      {modalType === "create_ticket" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Submit Maintenance Ticket</h3>
            {modalError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{modalError}</div>}
            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Property:</label>
                <select
                  value={newTicketForm.property_id}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, property_id: e.target.value })}
                  required
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Issue Title:</label>
                <input
                  type="text"
                  value={newTicketForm.title}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, title: e.target.value })}
                  placeholder="e.g. Geyser water not heating"
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Category:</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Appliance">Appliance</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Wi-Fi">Wi-Fi</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Severity:</label>
                  <select
                    value={newTicketForm.severity}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, severity: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 4 }}>Description:</label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  rows={3}
                  placeholder="Describe location and symptoms..."
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting} className="btn-primary">
                  {modalSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Sign In / Access Gate (Mandatory on Boot if No Session) */}
      {/* ------------------------------------------------------------- */}
      {authModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            // Only dismissable if user already has an active session
            if (currentUser) setAuthModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 480, padding: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                <StayOpsLogo size={52} />
              </div>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {authMode === "login"
                  ? "Sign In to StayOps AI"
                  : authStep === "otp"
                  ? "Verify Email via OTP"
                  : "Create StayOps Account"}
              </h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {authMode === "login"
                  ? "Smart PG & Co-Living Operations Platform"
                  : authStep === "otp"
                  ? "Enter the 6-digit authorization code dispatched to your email"
                  : "Secure Registration with Email OTP Verification"}
              </div>
            </div>

            {/* Registration Step Indicator */}
            {authMode === "register" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: authStep === "details" ? 700 : 500,
                    color: authStep === "details" ? "#2563eb" : "#16a34a",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: authStep === "details" ? "#eff6ff" : "#dcfce7",
                      border: `1.5px solid ${authStep === "details" ? "#2563eb" : "#16a34a"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {authStep === "otp" ? "✓" : "1"}
                  </span>
                  Details
                </div>
                <div style={{ width: 28, height: 2, background: authStep === "otp" ? "#16a34a" : "#e2e8f0", borderRadius: 1 }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: authStep === "otp" ? 700 : 500,
                    color: authStep === "otp" ? "#2563eb" : "#94a3b8",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: authStep === "otp" ? "#eff6ff" : "#f1f5f9",
                      border: `1.5px solid ${authStep === "otp" ? "#2563eb" : "#cbd5e1"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    2
                  </span>
                  Verify OTP
                </div>
              </div>
            )}

            {authError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {authError}
              </div>
            )}

            {/* Quick 1-Click Demo Logins */}
            {authMode === "login" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Quick 1-Click Demo Login
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("property_manager")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>👔 Property Manager</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>manager@stayops.ai</div>
                    </div>
                    <span className="badge" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      Instant Access →
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>🛡️ System Administrator</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>admin@stayops.ai</div>
                    </div>
                    <span className="badge" style={{ background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>
                      Instant Access →
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("tenant")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#16a34a")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>🏠 Resident Tenant</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>resident@stayops.ai</div>
                    </div>
                    <span className="badge" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                      Instant Access →
                    </span>
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    margin: "20px 0 16px 0",
                    color: "#94a3b8",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  <span style={{ padding: "0 10px" }}>Or sign in with email</span>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                </div>
              </div>
            )}

            {authMode === "register" && authStep === "otp" ? (
              <form onSubmit={handleAuthSubmit}>
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 13, color: "#166534", fontWeight: 700, marginBottom: 2 }}>
                    📧 Verification Code Dispatched
                  </div>
                  <div style={{ fontSize: 12, color: "#15803d", lineHeight: 1.4 }}>
                    We dispatched an authorization code to <strong>{authEmail}</strong>. Please enter the 6 digits below to complete your registration.
                  </div>
                </div>

                {devOtp && (
                  <div
                    onClick={() => setAuthOtp(devOtp)}
                    title="Click to auto-fill verification code"
                    style={{
                      background: "#eff6ff",
                      border: "1.5px dashed #93c5fd",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 16,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#1e40af" }}>
                      🔑 <strong>Dev/Demo OTP:</strong>{" "}
                      <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, letterSpacing: 2, background: "#dbeafe", padding: "2px 6px", borderRadius: 4 }}>
                        {devOtp}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>Click to fill ↵</span>
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 6 }}>
                    Enter 6-Digit Verification Code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{
                      fontSize: 24,
                      letterSpacing: "0.35em",
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      padding: "12px",
                      background: "#f8fafc",
                      border: "2px solid #2563eb",
                      borderRadius: 8,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    autoFocus
                    required
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setAuthStep("details")}
                      style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", padding: 0 }}
                    >
                      ← Back to edit info
                    </button>
                    <button
                      type="button"
                      disabled={otpCountdown > 0 || otpLoading}
                      onClick={() => handleSendOtp()}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: otpCountdown > 0 ? "#94a3b8" : "#2563eb",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: otpCountdown > 0 ? "default" : "pointer",
                        padding: 0,
                      }}
                    >
                      {otpLoading ? "Sending..." : otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend Code"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                  <button type="button" onClick={() => setAuthStep("details")} className="btn-secondary">
                    Back
                  </button>
                  <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                    ✓ Verify &amp; Complete Registration
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Full Name:</label>
                      <input
                        type="text"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="e.g. Sonal Sharma"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Role:</label>
                      <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                        <option value="property_manager">Property Manager</option>
                        <option value="admin">System Administrator</option>
                        <option value="tenant">Resident / Tenant</option>
                      </select>
                    </div>
                  </>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Email Address:</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="manager@stayops.ai"
                    required
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Password:</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => toggleAuthMode(authMode === "login" ? "register" : "login")}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 500, padding: 0, cursor: "pointer" }}
                  >
                    {authMode === "login" ? "Need an account? Register" : "Already registered? Sign In"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  {currentUser && (
                    <button type="button" onClick={() => setAuthModalOpen(false)} className="btn-secondary">
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn-primary" style={{ width: currentUser ? "auto" : "100%" }} disabled={otpLoading}>
                    {authMode === "login"
                      ? "Sign In"
                      : otpLoading
                      ? "Sending Code..."
                      : "Continue to Verify Email (OTP) →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

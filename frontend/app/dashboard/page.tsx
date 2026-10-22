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
  const [leases, setLeases] = useState<any[]>([]);

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

  const isTenant = currentUser?.role === "tenant";
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "property_manager" || isAdmin;

  // Filter personal data for residents
  const myTenant = tenants.find(
    (t) =>
      t.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
      t.full_name?.toLowerCase().includes("rohan") ||
      t.full_name?.toLowerCase() === currentUser?.full_name?.toLowerCase()
  ) || tenants[0];

  const myLease = leases.find((l) => l.tenant_id === myTenant?.id) || {
    id: "LSE-DEMO-01",
    room_number: "101",
    bed_label: "Bed A",
    property_name: "StayOps Indiranagar Luxury PG",
    monthly_rent: 16000,
    security_deposit: 32000,
    start_date: "2026-06-01",
    status: "active",
  };

  const myRentRecords = rentRecords.filter(
    (r) => r.tenant_id === myTenant?.id || r.tenant_name === myTenant?.full_name
  );

  const myTickets = tickets.filter(
    (t) => t.tenant_id === myTenant?.id || t.room_id === myLease?.room_id
  );
  const [devOtp, setDevOtp] = useState<string>("");
  const [otpSentMessage, setOtpSentMessage] = useState<string>("");
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  // External Integrations & Comms state
  const [integrationsStatus, setIntegrationsStatus] = useState<any>(null);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [testEmailTo, setTestEmailTo] = useState<string>("manager@stayops.ai");
  const [testEmailSub, setTestEmailSub] = useState<string>("StayOps Operations Update");
  const [testEmailMsg, setTestEmailMsg] = useState<string>("Pre-checkout room turnover inspection passed all criteria.");
  const [testWaPhone, setTestWaPhone] = useState<string>("9779825016096");
  const [testWaMsg, setTestWaMsg] = useState<string>("Hi resident, your scheduled property inspection is confirmed for tomorrow 11:00 AM.");
  const [commsFeedback, setCommsFeedback] = useState<string>("");
  const [activeCommsSubTab, setActiveCommsSubTab] = useState<"status" | "email" | "calendar" | "whatsapp">("status");

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
      const [hRes, mRes, pRes, rRes, tRes, rrRes, lRes, tkRes, vRes, aRes, wRes, nRes, agRes, dRes, intRes, emHRes, calRes, waHRes] =
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
          fetch(`${API_URL}/api/integrations/status`).then((r) => r.json()).catch(() => null),
          fetch(`${API_URL}/api/notifications/history`).then((r) => r.json()).catch(() => ({ emails: [] })),
          fetch(`${API_URL}/api/calendar/events`).then((r) => r.json()).catch(() => ({ events: [] })),
          fetch(`${API_URL}/api/notifications/whatsapp`).then((r) => r.json()).catch(() => ({ messages: [] })),
          fetch(`${API_URL}/api/leases`).then((r) => r.json()).catch(() => []),
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
      setIntegrationsStatus(intRes);
      setEmailHistory(emHRes?.emails || []);
      setCalendarEvents(calRes?.events || []);
      setWhatsappLogs(waHRes?.messages || []);
      setLeases((arguments[0] && Array.isArray(arguments[0][17])) ? arguments[0][17] : []);


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
      email = "contact@sashankkarn.com.np";
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

  // External Integrations Handlers
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommsFeedback("Dispatching email...");
    try {
      const res = await fetch(`${API_URL}/api/notifications/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: testEmailTo,
          subject: testEmailSub,
          message: testEmailMsg,
        }),
      });
      const data = await res.json();
      setCommsFeedback(`✓ Email ${data.status === "sent" ? "delivered live via SMTP" : "recorded in development log"} (Recipient: ${data.recipient || testEmailTo})`);
      fetchData();
    } catch (err: any) {
      setCommsFeedback(`✗ Email dispatch failed: ${err.message}`);
    }
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommsFeedback("Dispatching WhatsApp...");
    try {
      const res = await fetch(`${API_URL}/api/notifications/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_phone: testWaPhone,
          preview_text: testWaMsg,
          template_name: "hello_world",
        }),
      });
      const data = await res.json();
      setCommsFeedback(`✓ WhatsApp ${data.status === "sent" ? "sent via Meta Cloud API" : "recorded in simulator inbox"} (Normalized: ${data.normalized_phone || testWaPhone})`);
      fetchData();
    } catch (err: any) {
      setCommsFeedback(`✗ WhatsApp dispatch failed: ${err.message}`);
    }
  };

  const handleScheduleTestCalendar = async () => {
    setCommsFeedback("Booking operations event on calendar...");
    try {
      const res = await fetch(`${API_URL}/api/calendar/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "room_inspection",
          title: "Pre-Checkout Inspection: Unit 201",
          start_time: new Date(Date.now() + 86400000).toISOString(),
          duration_minutes: 45,
          location: "StayOps PG Indiranagar",
          attendee_name: "Resident Lead",
          attendee_email: "resident@stayops.ai",
          description: "Room turnover and checkout condition audit.",
        }),
      });
      const data = await res.json();
      setCommsFeedback(`✓ Event booked: ${data.title} (${data.status})`);
      fetchData();
    } catch (err: any) {
      setCommsFeedback(`✗ Calendar booking failed: ${err.message}`);
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
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <StayOpsLogo size={38} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 6, color: "#0f172a" }}>
                StayOps AI
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Smart Property Operations</div>
            </div>
          </a>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="sidebar-nav">
          {isTenant ? (
            <>
              <div className="sidebar-section-title">Resident Portal</div>
              <button
                onClick={() => setActiveTab("overview")}
                className={`sidebar-item ${activeTab === "overview" ? "active" : ""}`}
              >
                <span>🏠 My Room &amp; Living</span>
              </button>
              <button
                onClick={() => setActiveTab("my_rent")}
                className={`sidebar-item ${activeTab === "my_rent" ? "active" : ""}`}
              >
                <span>💳 My Rent &amp; Receipts</span>
                {myRentRecords.some((r) => r.status === "overdue") && (
                  <span className="badge badge-danger" style={{ fontSize: 10, padding: "2px 6px" }}>
                    Due
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("my_tickets")}
                className={`sidebar-item ${activeTab === "my_tickets" ? "active" : ""}`}
              >
                <span>🔧 Maintenance Requests</span>
                <span className="badge badge-neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
                  {myTickets.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("my_moveout")}
                className={`sidebar-item ${activeTab === "my_moveout" ? "active" : ""}`}
              >
                <span>📋 15-Day Move-Out</span>
              </button>
              <button
                onClick={() => setActiveTab("agent_studio")}
                className={`sidebar-item ${activeTab === "agent_studio" ? "active" : ""}`}
              >
                <span>💬 Resident AI Copilot</span>
              </button>
            </>
          ) : (
            <>
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
              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab("integrations")}
                    className={`sidebar-item ${activeTab === "integrations" ? "active" : ""}`}
                  >
                    <span>🔌 Services &amp; Comms</span>
                    <span className="badge badge-purple" style={{ fontSize: 10, padding: "2px 6px" }}>
                      Admin
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("diagnostics")}
                    className={`sidebar-item ${activeTab === "diagnostics" ? "active" : ""}`}
                  >
                    <span>🩺 Platform Health</span>
                  </button>
                </>
              )}

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
            </>
          )}
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
              {isTenant ? (
                <>
                  {activeTab === "overview" && "🏠 Resident Living & Unit Portal"}
                  {activeTab === "my_rent" && "💳 My Rent Dues & Payment Receipts"}
                  {activeTab === "my_tickets" && "🔧 My Maintenance & Repair Requests"}
                  {activeTab === "my_moveout" && "📋 15-Day Move-Out Notice"}
                  {activeTab === "agent_studio" && "💬 StayOps AI Resident Assistant"}
                </>
              ) : (
                <>
                  {activeTab === "overview" && "📊 Property Operations Dashboard"}
                  {activeTab === "agent_studio" && "✨ AI Operations Copilot"}
                  {activeTab === "moveout_demo" && "📋 15-Day Move-Out Automation"}
                  {activeTab === "integrations" && "🔌 External Integrations & Communications Hub"}
                  {activeTab === "properties" && "🏢 Properties & Unit Inventory"}
                  {activeTab === "tenants" && "👥 Residents & Lease Agreements"}
                  {activeTab === "rent_ledger" && "💳 Rent Collections & Ledger"}
                  {activeTab === "maintenance" && "🔧 Maintenance & Service Providers"}
                  {activeTab === "leads" && "🎯 Resident Inquiries & Tours"}
                  {activeTab === "approvals" && "🛡️ Approvals & Verification Queue"}
                  {activeTab === "notifications" && "🔔 Action Items & Reminders"}
                  {activeTab === "diagnostics" && "🩺 Platform Health & System Status"}
                </>
              )}
            </h1>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {isTenant ? "Resident Self-Service Dashboard" : "Smart PG &amp; Co-Living Operations Platform"}
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
                {isTenant ? (
                  <button
                    onClick={() => {
                      setNewTicketForm((prev) => ({
                        ...prev,
                        property_id: properties[0]?.id || "",
                        title: "Maintenance Issue: Room 101",
                      }));
                      setModalType("add_ticket");
                    }}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "7px 14px", background: "#16a34a" }}
                  >
                    + Request Repair
                  </button>
                ) : (
                  <button
                    onClick={() => setModalType("add_tenant")}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "7px 14px" }}
                  >
                    + New Lease
                  </button>
                )}
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
        {/* RESIDENT PORTAL VIEWS */}
        {/* ------------------------------------------------------------- */}
        {isTenant && activeTab === "overview" && (
          <div>
            {/* Resident Welcome Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                border: "1px solid #bfdbfe",
                borderRadius: 14,
                padding: "24px 28px",
                marginBottom: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, marginBottom: 8 }}>
                  ✓ ACTIVE RESIDENT
                </div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                  Welcome Home, {myTenant?.full_name || currentUser.full_name}!
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
                  Assigned Bed: <strong>{myLease?.bed_label || "Bed A"}</strong> in Room <strong>{myLease?.room_number || "101"}</strong> ({myLease?.property_name || "StayOps Indiranagar Luxury PG"}).
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setActiveTab("my_rent")}
                  className="btn-primary"
                  style={{ fontSize: 13, padding: "9px 16px" }}
                >
                  💳 View Invoices
                </button>
                <button
                  onClick={() => {
                    setNewTicketForm((prev) => ({ ...prev, property_id: properties[0]?.id || "", title: "Room Maintenance Request" }));
                    setModalType("add_ticket");
                  }}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: "9px 16px" }}
                >
                  🔧 Request Repair
                </button>
              </div>
            </div>

            {/* Resident 3-Metric Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div className="card" style={{ marginTop: 0, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Monthly Rent</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#2563eb" }}>
                  ₹{(myLease?.monthly_rent || 16000).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Due by 5th of every month</div>
              </div>

              <div className="card" style={{ marginTop: 0, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Security Deposit in Escrow</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#16a34a" }}>
                  ₹{(myLease?.security_deposit || 32000).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>Protected with move-out refund lock</div>
              </div>

              <div className="card" style={{ marginTop: 0, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>My Service Tickets</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: myTickets.some((t) => t.status !== "resolved") ? "#d97706" : "#0f172a" }}>
                  {myTickets.length}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {myTickets.filter((t) => t.status === "resolved").length} Resolved / {myTickets.filter((t) => t.status !== "resolved").length} In Progress
                </div>
              </div>
            </div>

            {/* Resident Two-Column Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
              {/* Left Column: My Recent Invoices & Payments */}
              <div className="card" style={{ marginTop: 0, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>💳 My Rent Billing Ledger</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Payment records and receipts for your room</p>
                  </div>
                  <button onClick={() => setActiveTab("my_rent")} className="btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }}>
                    View All →
                  </button>
                </div>

                {myRentRecords.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>
                    ✓ All rent records are up to date. No pending payments due.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myRentRecords.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 14px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>Billing Month: {r.billing_month}</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Due: {r.due_date}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: r.status === "paid" ? "#16a34a" : "#dc2626" }}>
                            ₹{r.amount_due?.toLocaleString()}
                          </div>
                          <span className={`badge ${r.status === "paid" ? "badge-success" : "badge-danger"}`} style={{ fontSize: 10 }}>
                            {r.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Move-Out Notice & Support Assistant */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="card" style={{ marginTop: 0, padding: 20, background: "#f8fafc", border: "1.5px dashed #cbd5e1" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>
                    📋 Planning to Move Out?
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 12px" }}>
                    Submit your standard 15-day move-out notice. Our multi-agent system will coordinate the turnover inspection and deposit settlement statement.
                  </p>
                  <button
                    onClick={() => setActiveTab("my_moveout")}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "8px 14px", width: "100%" }}
                  >
                    Submit 15-Day Move-Out Notice →
                  </button>
                </div>

                <div className="card" style={{ marginTop: 0, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>
                    💬 Ask Resident Assistant
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 12px" }}>
                    Got questions about meal timings, visitor policy, high-speed Wi-Fi, or amenity hours?
                  </p>
                  <button
                    onClick={() => {
                      setAgentPrompt("What are the PG gate closing hours and visitor guidelines?");
                      setActiveTab("agent_studio");
                    }}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "8px 14px", width: "100%" }}
                  >
                    Chat with StayOps AI →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resident Tab: My Rent & Invoices */}
        {isTenant && activeTab === "my_rent" && (
          <div className="card" style={{ marginTop: 0, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>💳 My Rent Dues &amp; Payment Invoices</h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>Official billing ledger and payment receipts</p>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th>Due Date</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myRentRecords.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.billing_month}</td>
                    <td>{r.due_date}</td>
                    <td style={{ fontWeight: 700 }}>₹{r.amount_due?.toLocaleString()}</td>
                    <td style={{ color: "#16a34a", fontWeight: 600 }}>₹{r.amount_paid?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${r.status === "paid" ? "badge-success" : "badge-danger"}`}>
                        {r.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.status !== "paid" ? (
                        <button
                          onClick={() => {
                            setSelectedRentRecord(r);
                            setPaymentAmount(r.amount_due - r.amount_paid);
                            setModalType("pay_rent");
                          }}
                          className="btn-primary"
                          style={{ fontSize: 11, padding: "5px 12px" }}
                        >
                          Pay Online
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Receipt Issued</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resident Tab: My Maintenance Requests */}
        {isTenant && activeTab === "my_tickets" && (
          <div className="card" style={{ marginTop: 0, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>🔧 My Maintenance Requests</h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>Track repairs, plumber/electrician visits, and report issues</p>
              </div>
              <button
                onClick={() => {
                  setNewTicketForm((prev) => ({ ...prev, property_id: properties[0]?.id || "", title: "Maintenance Issue: Room 101" }));
                  setModalType("add_ticket");
                }}
                className="btn-primary"
                style={{ fontSize: 12, padding: "8px 16px", background: "#16a34a" }}
              >
                + Report New Issue
              </button>
            </div>

            {myTickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>No open maintenance requests</div>
                <p style={{ fontSize: 13, margin: "4px 0 16px" }}>Everything in your room is currently in good working condition.</p>
                <button
                  onClick={() => {
                    setNewTicketForm((prev) => ({ ...prev, property_id: properties[0]?.id || "", title: "Room Maintenance Request" }));
                    setModalType("add_ticket");
                  }}
                  className="btn-secondary"
                >
                  Report an issue
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title &amp; Issue</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {myTickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>{t.category}</td>
                      <td>
                        <span className={`badge ${t.severity === "Emergency" ? "badge-danger" : t.severity === "High" ? "badge-warning" : "badge-neutral"}`}>
                          {t.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${t.status === "resolved" ? "badge-success" : "badge-purple"}`}>
                          {t.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "Recent"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Resident Tab: Submit Move-Out Notice */}
        {isTenant && activeTab === "my_moveout" && (
          <div className="card" style={{ marginTop: 0, padding: 24, maxWidth: 650 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>📋 Submit 15-Day Move-Out Notice</h2>
            <p style={{ margin: "4px 0 20px", fontSize: 13, color: "#64748b" }}>
              Please provide your planned departure details. StayOps AI will automatically schedule your room inspection and compute your security deposit settlement.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSelectedTenantId(myTenant?.id || tenants[0]?.id);
                triggerMoveOutDemo();
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Resident Name:</label>
                <input type="text" disabled value={myTenant?.full_name || currentUser.full_name} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f5f9", border: "1px solid #cbd5e1" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Assigned Bed / Room:</label>
                <input type="text" disabled value={`Room ${myLease?.room_number || "101"} - ${myLease?.bed_label || "Bed A"}`} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f1f5f9", border: "1px solid #cbd5e1" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Notice Period:</label>
                <select value={demoNoticeDays} onChange={(e) => setDemoNoticeDays(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <option value={15}>15 Days Notice (Standard PG Agreement)</option>
                  <option value={30}>30 Days Notice (Extended)</option>
                  <option value={7}>7 Days Notice (Short Notice / Penalty applies)</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Reason for Relocation:</label>
                <textarea rows={3} defaultValue="Relocating for professional employment / semester completion." style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }} required />
              </div>

              <button type="submit" disabled={runningWorkflow} className="btn-primary" style={{ padding: "12px 24px", fontSize: 14, fontWeight: 700 }}>
                {runningWorkflow ? "Orchestrating Move-Out Notice..." : "Submit Official Notice →"}
              </button>
            </form>

            {moveOutResult && (
              <div style={{ marginTop: 24, padding: 16, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10 }}>
                <div style={{ fontWeight: 700, color: "#166534", marginBottom: 6 }}>✓ Move-Out Notice Successfully Registered!</div>
                <div style={{ fontSize: 13, color: "#15803d" }}>Status: {moveOutResult.status} | Turnover Inspection Scheduled.</div>
              </div>
            )}
          </div>
        )}


        </div>
      </div>
    </div>
  );
}

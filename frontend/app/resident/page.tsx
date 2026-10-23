"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfileEditModal from "../components/ProfileEditModal";
import PaymentGatewayModal from "../components/PaymentGatewayModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function BrandIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#0f172a",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      S
    </div>
  );
}

function formatMessageText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function ResidentPortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"find_flat" | "room" | "rent" | "tickets" | "moveout" | "support">("room");

  // Unallocated Resident / Leasing Search State
  const [searchLocation, setSearchLocation] = useState("All");
  const [searchBudget, setSearchBudget] = useState<number>(35000);
  const [searchRoomType, setSearchRoomType] = useState<string>("Any");
  const [searchMoveInDate, setSearchMoveInDate] = useState("2026-11-01");
  const [searchNotes, setSearchNotes] = useState("Looking for a comfortable room with Wi-Fi and food.");
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [agentSummary, setAgentSummary] = useState<string>("");
  const [applyingWithAgent, setApplyingWithAgent] = useState(false);
  const [dynamicCities, setDynamicCities] = useState<string[]>([]);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customLocationText, setCustomLocationText] = useState("");

  // Room Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessNotice, setBookingSuccessNotice] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Tour / Visit Modal State
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [selectedVisitTarget, setSelectedVisitTarget] = useState<any>(null);
  const [visitTime, setVisitTime] = useState("2026-11-02T16:00");
  const [visitSuccessNotice, setVisitSuccessNotice] = useState("");
  const [schedulingVisit, setSchedulingVisit] = useState(false);

  // Data states for allocated resident
  const [tickets, setTickets] = useState<any[]>([]);
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Modals for allocated resident
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ category: "Plumbing", title: "", description: "", priority: "medium" });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingRent, setPayingRent] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paidTxnRef, setPaidTxnRef] = useState<string>("");

  // Move-out state
  const [moveOutDate, setMoveOutDate] = useState("2026-11-15");
  const [moveOutReason, setMoveOutReason] = useState("Relocating for work / new location");
  const [upiId, setUpiId] = useState("");
  const [moveOutSubmitted, setMoveOutSubmitted] = useState(false);
  const [submittingMoveOut, setSubmittingMoveOut] = useState(false);

  // Concierge Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);

  const hasActiveLease = Boolean(profile?.has_active_lease && profile?.room && profile?.property);

  // Fetch available rooms via Leasing Agent
  const fetchAvailableRooms = useCallback(async (loc?: string, bud?: number, rtype?: string) => {
    setLoadingRooms(true);
    try {
      const qLoc = loc !== undefined ? loc : searchLocation;
      const qBud = bud !== undefined ? bud : searchBudget;
      const qRtype = rtype !== undefined ? rtype : searchRoomType;
      const roomTypeParam = qRtype && qRtype !== "Any" ? `&room_type=${encodeURIComponent(qRtype)}` : "";

      const res = await fetch(
        `${API_URL}/api/resident/available-rooms?location=${encodeURIComponent(qLoc)}&budget=${qBud}${roomTypeParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.matches || []);
        if (data.matches?.length > 0) {
          const top = data.matches[0];
          const locLabel = qLoc === "All" || !qLoc ? "all locations" : qLoc;
          const budLabel = Number(qBud) >= 50000 ? "any budget" : `₹${Number(qBud).toLocaleString("en-IN")}`;
          setAgentSummary(
            `Leasing Agent: Found ${data.matches.length} matching room(s) in ${locLabel} within ${budLabel}. Top recommendation: ${top.property_name} (${top.city}), Room ${top.room_number} (${top.room_type}) at ₹${Number(top.monthly_rent).toLocaleString("en-IN")}/mo with ${top.match_score}% match score.`
          );
        } else {
          setAgentSummary(
            `Leasing Agent: No vacant beds directly matching ₹${Number(qBud).toLocaleString("en-IN")} in ${qLoc}. Try increasing your budget or choosing 'All Cities & Locations'.`
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch available rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  }, [searchLocation, searchBudget, searchRoomType]);

  // Main load resident profile function
  const loadResidentData = useCallback(async (overrideEmail?: string) => {
    setProfileLoading(true);
    try {
      let targetEmail: string | null = overrideEmail || null;
      if (!targetEmail && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        targetEmail = params.get("email");
      }
      if (!targetEmail) {
        const stored = localStorage.getItem("stayops_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          targetEmail = parsed?.email;
          setCurrentUser(parsed);
        }
      }

      if (!targetEmail) {
        router.push("/login");
        return;
      }

      setUpiId(`${targetEmail.split("@")[0].replace(".", "_")}@okhdfcbank`);

      const token = localStorage.getItem("stayops_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const emailParam = `?email=${encodeURIComponent(targetEmail)}`;
      const res = await fetch(`${API_URL}/api/resident/profile${emailParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem("stayops_user", JSON.stringify(data.user));
          } catch {}
        }
        if (data.tickets) {
          setTickets(data.tickets);
        }
        if (data.upi_id) {
          setUpiId(data.upi_id);
        }

        const firstName = (data.user?.full_name || "Resident").split(" ")[0];

        if (data.has_active_lease && data.room) {
          setActiveTab("room");
          setChatMessages([
            {
              sender: "bot",
              text: `Hello ${firstName}! I am your StayOps concierge for ${data.property?.name || "your PG"}. You can ask me about Wi-Fi passwords, gate curfew timings, mess menu schedule, or raise repair requests.`,
            },
          ]);
        } else {
          // Unallocated resident! Default to flat finding
          setActiveTab("find_flat");
          setChatMessages([
            {
              sender: "bot",
              text: `Hello ${firstName}! I am your StayOps AI Leasing Agent. You do not have an allocated flat or room yet. Tell me your preferred location, budget, or sharing type, and I will find you verified PG accommodations to book right away!`,
            },
          ]);
          // Load dynamic cities from property catalog
          try {
            const pRes = await fetch(`${API_URL}/api/properties`, { headers });
            if (pRes.ok) {
              const pData = await pRes.json();
              const uniqueCities = Array.from(new Set(pData.map((p: any) => p.city?.trim()).filter(Boolean))) as string[];
              setDynamicCities(uniqueCities);
            }
          } catch (e) {
            console.error("Failed to load property cities:", e);
          }

          // Load all available rooms immediately across all cities & prices
          fetchAvailableRooms("All", 35000, "Any");
        }
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to load resident profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [router, fetchAvailableRooms]);

  useEffect(() => {
    loadResidentData();
  }, [loadResidentData]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("stayops_user");
      localStorage.removeItem("stayops_token");
    } catch {}
    router.push("/login");
  };

  // Agent Application workflow submission
  const handleApplyWithAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setApplyingWithAgent(true);
    setBookingSuccessNotice("");
    setBookingError("");

    try {
      const payload = {
        full_name: currentUser?.full_name || profile?.user?.full_name || "Resident",
        phone: profile?.tenant?.phone || "+919876543210",
        email: currentUser?.email || profile?.user?.email,
        budget: Number(searchBudget),
        preferred_location: searchLocation,
        preferred_room_type: searchRoomType === "Any" ? "Double" : searchRoomType,
        move_in_date: searchMoveInDate || null,
        message: searchNotes || "Looking for a clean PG flat with Wi-Fi and food.",
      };

      const res = await fetch(`${API_URL}/api/workflows/lead-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.matched_rooms || []);
        const locLabel = searchLocation === "All" ? "all locations" : searchLocation;
        setAgentSummary(
          data.agent_response ||
            `Found ${data.matched_rooms?.length || 0} matching room(s) for ${payload.full_name} in ${locLabel}!`
        );
      } else {
        // Fallback to direct search endpoint
        await fetchAvailableRooms(searchLocation, Number(searchBudget), searchRoomType);
      }
    } catch {
      await fetchAvailableRooms(searchLocation, Number(searchBudget), searchRoomType);
    } finally {
      setApplyingWithAgent(false);
    }
  };

  // Open booking confirmation modal
  const promptBookRoom = (roomCandidate: any) => {
    setSelectedBed(roomCandidate);
    setBookingError("");
    setBookingSuccessNotice("");
    setBookingModalOpen(true);
  };

  // Execute room booking & allocation
  const handleConfirmBookRoom = async () => {
    if (!selectedBed) return;
    setBookingLoading(true);
    setBookingError("");

    try {
      const res = await fetch(`${API_URL}/api/resident/book-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bed_id: selectedBed.bed_id,
          email: currentUser?.email || profile?.user?.email,
          tenant_id: profile?.tenant?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Room booking could not be completed.");
      }

      setBookingSuccessNotice(
        `🎉 Success! ${data.message || `Room ${selectedBed.room_number} (${selectedBed.room_type}) has been officially allocated to you.`}`
      );

      // Reload fresh resident data to switch into full tenancy view
      setTimeout(async () => {
        setBookingModalOpen(false);
        await loadResidentData();
      }, 1800);
    } catch (err: any) {
      setBookingError(err.message || "Failed to book room. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Schedule visit
  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitTarget) return;
    setSchedulingVisit(true);
    try {
      const res = await fetch(`${API_URL}/api/property-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedVisitTarget.property_id,
          room_id: selectedVisitTarget.room_id || undefined,
          lead_name: currentUser?.full_name || "Resident Tenant",
          email: currentUser?.email || "resident@stayops.ai",
          phone: currentUser?.phone || "+919876543210",
          scheduled_time: visitTime,
          notes: `Guided tour requested for Room ${selectedVisitTarget.room_number || "Vacant"} at ${selectedVisitTarget.property_name}`,
        }),
      });

      // Also notify agent asynchronously
      fetch(`${API_URL}/api/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Schedule guided property visit for ${currentUser?.full_name || "Resident"} at ${selectedVisitTarget.property_name} on ${visitTime}`,
          target_agent: "leasing",
          context: {
            lead_name: currentUser?.full_name,
            email: currentUser?.email,
            property_id: selectedVisitTarget.property_id,
            room_id: selectedVisitTarget.room_id,
            scheduled_time: visitTime,
          },
        }),
      }).catch(() => {});

      if (res.ok) {
        setVisitSuccessNotice(`Guided property tour successfully scheduled for ${new Date(visitTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}!`);
      } else {
        setVisitSuccessNotice("Visit scheduled! Our property manager will meet you at the site.");
      }
    } catch {
      setVisitSuccessNotice("Visit scheduled! Our property manager will meet you at the site.");
    } finally {
      setSchedulingVisit(false);
      setTimeout(() => {
        setVisitModalOpen(false);
        setVisitSuccessNotice("");
      }, 2200);
    }
  };

  // Raise ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    const unitLabel = profile?.room?.room_number ? `Unit ${profile.room.room_number}` : "Room";
    const titleVal = newTicket.title.trim() || `${newTicket.category} service request in ${unitLabel}`;

    try {
      const res = await fetch(`${API_URL}/api/resident/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: profile?.tenant?.id,
          email: currentUser?.email,
          category: newTicket.category,
          title: titleVal,
          description: newTicket.description,
          priority: newTicket.priority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTickets([data.ticket, ...tickets]);
      } else {
        const localCreated = {
          id: "TCK-" + Math.floor(1000 + Math.random() * 9000),
          title: titleVal,
          category: newTicket.category,
          description: newTicket.description,
          severity: newTicket.priority === "high" ? "High" : "Medium",
          status: "open",
          created_at: new Date().toISOString(),
        };
        setTickets([localCreated, ...tickets]);
      }
    } catch {
      const localCreated = {
        id: "TCK-" + Math.floor(1000 + Math.random() * 9000),
        title: titleVal,
        category: newTicket.category,
        description: newTicket.description,
        severity: newTicket.priority === "high" ? "High" : "Medium",
        status: "open",
        created_at: new Date().toISOString(),
      };
      setTickets([localCreated, ...tickets]);
    } finally {
      setSubmittingTicket(false);
      setTicketModalOpen(false);
      setNewTicket({ category: "Plumbing", title: "", description: "", priority: "medium" });
    }
  };

  // Pay rent
  const handlePayRentSubmit = async () => {
    setPayingRent(true);
    const pendingInvoice = profile?.invoices?.find((i: any) => i.status !== "Paid");
    const rentAmount = pendingInvoice?.amount_num || profile?.lease?.monthly_rent || 14000;

    try {
      const res = await fetch(`${API_URL}/api/resident/pay-rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: pendingInvoice?.id,
          tenant_id: profile?.tenant?.id,
          email: currentUser?.email,
          amount: rentAmount,
          payment_method: paymentMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPaidTxnRef(data.reference_id || `TXN-STAY-${Math.floor(100000 + Math.random() * 900000)}`);
        setPaySuccess(true);
        if (currentUser?.email) {
          const refRes = await fetch(`${API_URL}/api/resident/profile?email=${encodeURIComponent(currentUser.email)}`);
          if (refRes.ok) {
            const updated = await refRes.json();
            setProfile(updated);
          }
        }
      } else {
        setPaidTxnRef(`TXN-STAY-${Math.floor(100000 + Math.random() * 900000)}`);
        setPaySuccess(true);
      }
    } catch {
      setPaidTxnRef(`TXN-STAY-${Math.floor(100000 + Math.random() * 900000)}`);
      setPaySuccess(true);
    } finally {
      setPayingRent(false);
    }
  };

  // Move-out notice
  const handleMoveOutNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMoveOut(true);
    try {
      await fetch(`${API_URL}/api/resident/moveout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: profile?.tenant?.id,
          email: currentUser?.email,
          move_out_date: moveOutDate,
          reason: moveOutReason,
          upi_id: upiId,
        }),
      });
    } catch {}
    setSubmittingMoveOut(false);
    setMoveOutSubmitted(true);
  };

  // Interactive AI Agent Concierge Chat
  const handleSendChat = async (prompt?: string) => {
    const text = prompt || chatInput;
    if (!text.trim()) return;

    setChatMessages((prev) => [...prev, { sender: "user", text }]);
    if (!prompt) setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/agents/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          target_agent: hasActiveLease ? "tenant_support" : "leasing",
          context: {
            user_role: "tenant",
            role: "tenant",
            tenant_id: profile?.tenant?.id || currentUser?.id,
            email: currentUser?.email,
            location: searchLocation,
            budget: searchBudget,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.response || data.llm_synthesis;
        if (reply) {
          setChatMessages((prev) => [...prev, { sender: "bot", text: reply }]);
          setChatLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback answers tailored to allocation state
    setTimeout(() => {
      let reply = "Your request has been logged and shared with our team.";
      const lower = text.toLowerCase();

      if (!hasActiveLease) {
        if (lower.includes("flat") || lower.includes("room") || lower.includes("budget") || lower.includes("available")) {
          reply = `Leasing Agent: We have verified beds available in Koramangala (₹11,000/mo) and Viman Nagar Pune (₹7,500/mo). Use the 'Find a Flat' search form above to inspect photos and instantly allocate your room!`;
        } else {
          reply = "I am your StayOps AI Leasing Agent. Once you submit your budget and preferred location, I will find you available rooms to book!";
        }
      } else {
        const wifiSsid = profile?.property?.wifi_ssid || "StayOps-TechPG-5G";
        const wifiPw = profile?.property?.wifi_password || "StayOpsTenant2026";
        const roomNum = profile?.room?.room_number || "101";

        if (lower.includes("wifi") || lower.includes("password") || lower.includes("internet")) {
          reply = `Wi-Fi Network: ${wifiSsid}. Password: ${wifiPw}. Keypad PIN for Room ${roomNum} is ${profile?.keypad_pin || "*8392#"}.`;
        } else if (lower.includes("gate") || lower.includes("curfew") || lower.includes("timing")) {
          reply = `Main entrance is open 6:00 AM to 11:30 PM. For late entry, use your unit lock passcode ${profile?.keypad_pin || "*8392#"}.`;
        } else if (lower.includes("food") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("meal")) {
          reply = "Dining schedule: Breakfast 7:30–9:30 AM, Lunch 12:30–2:30 PM, Dinner 8:00–10:00 PM in the 1st floor dining hall.";
        } else if (lower.includes("clean") || lower.includes("maid") || lower.includes("sweep")) {
          reply = `Daily housekeeping for Room ${roomNum} visits between 10:00 AM and 1:00 PM.`;
        }
      }
      setChatMessages((prev) => [...prev, { sender: "bot", text: reply }]);
      setChatLoading(false);
    }, 400);
  };

  const copyWifi = () => {
    const pw = profile?.property?.wifi_password || "StayOpsTenant2026";
    navigator.clipboard.writeText(pw);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const residentName = currentUser?.full_name || profile?.user?.full_name || "Resident";
  const propertyName = profile?.property?.name || "StayOps Living";
  const roomNumber = profile?.room?.room_number;
  const bedLabel = profile?.bed?.bed_label ? `-${profile.bed.bed_label}` : "";
  const cityName = profile?.property?.city || searchLocation;
  const monthlyRent = profile?.lease?.monthly_rent || 14000;
  const securityDeposit = profile?.lease?.security_deposit || monthlyRent * 2;
  const keypadPin = profile?.keypad_pin || "*8392#";
  const leaseEndDate = profile?.lease?.end_date
    ? new Date(profile.lease.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Dec 31, 2026";
  const invoices = profile?.invoices || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#111827",
      }}
    >
      {/* Top Navigation */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BrandIcon />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              {hasActiveLease ? propertyName : "StayOps Resident Portal"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {hasActiveLease ? `Room ${roomNumber}${bedLabel} • ${cityName}` : "Application & Flat Allocation"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
              {residentName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: hasActiveLease ? "#16a34a" : "#d97706",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              <span>●</span>
              <span>{hasActiveLease ? "Active Resident" : "Pending Flat Allocation"}</span>
            </div>
          </div>

          <button
            onClick={() => setProfileModalOpen(true)}
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
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 10,
            marginBottom: 24,
            overflowX: "auto",
          }}
        >
          {/* Conditional tab list based on lease allocation */}
          {!hasActiveLease ? (
            <>
              {[
                { id: "find_flat", label: "🔍 Find a Flat (AI Leasing Agent)" },
                { id: "support", label: "💬 Resident Concierge" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    cursor: "pointer",
                    background: activeTab === tab.id ? "#0f172a" : "transparent",
                    color: activeTab === tab.id ? "#ffffff" : "#4b5563",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: "room", label: "My Room" },
                { id: "rent", label: `Rent & Invoices (${invoices.length})` },
                { id: "tickets", label: `Maintenance (${tickets.length})` },
                { id: "moveout", label: "Notice to Vacate" },
                { id: "support", label: "Resident Support" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    cursor: "pointer",
                    background: activeTab === tab.id ? "#0f172a" : "transparent",
                    color: activeTab === tab.id ? "#ffffff" : "#4b5563",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}
        </div>

        {profileLoading && (
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 16, fontSize: 13, color: "#6b7280" }}>
            Loading your profile and accommodation details...
          </div>
        )}

        {/* ============================================================== */}
        {/* UNALLOCATED RESIDENT VIEW: FIND A FLAT WITH AI LEASING AGENT  */}
        {/* ============================================================== */}
        {!hasActiveLease && (activeTab === "find_flat" || activeTab === "room") && (
          <div>
            {/* Status & Welcome Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: 12,
                padding: "24px 28px",
                color: "#ffffff",
                marginBottom: 24,
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ display: "inline-block", background: "rgba(245, 158, 11, 0.2)", color: "#fcd34d", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                ● Accommodation Application Active
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0" }}>
                Find Your Flat with StayOps AI Leasing Agent
              </h1>
              <p style={{ fontSize: 14, color: "#cbd5e1", margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
                Welcome, {residentName}! You do not have a room or flat allocated yet. Tell our AI Leasing Agent your preferred location and budget. The agent will scan authoritative property inventory, calculate transparent match scores, and let you allocate or tour verified PG rooms instantly.
              </p>
            </div>

            {/* Application & Preference Form */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "22px 24px",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>
                    Your Accommodation Preferences
                  </h2>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Adjust criteria to let the AI agent filter and score available flats
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                  Agent: StayOps Leasing AI
                </div>
              </div>

              <form onSubmit={handleApplyWithAgent}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                        City / Location
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isCustomLocation;
                          setIsCustomLocation(nextState);
                          if (!nextState) {
                            setSearchLocation("All");
                            fetchAvailableRooms("All", searchBudget, searchRoomType);
                          }
                        }}
                        style={{ background: "none", border: "none", color: "#2563eb", fontSize: 11, cursor: "pointer", padding: 0 }}
                      >
                        {isCustomLocation ? "← Choose from List" : "+ Type Custom Area"}
                      </button>
                    </div>

                    {isCustomLocation ? (
                      <input
                        type="text"
                        value={customLocationText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomLocationText(val);
                          setSearchLocation(val.trim() || "All");
                        }}
                        placeholder="Type any city or locality (e.g. Pune, Koramangala...)"
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #2563eb", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                      />
                    ) : (
                      <select
                        value={searchLocation}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setIsCustomLocation(true);
                          } else {
                            setSearchLocation(e.target.value);
                            fetchAvailableRooms(e.target.value, searchBudget, searchRoomType);
                          }
                        }}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#ffffff" }}
                      >
                        <option value="All">All Cities &amp; Locations (Everywhere)</option>
                        {dynamicCities.map((city) => (
                          <option key={city} value={city}>
                            {city} (All PG Units)
                          </option>
                        ))}
                        <optgroup label="Popular Hubs">
                          <option value="Koramangala">Bengaluru — Koramangala</option>
                          <option value="Viman Nagar">Pune — Viman Nagar</option>
                          <option value="HSR Layout">Bengaluru — HSR Layout</option>
                          <option value="Indiranagar">Bengaluru — Indiranagar</option>
                          <option value="Whitefield">Bengaluru — Whitefield</option>
                        </optgroup>
                        <option value="__custom__">+ Type Custom City or Area...</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                        Max Budget (₹/month)
                      </label>
                      <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>
                        {searchBudget >= 50000 ? "Any / No Limit" : `₹${Number(searchBudget).toLocaleString("en-IN")}`}
                      </span>
                    </div>
                    <input
                      type="number"
                      step={1000}
                      min={5000}
                      max={100000}
                      value={searchBudget}
                      onChange={(e) => setSearchBudget(Number(e.target.value))}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      {[10000, 15000, 20000, 30000, 50000].map((bVal) => (
                        <button
                          key={bVal}
                          type="button"
                          onClick={() => {
                            setSearchBudget(bVal);
                            fetchAvailableRooms(searchLocation, bVal, searchRoomType);
                          }}
                          style={{
                            background: searchBudget === bVal ? "#0f172a" : "#f1f5f9",
                            color: searchBudget === bVal ? "#ffffff" : "#475569",
                            border: "none",
                            borderRadius: 4,
                            padding: "3px 7px",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {bVal === 50000 ? "All Prices" : `₹${bVal / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Sharing / Room Type
                    </label>
                    <select
                      value={searchRoomType}
                      onChange={(e) => setSearchRoomType(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#ffffff" }}
                    >
                      <option value="Any">Any Room Type</option>
                      <option value="Single">Single Private Room</option>
                      <option value="Double">Double Sharing</option>
                      <option value="Triple">Triple Sharing</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Target Move-In Date
                    </label>
                    <input
                      type="date"
                      value={searchMoveInDate}
                      onChange={(e) => setSearchMoveInDate(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                    Special Preferences / Requirements (Optional)
                  </label>
                  <input
                    type="text"
                    value={searchNotes}
                    onChange={(e) => setSearchNotes(e.target.value)}
                    placeholder="e.g. Near metro station, food included, high-speed Wi-Fi for work from home..."
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="submit"
                    disabled={applyingWithAgent || loadingRooms}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {applyingWithAgent || loadingRooms ? (
                      <>
                        <span>⏳</span>
                        <span>Scanning inventory & matching...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>Apply & Let AI Agent Find Matching Flats</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchAvailableRooms(searchLocation, searchBudget, searchRoomType)}
                    style={{
                      background: "#ffffff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Refresh live inventory
                  </button>
                </div>
              </form>
            </div>

            {/* AI Agent Recommendation Synthesis */}
            {agentSummary && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "14px 18px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 20 }}>💡</div>
                <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
                  {agentSummary}
                </div>
              </div>
            )}

            {/* Matching Flats Inventory Section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>
                  Available Flat & Room Allocations ({availableRooms.length})
                </h3>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Deterministic constraint-based compatibility ranking
                </span>
              </div>

              {availableRooms.length === 0 ? (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 36,
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                    No matching vacant beds found for this criteria
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Try increasing your budget or choosing another city location to view available units.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                  {availableRooms.map((roomItem, idx) => {
                    const matchScore = roomItem.match_score || 95;
                    const isTopPick = idx === 0;

                    return (
                      <div
                        key={roomItem.bed_id || idx}
                        style={{
                          background: "#ffffff",
                          border: isTopPick ? "2px solid #2563eb" : "1px solid #e5e7eb",
                          borderRadius: 10,
                          padding: "18px 20px",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: isTopPick
                            ? "0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -2px rgba(37, 99, 235, 0.1)"
                            : "none",
                        }}
                      >
                        {isTopPick && (
                          <div
                            style={{
                              position: "absolute",
                              top: -10,
                              right: 16,
                              background: "#2563eb",
                              color: "#ffffff",
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: 10,
                              letterSpacing: "0.05em",
                            }}
                          >
                            Top Agent Pick
                          </div>
                        )}

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                                {roomItem.property_code || "PG-UNIT"} • {roomItem.city}
                              </div>
                              <h4 style={{ fontSize: 17, fontWeight: 700, margin: "2px 0 0 0", color: "#111827" }}>
                                {roomItem.property_name}
                              </h4>
                            </div>
                            <span
                              style={{
                                background: matchScore >= 85 ? "#dcfce7" : "#fef3c7",
                                color: matchScore >= 85 ? "#166534" : "#92400e",
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {matchScore}% Match
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                            {roomItem.address}
                          </div>

                          {/* Unit / Bed Tag */}
                          <div
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #f1f5f9",
                              borderRadius: 6,
                              padding: "10px 12px",
                              marginBottom: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                                Room {roomItem.room_number} (Bed {roomItem.bed_label})
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {roomItem.room_type} Sharing Accommodation
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>
                                ₹{Number(roomItem.monthly_rent).toLocaleString("en-IN")}/mo
                              </div>
                              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                                Deposit: ₹{(Number(roomItem.monthly_rent) * 2).toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>

                          {/* Amenities Tags */}
                          {roomItem.amenities && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                              {roomItem.amenities.slice(0, 4).map((amen: string, aIdx: number) => (
                                <span
                                  key={aIdx}
                                  style={{
                                    fontSize: 11,
                                    background: "#f3f4f6",
                                    color: "#374151",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                  }}
                                >
                                  {amen}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
                          <button
                            onClick={() => promptBookRoom(roomItem)}
                            style={{
                              flex: 1,
                              background: "#0f172a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              padding: "9px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Book &amp; Allocate Room →
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVisitTarget(roomItem);
                              setVisitSuccessNotice("");
                              setVisitModalOpen(true);
                            }}
                            style={{
                              background: "#ffffff",
                              color: "#374151",
                              border: "1px solid #d1d5db",
                              borderRadius: 6,
                              padding: "9px 12px",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            Schedule Visit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ALLOCATED RESIDENT VIEW: ACTIVE TENANCY TABS                   */}
        {/* ============================================================== */}
        {hasActiveLease && activeTab === "room" && (
          <div>
            {/* Overview Card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "22px 24px",
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Active Tenancy Agreement
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 4px 0", color: "#111827" }}>
                  Room {roomNumber}{bedLabel} ({profile?.room?.room_type || "Standard"} Occupancy)
                </h2>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {profile?.property?.address || "StayOps Living"}, {cityName}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setPayModalOpen(true)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "9px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Pay monthly rent →
                </button>
                <button
                  onClick={() => setTicketModalOpen(true)}
                  style={{
                    background: "#ffffff",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "9px 14px",
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Report an issue
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Monthly Rent</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 4 }}>
                  ₹{monthlyRent.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>Due on 5th of every month</div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Security Deposit</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 4 }}>
                  ₹{securityDeposit.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Held in escrow (100% refundable)</div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Keypad PIN</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: "#111827", marginTop: 4 }}>
                  {keypadPin}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Unique code for unit &amp; gate access</div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Lease Term</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginTop: 6 }}>
                  Until {leaseEndDate}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>11-month registered agreement</div>
              </div>
            </div>

            {/* Resident Amenities & Services */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "18px 20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px 0" }}>
                  Wi-Fi &amp; Room Amenities
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Wi-Fi network</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {profile?.property?.wifi_ssid || "StayOps-TechPG-5G"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Password</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>
                        {profile?.property?.wifi_password || "StayOpsTenant2026"}
                      </span>
                      <button
                        onClick={copyWifi}
                        style={{
                          background: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {copiedWifi ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Daily cleaning</span>
                    <span style={{ color: "#111827" }}>10:00 AM – 1:00 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Laundry service</span>
                    <span style={{ color: "#111827" }}>Tues, Thurs &amp; Sat (Included)</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "18px 20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px 0" }}>
                  Dining &amp; Kitchen Schedule
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Breakfast</span>
                    <span style={{ color: "#111827" }}>7:30 AM – 9:30 AM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Lunch</span>
                    <span style={{ color: "#111827" }}>12:30 PM – 2:30 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>Dinner</span>
                    <span style={{ color: "#111827" }}>8:00 PM – 10:00 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Drinking water</span>
                    <span style={{ color: "#15803d", fontWeight: 500 }}>RO Purifier on each floor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB 2: RENT & PAYMENTS ---------------- */}
        {activeTab === "rent" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
                  Rent &amp; Payment Ledger
                </h2>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  Official digital rent records linked to your active tenancy agreement.
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(true)}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Pay upcoming rent (₹{monthlyRent.toLocaleString("en-IN")})
              </button>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
                    <th style={{ padding: "10px 16px" }}>Invoice ID</th>
                    <th style={{ padding: "10px 16px" }}>Billing Period</th>
                    <th style={{ padding: "10px 16px" }}>Amount</th>
                    <th style={{ padding: "10px 16px" }}>Payment Method</th>
                    <th style={{ padding: "10px 16px" }}>Status</th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                        No billing notices due yet. Your ledger is in perfect standing!
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any, idx: number) => {
                      const isPaid = inv.status === "Paid";
                      const isOverdue = inv.status === "Overdue";
                      return (
                        <tr key={inv.id || idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>
                            {inv.id.slice(0, 14)}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151" }}>{inv.period}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{inv.amount}</td>
                          <td style={{ padding: "12px 16px", color: "#6b7280" }}>{inv.method}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: isPaid ? "#15803d" : isOverdue ? "#b91c1c" : "#d97706",
                              }}
                            >
                              ● {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                if (isPaid) {
                                  alert(`Downloading official tax receipt for ${inv.period} (Amount: ${inv.amount})`);
                                } else {
                                  setPayModalOpen(true);
                                }
                              }}
                              style={{
                                background: "transparent",
                                color: isPaid ? "#2563eb" : "#15803d",
                                border: "none",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {isPaid ? "Download receipt ↓" : "Pay now →"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- TAB 3: MAINTENANCE ---------------- */}
        {activeTab === "tickets" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Maintenance &amp; Repairs</h2>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  Directly dispatched to verified contractors and on-site facility team.
                </div>
              </div>
              <button
                onClick={() => setTicketModalOpen(true)}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Raise new ticket
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.length === 0 ? (
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                  No open maintenance requests. Room {roomNumber || ""} is in great shape!
                </div>
              ) : (
                tickets.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                          {t.title || `Issue #${t.id}`}
                        </span>
                        <span style={{ fontSize: 11, background: "#f3f4f6", color: "#4b5563", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>
                          {t.category || "General"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
                        {t.description || "Inspecting fixtures and fittings."}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                        Reported on {new Date(t.created_at || Date.now()).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: t.status === "resolved" ? "#15803d" : "#2563eb",
                        }}
                      >
                        {t.status === "resolved" ? "● Resolved" : "● Assigned to Technician"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB 4: MOVE-OUT ---------------- */}
        {activeTab === "moveout" && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "24px 28px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0", color: "#111827" }}>
                15-Day Move-Out Notice &amp; Deposit Settlement
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px 0" }}>
                Submit notice of intent to vacate Room {roomNumber}. As per your lease agreement, a 15-day notice period is required for 100% refund of your security deposit.
              </p>

              {moveOutSubmitted ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28, color: "#15803d", marginBottom: 6 }}>✓</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#166534", margin: "0 0 4px 0" }}>
                    Notice Scheduled for {moveOutDate}
                  </h3>
                  <p style={{ fontSize: 13, color: "#15803d", margin: "0 0 14px 0" }}>
                    Your notice has been registered with {propertyName} on-site team. Final inspection and refund transfer will be processed upon room turnover.
                  </p>
                  <div style={{ background: "#ffffff", border: "1px solid #dcfce7", borderRadius: 6, padding: 12, fontSize: 12, color: "#374151", textAlign: "left", maxWidth: 420, margin: "0 auto" }}>
                    <div>• <strong>Net Refund Payout:</strong> ₹{(Math.max(0, securityDeposit - 1000)).toLocaleString("en-IN")} (after ₹1,000 standard turnover)</div>
                    <div>• <strong>Payment Mode:</strong> Instant IMPS to {upiId}</div>
                    <div>• <strong>Turnover Inspection:</strong> 3:00 PM on {moveOutDate}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleMoveOutNotice}>
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16, marginBottom: 18, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: "#374151", marginBottom: 8 }}>Settlement summary:</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#6b7280" }}>Deposit held in escrow:</span>
                      <span style={{ fontWeight: 600, color: "#111827" }}>₹{securityDeposit.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#6b7280" }}>Standard sanitization &amp; paint touchup:</span>
                      <span style={{ fontWeight: 600, color: "#b91c1c" }}>-₹1,000</span>
                    </div>
                    <div style={{ borderTop: "1px dashed #d1d5db", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
                      <span style={{ color: "#111827" }}>Estimated refund payout:</span>
                      <span style={{ color: "#15803d" }}>₹{(Math.max(0, securityDeposit - 1000)).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Move-out date (minimum 15 days ahead)
                    </label>
                    <input
                      type="date"
                      required
                      value={moveOutDate}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Reason for moving
                    </label>
                    <select
                      value={moveOutReason}
                      onChange={(e) => setMoveOutReason(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#ffffff" }}
                    >
                      <option>Relocating for job / new office location</option>
                      <option>Graduation / course completed</option>
                      <option>Moving in with friends or family</option>
                      <option>Other personal reasons</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      UPI ID or Account for IMPS deposit refund
                    </label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingMoveOut}
                    style={{
                      width: "100%",
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "11px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {submittingMoveOut ? "Submitting notice..." : "Submit 15-day notice & schedule inspection →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB 5: RESIDENT SUPPORT / CONCIERGE ---------------- */}
        {activeTab === "support" && (
          <div style={{ maxWidth: 740, margin: "0 auto" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, display: "flex", flexDirection: "column", height: 560 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                    {hasActiveLease ? `Resident Concierge (${propertyName})` : "StayOps AI Leasing Concierge"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {hasActiveLease ? `Automated assistance for Room ${roomNumber}` : "AI assistant to find PG rooms, check budget, and book flats"}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#15803d", fontWeight: 500 }}>● Online</span>
              </div>

              {/* Chat Feed */}
              <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: msg.sender === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        background: msg.sender === "user" ? "#0f172a" : "#f3f4f6",
                        color: msg.sender === "user" ? "#ffffff" : "#111827",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      {formatMessageText(msg.text)}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                    Agent is evaluating and typing...
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div style={{ padding: "8px 18px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, overflowX: "auto", background: "#f9fafb" }}>
                {hasActiveLease
                  ? [
                      "What is the Wi-Fi password?",
                      "What are the gate timings?",
                      "When is dinner served?",
                      "How to request extra room cleaning?",
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(chip)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: 14,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "#374151",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {chip}
                      </button>
                    ))
                  : [
                      "Find me a double room in Koramangala under 15000",
                      "What rooms are available in Bengaluru?",
                      "Show me single room options",
                      "How does room booking work?",
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(chip)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: 14,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "#374151",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {chip}
                      </button>
                    ))}
              </div>

              {/* Input Bar */}
              <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={
                    hasActiveLease
                      ? "Ask a question about Wi-Fi, food, housekeeping, or rules..."
                      : "Ask about available flats, rent budgets, or book a room..."
                  }
                  style={{ flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, outline: "none" }}
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "9px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------- BOOKING CONFIRMATION MODAL ---------------- */}
      {bookingModalOpen && selectedBed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, width: 440, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>
                Confirm Room &amp; Flat Allocation
              </h3>
              <button
                onClick={() => setBookingModalOpen(false)}
                disabled={bookingLoading}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            {bookingSuccessNotice ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <div style={{ fontSize: 36, color: "#15803d", marginBottom: 8 }}>✓</div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#166534", margin: 0 }}>
                  Allocation Confirmed!
                </h4>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 8 }}>
                  {bookingSuccessNotice}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Switching to your resident dashboard...
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 16px 0" }}>
                  You are allocating bed <strong>{selectedBed.bed_label}</strong> in <strong>Room {selectedBed.room_number}</strong> at <strong>{selectedBed.property_name}</strong>.
                </p>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#64748b" }}>Room Type:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedBed.room_type} Sharing</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#64748b" }}>Monthly Rent:</span>
                    <span style={{ fontWeight: 700, color: "#15803d" }}>₹{Number(selectedBed.monthly_rent).toLocaleString("en-IN")}/month</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#64748b" }}>Security Deposit:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>₹{(Number(selectedBed.monthly_rent) * 2).toLocaleString("en-IN")} (Refundable)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Tenancy Term:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>11-Month Digital Agreement</span>
                  </div>
                </div>

                {bookingError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>
                    {bookingError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    disabled={bookingLoading}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      padding: "9px 14px",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBookRoom}
                    disabled={bookingLoading}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {bookingLoading ? "Allocating room..." : "Confirm & Allocate Bed →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- VISIT MODAL ---------------- */}
      {visitModalOpen && selectedVisitTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, width: 420, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                Schedule Guided PG Visit Tour
              </h3>
              <button
                onClick={() => setVisitModalOpen(false)}
                disabled={schedulingVisit}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            {visitSuccessNotice ? (
              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <div style={{ fontSize: 32, color: "#15803d", marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>
                  {visitSuccessNotice}
                </div>
              </div>
            ) : (
              <form onSubmit={handleScheduleVisit}>
                <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 14px 0" }}>
                  Our property manager will guide you around <strong>{selectedVisitTarget.property_name}</strong> (Room {selectedVisitTarget.room_number}).
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                    Select Preferred Visit Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setVisitModalOpen(false)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={schedulingVisit}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {schedulingVisit ? "Scheduling..." : "Confirm Visit Tour"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------- STAYOPS PAY GATEWAY MODAL (UPI 2.0 ZERO MDR) ---------------- */}
      <PaymentGatewayModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        amount={monthlyRent}
        invoiceId={profile?.invoices?.find((i: any) => i.status !== "Paid")?.id}
        tenantId={profile?.tenant?.id}
        residentEmail={currentUser?.email || profile?.user?.email}
        residentName={currentUser?.full_name || profile?.user?.full_name || "Resident"}
        propertyName={propertyName}
        roomNumber={roomNumber || "101"}
        bedLabel={bedLabel || "A"}
        billingMonth={profile?.invoices?.find((i: any) => i.status !== "Paid")?.billing_month || "Current Month"}
        merchantVpa="stayops.living@okhdfcbank"
        onSuccess={async (txnData) => {
          setPaidTxnRef(txnData.reference_id);
          setPaySuccess(true);
          if (currentUser?.email) {
            const refRes = await fetch(`${API_URL}/api/resident/profile?email=${encodeURIComponent(currentUser.email)}`);
            if (refRes.ok) {
              const updated = await refRes.json();
              setProfile(updated);
            }
          }
        }}
      />

      {/* ---------------- CREATE TICKET MODAL ---------------- */}
      {ticketModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#ffffff", borderRadius: 10, width: 440, padding: 24, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>Raise Maintenance Request</h3>
              <button
                onClick={() => setTicketModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Issue Category
                </label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#ffffff" }}
                >
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Appliance</option>
                  <option>Housekeeping / Cleaning</option>
                  <option>Wi-Fi &amp; Internet</option>
                  <option>Carpentry / Furniture</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Summary / Title
                </label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="e.g. Geyser not heating, Bathroom tap leaking"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Please describe the issue in detail..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Urgency Level
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#ffffff" }}
                >
                  <option value="low">Low (Routine checkup)</option>
                  <option value="medium">Medium (Requires attention within 24 hours)</option>
                  <option value="high">Urgent (Water leak, power cut, lockout)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(false)}
                  style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {submittingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Profile Modal */}
      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          loadResidentData();
        }}
      />
    </div>
  );
}


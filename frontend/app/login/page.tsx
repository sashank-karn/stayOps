"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StayOpsLogo({ size = 42 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
      <path d="M20 8.5L8 18H12V31H28V18H32L20 8.5Z" fill="white" fillOpacity="0.96" />
      <path d="M17 22H23V31H17V22Z" fill="#1e1b4b" fillOpacity="0.85" />
      <circle cx="20" cy="15" r="2.2" fill="url(#logo-accent)" />
      <circle cx="20" cy="15" r="4.2" stroke="url(#logo-accent)" strokeWidth="0.8" strokeOpacity="0.7" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authRole, setAuthRole] = useState("property_manager");
  const [authError, setAuthError] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authStep, setAuthStep] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [otpSentMessage, setOtpSentMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Auto-redirect if already authenticated
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("stayops_token");
      if (storedToken) {
        router.push("/dashboard");
      }
    } catch {}
  }, [router]);

  // Cooldown countdown
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleQuickLogin = async (role: "admin" | "property_manager" | "tenant") => {
    setLoading(true);
    setAuthError("");
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
        setAuthError(data.detail || "Authentication failed.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!authEmail.trim() || !authPassword.trim() || !authFullName.trim()) {
      setAuthError("Please fill out full name, email, and password first.");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), purpose: "registration" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Failed to dispatch verification code.");
        return;
      }
      setOtpSentMessage(data.message || "Verification code dispatched to your email!");
      if (data.dev_otp) setDevOtp(data.dev_otp);
      setAuthStep("otp");
      setOtpCountdown(60);
    } catch (err: any) {
      setAuthError(err.message || "Failed to connect to verification service.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (authMode === "login") {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.detail || "Invalid credentials.");
          return;
        }
        localStorage.setItem("stayops_user", JSON.stringify(data.user));
        localStorage.setItem("stayops_token", data.access_token);
        document.cookie = `stayops_token=${data.access_token}; path=/; max-age=86400`;
        router.push("/dashboard");
      } catch (err: any) {
        setAuthError(err.message || "Login request failed.");
      } finally {
        setLoading(false);
      }
    } else {
      if (authStep === "details") {
        await handleSendOtp();
      } else {
        setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
              full_name: authFullName.trim(),
              role: authRole,
              otp_code: authOtp.trim(),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setAuthError(data.detail || "Registration verification failed.");
            return;
          }
          localStorage.setItem("stayops_user", JSON.stringify(data.user));
          localStorage.setItem("stayops_token", data.access_token);
          document.cookie = `stayops_token=${data.access_token}; path=/; max-age=86400`;
          router.push("/dashboard");
        } catch (err: any) {
          setAuthError(err.message || "Registration request failed.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        padding: "24px 16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Brand Link */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 12 }}>
          <StayOpsLogo size={46} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>StayOps AI</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Autonomous PG &amp; Co-Living Operations</div>
          </div>
        </Link>
      </div>

      {/* Main Card */}
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          padding: 32,
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
            {authMode === "login" ? "Sign In to Your Workspace" : authStep === "details" ? "Create Your Account" : "Verify Email with OTP"}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            {authMode === "login"
              ? "Access the multi-agent operations platform or use instant demo roles below."
              : authStep === "details"
              ? "Register as a Property Manager, System Administrator, or Resident."
              : `Enter the 6-digit code dispatched to ${authEmail}`}
          </p>
        </div>

        {/* Quick Demo Logins Section */}
        {authMode === "login" && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              ⚡ Instant Quick-Demo Access:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("admin")}
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>🛡️ System Administrator</span>
                <span style={{ fontSize: 11, opacity: 0.9 }}>contact@sashankkarn.com.np ↵</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("property_manager")}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>👔 Property Manager</span>
                <span style={{ fontSize: 11, opacity: 0.9 }}>manager@stayops.ai ↵</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("tenant")}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>🏠 Resident / Tenant</span>
                <span style={{ fontSize: 11, opacity: 0.9 }}>resident@stayops.ai ↵</span>
              </button>
            </div>
          </div>
        )}

        {authError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            ⚠ {authError}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleAuthSubmit}>
          {authMode === "register" && authStep === "details" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Full Name:</label>
                <input
                  type="text"
                  required
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  placeholder="e.g. Sashank Karn"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role:</label>
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                >
                  <option value="property_manager">Property Manager (Operational Lead)</option>
                  <option value="admin">System Administrator (Full Privileges)</option>
                  <option value="tenant">Resident / Tenant (Self-Service)</option>
                </select>
              </div>
            </>
          )}

          {authStep === "details" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email Address:</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@stayops.ai"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Password:</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </>
          )}

          {authStep === "otp" && (
            <div>
              {otpSentMessage && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#166534" }}>
                  ✓ {otpSentMessage}
                </div>
              )}

              {devOtp && (
                <div
                  onClick={() => setAuthOtp(devOtp)}
                  style={{
                    background: "#eff6ff",
                    border: "1.5px dashed #93c5fd",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#1e40af" }}>
                    🔑 <strong>Dev OTP:</strong> <code style={{ fontSize: 14, fontWeight: 800 }}>{devOtp}</code>
                  </span>
                  <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>Click to fill ↵</span>
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Enter 6-Digit Code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  style={{
                    fontSize: 24,
                    letterSpacing: "0.35em",
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    padding: "10px",
                    border: "2px solid #2563eb",
                    borderRadius: 8,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAuthStep("details")}
                    style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", padding: 0 }}
                  >
                    ← Edit details
                  </button>
                  <button
                    type="button"
                    disabled={otpCountdown > 0 || loading}
                    onClick={handleSendOtp}
                    style={{ background: "transparent", border: "none", color: otpCountdown > 0 ? "#94a3b8" : "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    {otpCountdown > 0 ? `Resend code (${otpCountdown}s)` : "Resend Code"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700 }}
          >
            {loading ? "Processing..." : authMode === "login" ? "Sign In →" : authStep === "details" ? "Continue to OTP Verification →" : "Verify & Complete Registration"}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ marginTop: 20, textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthStep("details");
              setAuthError("");
            }}
            style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {authMode === "login" ? "Don't have an account? Register with OTP" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>

      {/* Back to Home Link */}
      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
          ← Back to Public Homepage
        </Link>
      </div>
    </div>
  );
}

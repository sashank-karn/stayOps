"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function BrandMark() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "#0f172a",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: "-0.03em",
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
      }}
    >
      S
    </div>
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
  const [authSuccessNotice, setAuthSuccessNotice] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authStep, setAuthStep] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const routeByRole = (user: any) => {
    if (user?.role === "tenant") {
      router.push("/resident");
    } else if (user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/manager");
    }
  };

  // Resend countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessNotice("");
    setLoading(true);

    try {
      if (authMode === "login") {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Invalid email or password. Please try again.");
        }

        localStorage.setItem("stayops_user", JSON.stringify(data.user));
        localStorage.setItem("stayops_token", data.access_token);
        routeByRole(data.user);
      } else {
        // Registration flow
        if (authStep === "details") {
          const otpRes = await fetch(`${API_URL}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: authEmail.trim().toLowerCase(),
              full_name: authFullName.trim(),
              role: authRole,
            }),
          });
          const otpData = await otpRes.json();
          if (!otpRes.ok) {
            throw new Error(otpData.detail || "Unable to send verification code. Please check your email.");
          }

          setAuthStep("otp");
          setOtpCountdown(60);
          setAuthOtp("");
          setAuthSuccessNotice(`Verification code sent to ${authEmail}. Please check your inbox.`);
        } else {
          // Verify OTP & Complete Registration
          const vRes = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: authEmail.trim().toLowerCase(),
              password: authPassword,
              full_name: authFullName.trim(),
              role: authRole,
              otp: authOtp.trim(),
            }),
          });
          const vData = await vRes.json();
          if (!vRes.ok) {
            throw new Error(vData.detail || "Verification failed. The code may be incorrect or expired.");
          }
          localStorage.setItem("stayops_user", JSON.stringify(vData.user));
          localStorage.setItem("stayops_token", vData.access_token);
          routeByRole(vData.user);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickSelect = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError("");
    setAuthSuccessNotice("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Sign in failed");
      }
      localStorage.setItem("stayops_user", JSON.stringify(data.user));
      localStorage.setItem("stayops_token", data.access_token);
      routeByRole(data.user);
    } catch (err: any) {
      setAuthError(err.message || "Quick sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "32px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 12,
          padding: "32px 32px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <BrandMark />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
              margin: "14px 0 4px 0",
              letterSpacing: "-0.02em",
            }}
          >
            StayOps
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Property operations &amp; resident living
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#f3f4f6",
            borderRadius: 8,
            padding: 3,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthStep("details");
              setAuthError("");
              setAuthSuccessNotice("");
            }}
            style={{
              padding: "7px 0",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: authMode === "login" ? "#ffffff" : "transparent",
              color: authMode === "login" ? "#111827" : "#6b7280",
              boxShadow: authMode === "login" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setAuthStep("details");
              setAuthError("");
              setAuthSuccessNotice("");
            }}
            style={{
              padding: "7px 0",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: authMode === "register" ? "#ffffff" : "transparent",
              color: authMode === "register" ? "#111827" : "#6b7280",
              boxShadow: authMode === "register" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {authError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              color: "#b91c1c",
              padding: "10px 12px",
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            {authError}
          </div>
        )}

        {authSuccessNotice && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #dcfce7",
              color: "#15803d",
              padding: "10px 12px",
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            {authSuccessNotice}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleAuthSubmit}>
          {authStep === "details" ? (
            <>
              {authMode === "register" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sonal Sharma"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                      Account role
                    </label>
                    <select
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#ffffff",
                      }}
                    >
                      <option value="property_manager">Property Manager</option>
                      <option value="admin">System Administrator</option>
                      <option value="tenant">Resident / Tenant</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@stayops.ai"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#111827",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#111827",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {loading ? "Please wait..." : authMode === "login" ? "Sign in" : "Send verification code"}
              </button>
            </>
          ) : (
            <>
              {/* OTP Entry Step */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 12, lineHeight: 1.4 }}>
                  Enter the 6-digit verification code sent to <strong>{authEmail}</strong>.
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={authOtp}
                  onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  style={{
                    width: "100%",
                    fontSize: 22,
                    letterSpacing: "0.3em",
                    textAlign: "center",
                    padding: "10px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    border: "1px solid #2563eb",
                    borderRadius: 6,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setAuthStep("details")}
                  style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0 }}
                >
                  ← Edit details
                </button>
                <span style={{ color: otpCountdown > 0 ? "#9ca3af" : "#2563eb" }}>
                  {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend code"}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {loading ? "Verifying..." : "Complete registration"}
              </button>
            </>
          )}
        </form>

        {/* Quick Role Profiles */}
        <div style={{ marginTop: 24, borderTop: "1px solid #f3f4f6", paddingTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Quick Sign-In (Verified Roles)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              onClick={() => handleRoleQuickSelect("manager@stayops.ai", "Manager@123")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Property Manager</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>manager@stayops.ai</div>
              </div>
              <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>Access /manager →</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleQuickSelect("admin@stayops.ai", "Admin@123")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>System Administrator</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>admin@stayops.ai</div>
              </div>
              <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>Access /admin →</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleQuickSelect("resident@stayops.ai", "Resident@123")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Resident Tenant</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>resident@stayops.ai (Room 101-A)</div>
              </div>
              <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Access /resident →</span>
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

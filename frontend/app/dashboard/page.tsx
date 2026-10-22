"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRouter() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("stayops_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === "tenant") {
          router.replace("/resident");
          return;
        } else if (user.role === "admin") {
          router.replace("/admin");
          return;
        } else {
          router.replace("/manager");
          return;
        }
      }
    } catch {}
    router.replace("/login");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
        color: "#64748b",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Directing to your verified workspace...</div>
      </div>
    </div>
  );
}

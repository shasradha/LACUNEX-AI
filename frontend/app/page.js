"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/chat" : "/login");
  }, [router]);

  return (
    <div className="boot-screen animate-enter">
      <div className="glass-panel boot-card">
        <div className="brand-badge animate-glow">L</div>
        <div>
          <p className="eyebrow">Initializing</p>
          <h1 className="heading-md">LACUNEX AI</h1>
        </div>
        <svg className="animate-spin" style={{ width: 20, height: 20, color: '#a855f7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

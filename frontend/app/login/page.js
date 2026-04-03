import { Suspense } from "react";
import LoginPageClient from "@/components/LoginPageClient";

function LoginFallback() {
  return (
    <div className="boot-screen animate-enter">
      <div className="glass-panel boot-card">
        <div className="brand-badge animate-glow">L</div>
        <div>
          <p className="eyebrow">Preparing</p>
          <h1 className="heading-md">LACUNEX AI</h1>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}

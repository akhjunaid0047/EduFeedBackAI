"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getUserRole } from "@/lib/auth";
import { AlertTriangle, ChevronLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [role, setRole] = useState("guest");

  useEffect(() => {
    setRole(getUserRole() || "guest");
  }, []);

  return (
    <div className="auth single">
      <main className="auth-form">
        <div className="auth-form-inner unauthorized">
          <div className="unauthorized-code">
            <AlertTriangle size={20} />
            <span className="mono">403 · forbidden</span>
          </div>
          <h1 className="serif auth-title">Wrong door.</h1>
          <p className="auth-lede">
            You're signed in as <b>{role}</b>, and this page belongs to another portal. Each
            role has its own workspace — sign in as a different role, or head back to your own.
          </p>

          <Card padded>
            <div className="unauthorized-grid">
              <div>
                <span className="eyebrow mono">what this page expects</span>
                <p className="serif unauthorized-expects">Administrator</p>
              </div>
              <div>
                <span className="eyebrow mono">what you have</span>
                <p className="serif unauthorized-expects">{role}</p>
              </div>
            </div>
          </Card>

          <div className="auth-actions">
            <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => router.back()}>
              Back to my portal
            </Button>
            <Link href="/login"><Button>Sign in as a different role</Button></Link>
          </div>
        </div>
      </main>
    </div>
  );
}

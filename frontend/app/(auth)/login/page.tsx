"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react";
import api from "@/lib/api";
import { setTokens, getUserRole } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await api.post("/api/v1/auth/login", data);
      setTokens(res.data.access_token, res.data.refresh_token);
      const role = getUserRole();
      if (role === "alumni") router.push("/alumni/dashboard");
      else if (role === "faculty") router.push("/faculty/co-attainment");
      else router.push("/admin/overview");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    }
  };

  return (
    <div className="auth">
      <aside className="auth-stage">
        <div className="auth-stage-grid" aria-hidden="true" />
        <h1 className="stage-wordmark">
          EduFeedback<em>AI</em>
        </h1>
      </aside>

      <main className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow mono">Sign in</span>
          <h1 className="serif auth-title">Welcome back.</h1>
          <p className="auth-lede">
            Use your institution credentials. Three portals — alumni, faculty,
            administrator — open from the same door.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-fields">
            <div className="field">
              <div className="field-label">
                <span className="field-label-text">Email <span className="req">*</span></span>
              </div>
              <Input
                type="email"
                placeholder="you@institution.edu"
                icon={<User size={14} />}
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <div className="field">
              <div className="field-label">
                <span className="field-label-text">Password <span className="req">*</span></span>
                <a className="link" onClick={(e) => e.preventDefault()}>Forgot?</a>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
            </div>

            {error && (
              <div style={{
                borderLeft: "2px solid var(--danger)",
                background: "var(--danger-soft)",
                padding: "8px 12px",
                borderRadius: 4,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
              </div>
            )}

            <Button type="submit" loading={isSubmitting}>
              Sign in →
            </Button>

            <div className="auth-divider"><span>or continue with</span></div>
            <div className="auth-sso">
              <button className="sso-btn" type="button">
                <span className="sso-dot" style={{ background: "var(--info)" }} />
                Institution SSO
              </button>
              <button className="sso-btn" type="button">
                <span className="sso-dot" style={{ background: "var(--ink)" }} />
                Microsoft 365
              </button>
            </div>
          </form>

          <p className="auth-foot">
            Don't have access yet?{" "}
            <a href="/register" className="link">Request an account</a>
          </p>
        </div>
      </main>
    </div>
  );
}

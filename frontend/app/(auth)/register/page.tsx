"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, GraduationCap, Users, Briefcase, Settings, Check } from "lucide-react";

const ROLES = [
  { value: "alumni",     icon: GraduationCap, title: "Alumni",        sub: "Submit a one-time career survey", note: "Most graduates pick this" },
  { value: "faculty",    icon: Users,         title: "Faculty",       sub: "Submit CO attainment & feedback" },
  { value: "admin",      icon: Briefcase,     title: "Administrator", sub: "Review analytics & syllabi" },
  { value: "superadmin", icon: Settings,      title: "Super admin",   sub: "Plus system settings" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

const schema = z.object({
  full_name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  department: z.string().optional(),
  graduation_year: z.coerce.number().optional(),
});
type FormData = z.infer<typeof schema>;

const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science & Engineering" },
  { value: "IT", label: "Information Technology" },
  { value: "ECE", label: "Electronics & Communication" },
  { value: "ME", label: "Mechanical Engineering" },
  { value: "Civil", label: "Civil Engineering" },
  { value: "Chemical", label: "Chemical Engineering" },
  { value: "Other", label: "Other" },
];

function rolePortal(role: string) {
  if (role === "alumni") return "/alumni/dashboard";
  if (role === "faculty") return "/faculty/co-attainment";
  return "/admin/overview";
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleValue>("alumni");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await api.post("/api/v1/auth/register", { ...data, role });
      const loginRes = await api.post("/api/v1/auth/login", { email: data.email, password: data.password });
      setTokens(loginRes.data.access_token, loginRes.data.refresh_token);
      setSuccess(true);
      setTimeout(() => router.push(rolePortal(role)), 900);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed.");
    }
  };

  if (success) {
    return (
      <div className="auth single">
        <main className="auth-form">
          <div className="auth-form-inner" style={{ textAlign: "center" }}>
            <span className="eyebrow mono">Welcome</span>
            <h1 className="serif auth-title">Account created.</h1>
            <p className="auth-lede">Redirecting to your portal…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth single">
      <main className="auth-form auth-form-wide">
        <button className="auth-back link" onClick={() => router.push("/login")}>
          <ChevronLeft size={14} /> Back to sign in
        </button>

        <div className="auth-form-inner auth-form-inner-wide">
          <span className="eyebrow mono">Create account</span>
          <h1 className="serif auth-title">Request access.</h1>
          <p className="auth-lede">
            Pick the role that matches how you'll use EduFeedback. Your dean will approve
            the request within one working day.
          </p>

          <SectionHead title="I am a…" />
          <div className="role-grid">
            {ROLES.map((r) => {
              const Ico = r.icon;
              const active = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  className={`role-card ${active ? "is-active" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span className="role-card-icon"><Ico size={20} /></span>
                  <span className="role-card-title">{r.title}</span>
                  <span className="role-card-sub">{r.sub}</span>
                  {r.note && <span className="role-card-note">{r.note}</span>}
                  <span className="role-card-check"><Check size={12} /></span>
                </button>
              );
            })}
          </div>

          <SectionHead title="Tell us about yourself" />
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <Input label="Full name" required placeholder="Aritra Banerjee" {...register("full_name")} error={errors.full_name?.message} />
              <Input label="Email" type="email" required placeholder="you@institution.edu" {...register("email")} error={errors.email?.message} />
              <Input label="Password" type="password" required placeholder="At least 6 characters" {...register("password")} error={errors.password?.message} />
              {role === "alumni" && (
                <>
                  <Select label="Department" required options={DEPARTMENTS} placeholder="Select department" {...register("department")} />
                  <Input label="Graduation year" type="number" required placeholder="e.g. 2022" {...register("graduation_year")} />
                </>
              )}
            </div>

            {error && (
              <div style={{
                borderLeft: "2px solid var(--danger)",
                background: "var(--danger-soft)",
                padding: "8px 12px",
                borderRadius: 4,
                marginTop: 12,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
              </div>
            )}

            <div className="auth-actions">
              <Button type="button" variant="ghost" onClick={() => router.push("/login")}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Request account →</Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="section-head" style={{ marginTop: 24, marginBottom: 14 }}>
      <div>
        <h2 className="section-title serif">{title}</h2>
      </div>
    </div>
  );
}

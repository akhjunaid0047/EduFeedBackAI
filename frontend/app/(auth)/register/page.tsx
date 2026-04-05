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
import { clsx } from "clsx";

const ROLES = [
  {
    value: "alumni",
    label: "Alumni",
    description: "Submit career surveys & track your profile",
    color: "blue",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Submit CO attainment reports & course feedback",
    color: "green",
  },
  {
    value: "admin",
    label: "Admin / HoD",
    description: "View analytics, manage syllabi, export reports",
    color: "purple",
  },
  {
    value: "superadmin",
    label: "Super Admin",
    description: "All admin access + system settings",
    color: "orange",
  },
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
  { value: "CSE", label: "Computer Science Engineering" },
  { value: "IT", label: "Information Technology" },
  { value: "ECE", label: "Electronics & Communication" },
  { value: "ME", label: "Mechanical Engineering" },
  { value: "Civil", label: "Civil Engineering" },
  { value: "Chemical", label: "Chemical Engineering" },
  { value: "Other", label: "Other" },
];

const ROLE_COLORS: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50 text-blue-700",
  green: "border-green-500 bg-green-50 text-green-700",
  purple: "border-purple-500 bg-purple-50 text-purple-700",
  orange: "border-orange-500 bg-orange-50 text-orange-700",
};

const ROLE_RING: Record<string, string> = {
  blue: "ring-blue-500",
  green: "ring-green-500",
  purple: "ring-purple-500",
  orange: "ring-orange-500",
};

function rolePortal(role: string) {
  if (role === "alumni") return "/alumni/dashboard";
  if (role === "faculty") return "/faculty/co-attainment";
  return "/admin/overview";
}

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleValue>("alumni");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await api.post("/api/v1/auth/register", { ...data, role: selectedRole });
      // Auto-login after registration
      const loginRes = await api.post("/api/v1/auth/login", {
        email: data.email,
        password: data.password,
      });
      setTokens(loginRes.data.access_token, loginRes.data.refresh_token);
      setSuccess(true);
      setTimeout(() => router.push(rolePortal(selectedRole)), 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed.");
    }
  };

  const activeRole = ROLES.find((r) => r.value === selectedRole)!;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="text-green-600 text-5xl mb-3">✓</div>
          <h2 className="text-xl font-semibold text-gray-900">Account Created!</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Redirecting to your {activeRole.label} portal…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-8 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500 mb-6">EduFeedback AI — choose your role to get started</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={clsx(
                  "text-left rounded-xl border-2 px-4 py-3 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-offset-1",
                  ROLE_RING[role.color],
                  selectedRole === role.value
                    ? `${ROLE_COLORS[role.color]} border-current`
                    : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                )}
              >
                <p className="font-semibold text-sm">{role.label}</p>
                <p className={clsx(
                  "text-xs mt-0.5",
                  selectedRole === role.value ? "opacity-80" : "text-gray-400"
                )}>
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              {...register("full_name")}
              error={errors.full_name?.message}
            />
            <Input
              label="Email"
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              {...register("password")}
              error={errors.password?.message}
            />

            {/* Alumni-only fields */}
            {selectedRole === "alumni" && (
              <>
                <Select
                  label="Department"
                  options={DEPARTMENTS}
                  placeholder="Select department"
                  {...register("department")}
                />
                <Input
                  label="Graduation Year"
                  type="number"
                  placeholder="e.g. 2022"
                  {...register("graduation_year")}
                />
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Create {activeRole.label} Account
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-500">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

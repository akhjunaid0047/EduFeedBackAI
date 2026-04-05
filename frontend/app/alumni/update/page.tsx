"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const Textarea = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} {...props} />
  </div>
);

export default function AlumniUpdatePage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["alumni-me"],
    queryFn: () => api.get("/api/v1/alumni/me").then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (profile) reset(profile);
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/v1/alumni/survey", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni-me"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Update Profile</h1>
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Profile updated successfully!</div>}
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <Card title="Career Update">
          <div className="space-y-4">
            <Select label="Employment Status" options={[{value:"Employed",label:"Employed"},{value:"Higher Studies",label:"Higher Studies"},{value:"Unemployed",label:"Unemployed"},{value:"Self-employed",label:"Self-employed"},{value:"Freelance",label:"Freelance"}]} {...register("employment_status")} />
            <Input label="Job Role / Designation" {...register("job_role_designation")} />
            <Input label="Company / Organization" {...register("company_name")} />
            <Input label="Industry Domain" {...register("industry_domain")} />
            <Textarea label="Skills acquired after graduation" {...register("skills_acquired_after_graduation")} />
            <Textarea label="New certifications" {...register("certifications_completed")} />
            <Input label="Career Growth Satisfaction (1–5)" type="number" min={1} max={5} {...register("career_growth_satisfaction")} />
          </div>
        </Card>
        <Button type="submit" loading={mutation.isPending} className="w-full">Save Changes</Button>
      </form>
    </div>
  );
}

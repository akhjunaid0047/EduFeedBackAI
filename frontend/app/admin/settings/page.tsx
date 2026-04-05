"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/v1/settings").then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    if (cfg) reset(cfg);
  }, [cfg, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/v1/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Institution Settings</h1>
      <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
        Superadmin only. Changes affect scoring across the entire platform.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <Card title="Faculty Module">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("faculty_module_enabled")} className="rounded w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">Enable Faculty Module</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            When enabled, faculty can submit CO attainment reports and their data is included in scoring.
          </p>
        </Card>

        <Card title="Relevance Score Weights" subtitle="Must conceptually sum to 1.0 (renormalized automatically when faculty module is off)">
          <div className="space-y-4">
            <Input label="Alumni Rating Weight (w1)" type="number" step="0.01" min="0" max="1" {...register("relevance_weight_alumni")} />
            <Input label="Skill Match Weight (w2)" type="number" step="0.01" min="0" max="1" {...register("relevance_weight_skill_match")} />
            <Input label="CO Attainment Weight (w3) — only used when faculty module enabled" type="number" step="0.01" min="0" max="1" {...register("relevance_weight_co_attainment")} />
          </div>
        </Card>

        <Card title="Analysis Thresholds">
          <div className="space-y-4">
            <Input label="Gap Threshold (0–1) — similarity below this = flagged as gap" type="number" step="0.01" min="0" max="1" {...register("gap_threshold")} />
            <Input label="Min Alumni Mention % (0–1) — skill must meet this demand to qualify" type="number" step="0.01" min="0" max="1" {...register("min_alumni_mention_pct")} />
          </div>
        </Card>

        <Button type="submit" loading={mutation.isPending} className="w-full">Save Settings</Button>
      </form>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function FacultyHistoryPage() {
  const { data: coReports, isLoading: l1 } = useQuery({
    queryKey: ["faculty-co"],
    queryFn: () => api.get("/api/v1/faculty/co-attainment").then((r) => r.data),
  });

  const { data: feedbacks, isLoading: l2 } = useQuery({
    queryKey: ["faculty-feedback"],
    queryFn: () => api.get("/api/v1/faculty/feedback").then((r) => r.data),
  });

  if (l1 || l2) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>

      <Card title="CO Attainment Reports">
        {(!coReports || coReports.length === 0) ? (
          <p className="text-gray-500 text-sm">No reports submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {coReports.map((r: any) => (
              <div key={r.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg">
                <span className="font-medium">{r.co_code}</span>
                <span className="text-gray-500">{r.academic_year} · Sem {r.semester}</span>
                <span>{r.final_attainment_pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Course Feedback">
        {(!feedbacks || feedbacks.length === 0) ? (
          <p className="text-gray-500 text-sm">No feedback submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f: any) => (
              <div key={f.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-500 text-xs mb-1">{new Date(f.submitted_at).toLocaleDateString()}</p>
                {f.topics_to_add && <p><strong>To add:</strong> {f.topics_to_add}</p>}
                {f.topics_to_remove && <p><strong>To reduce:</strong> {f.topics_to_remove}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

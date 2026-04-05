"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AlumniDashboard() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["alumni-me"],
    queryFn: () => api.get("/api/v1/alumni/me").then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="text-center py-16">
      <p className="text-gray-500">No survey submitted yet.</p>
      <a href="/alumni/survey" className="mt-3 inline-block text-blue-600 hover:underline text-sm">
        Submit your career survey →
      </a>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <Card title="Personal Information">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Department</dt>
            <dd className="font-medium mt-0.5">{profile.department || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Graduation Year</dt>
            <dd className="font-medium mt-0.5">{profile.graduation_year || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Degree Program</dt>
            <dd className="font-medium mt-0.5">{profile.degree_program || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Gender</dt>
            <dd className="font-medium mt-0.5">{profile.gender || "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Career Status">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Employment Status</dt>
            <dd className="mt-1">
              <Badge color={profile.employment_status === "Employed" ? "green" : "gray"}>
                {profile.employment_status || "Not specified"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Current Role</dt>
            <dd className="font-medium mt-0.5">{profile.job_role_designation || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Company</dt>
            <dd className="font-medium mt-0.5">{profile.company_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Industry</dt>
            <dd className="font-medium mt-0.5">{profile.industry_domain || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Work Mode</dt>
            <dd className="font-medium mt-0.5">{profile.work_mode || "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Feedback Ratings">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Course Relevance Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-700">{profile.course_relevance_rating ?? "—"}</span>
              <span className="text-gray-400 text-sm">/ 5</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Career Growth Satisfaction</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-green-700">{profile.career_growth_satisfaction ?? "—"}</span>
              <span className="text-gray-400 text-sm">/ 5</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

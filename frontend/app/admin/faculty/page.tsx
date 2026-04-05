"use client";

import { Card } from "@/components/ui/Card";

export default function AdminFacultyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Faculty Submissions</h1>
      <Card>
        <p className="text-center text-gray-500 py-8">
          Faculty module management. Enable the faculty module in Settings to view CO attainment reports and feedback submissions.
        </p>
      </Card>
    </div>
  );
}

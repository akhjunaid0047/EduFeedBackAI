import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You don&apos;t have permission to access this page.</p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm font-medium">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-7 h-7";
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClass} border-3 border-blue-600 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

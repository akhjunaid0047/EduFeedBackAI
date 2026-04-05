import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  color?: "green" | "red" | "orange" | "blue" | "gray" | "purple";
  size?: "sm" | "md";
}

const colorClasses = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({ children, color = "gray", size = "sm" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}

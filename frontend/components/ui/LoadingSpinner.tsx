export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 14 : size === "lg" ? 28 : 20;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
      <span
        className="spin"
        style={{ width: px, height: px }}
      />
    </div>
  );
}

import { AeviaArc } from "./AeviaArc";

export function AeviaWordmark({ size = "sm" }: { size?: "sm" | "md" }) {
  const arc = size === "md" ? 22 : 18;
  const type = size === "md" ? "text-[15px]" : "text-[13px]";
  const sub = size === "md" ? "text-[9px]" : "text-[8px]";
  return (
    <div className="flex items-center gap-2.5">
      <AeviaArc size={arc} />
      <div className="flex flex-col leading-none">
        <span className={`wordmark ${type} text-fg`}>AEVIA</span>
        <span className={`wordmark ${sub} mt-1 text-fg-subtle`} style={{ letterSpacing: "0.32em" }}>
          PLAN
        </span>
      </div>
    </div>
  );
}

"use client";

const initials = (name: string) => name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const SIZE: Record<"sm" | "md" | "lg", string> = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-[12px]", lg: "h-14 w-14 text-[18px]" };

export function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${SIZE[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`${SIZE[size]} grid shrink-0 place-items-center rounded-full bg-[var(--accent-wash)] font-semibold text-[var(--accent)]`}>
      {initials(name) || "?"}
    </div>
  );
}

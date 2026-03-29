import { cn } from "@/lib/utils";

export const BRAND_LOGO_URL =
  "https://39600253.fs1.hubspotusercontent-na1.net/hubfs/39600253/logo_px%20copy.jpg";

type Size = "sm" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-8 w-8 rounded-lg p-0.5",
  lg: "h-14 w-14 rounded-2xl p-1 shadow-refined",
};

export function BrandLogoMark({
  size = "sm",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 overflow-hidden bg-white border border-border/50",
        sizeClass[size],
        className
      )}
    >
      <img
        src={BRAND_LOGO_URL}
        alt="PX Data"
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

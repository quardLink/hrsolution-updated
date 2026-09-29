// The blurred ambient color blobs behind every full-screen surface in the
// app (admin dashboard, kiosk splash, kiosk pairing) — kept as one shared
// component so the "liquid glass" backdrop reads as the same wallpaper
// everywhere rather than a slightly different one per page. Subtle in
// light mode (a hint of tint, so it still reads as a clean daytime
// surface) and full-strength in dark mode, which is where glass panels
// over it actually look like glass.
export default function GlassBackdrop() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 -left-24 w-130 h-130 rounded-full blur-[110px] opacity-20 dark:opacity-60"
        style={{ background: "hsl(var(--glow-1))" }}
      />
      <div
        className="absolute -top-24 -right-28 w-115 h-115 rounded-full blur-[110px] opacity-[0.14] dark:opacity-55"
        style={{ background: "hsl(var(--glow-2))" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 w-155 h-155 rounded-full blur-[120px] opacity-10 dark:opacity-45"
        style={{ background: "hsl(var(--glow-3))" }}
      />
    </div>
  );
}

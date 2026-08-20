import { useLocale } from "@/contexts/LocaleContext";

// A fixed brand watermark, always in the physical bottom-right corner
// regardless of locale — like most "Powered by" badges, it's meant to
// stay put rather than mirror with the rest of the RTL layout.
export default function PoweredBy() {
  const { t } = useLocale();
  return (
    <div className="fixed bottom-3 right-3 z-40 pointer-events-none select-none">
      <span className="text-[11px] font-medium text-muted-foreground/70 bg-background/60 backdrop-blur-sm px-2 py-1 rounded-md">
        {t("common.poweredBy")}{" "}
        <span dir="ltr" className="inline-flex">
          <span className="text-foreground font-semibold">quard</span>
          <span className="text-primary font-semibold">Link</span>
        </span>
      </span>
    </div>
  );
}

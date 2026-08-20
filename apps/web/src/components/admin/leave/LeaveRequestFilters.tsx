import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

type FilterValue = "all" | "pending" | "approved" | "rejected";

const FILTERS: FilterValue[] = ["pending", "approved", "rejected", "all"];

interface Props {
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onNew: () => void;
}

export default function LeaveRequestFilters({ filter, onFilterChange, onNew }: Props) {
  const { t } = useLocale();
  const filterLabel: Record<FilterValue, string> = {
    all: t("leave.filterAll"),
    pending: t("leave.filterPending"),
    approved: t("leave.filterApproved"),
    rejected: t("leave.filterRejected"),
  };

  return (
    <div className="p-4 lg:p-5 border-b">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg lg:text-xl font-semibold">{t("leave.title")}</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">{t("leave.subtitle")}</p>
        </div>
        <Button onClick={onNew}>
          <Plus /> {t("leave.new")}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filter === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>
    </div>
  );
}

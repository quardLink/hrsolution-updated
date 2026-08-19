type FilterValue = "all" | "pending" | "approved" | "rejected";

const FILTERS: FilterValue[] = ["pending", "approved", "rejected", "all"];

interface Props {
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onNew: () => void;
}

export default function LeaveRequestFilters({ filter, onFilterChange, onNew }: Props) {
  return (
    <div className="p-4 lg:p-5 border-b border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground">Leave Requests</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">Track and manage time-off requests.</p>
        </div>
        <button
          onClick={onNew}
          className="px-3 lg:px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium rounded-lg whitespace-nowrap"
        >
          + New
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors whitespace-nowrap ${
              filter === f ? "bg-primary/15 text-indigo-300 font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

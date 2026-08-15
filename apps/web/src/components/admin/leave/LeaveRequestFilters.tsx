type FilterValue = "all" | "pending" | "approved" | "rejected";

const FILTERS: FilterValue[] = ["pending", "approved", "rejected", "all"];

interface Props {
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onNew: () => void;
}

export default function LeaveRequestFilters({ filter, onFilterChange, onNew }: Props) {
  return (
    <div className="p-4 lg:p-5 border-b border-gray-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">Leave Requests</h2>
          <p className="text-sm text-gray-500 hidden sm:block">Track and manage time-off requests.</p>
        </div>
        <button
          onClick={onNew}
          className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
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
              filter === f ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

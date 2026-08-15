import StatCard from "./StatCard";
import type { AttendanceReportStats } from "../../../lib/pdf/attendanceReport";

interface EmployeeOption {
  id: string;
  name: string;
}

interface Props {
  stats: AttendanceReportStats;
  filterFromDate: string;
  onFilterFromDateChange: (value: string) => void;
  filterToDate: string;
  onFilterToDateChange: (value: string) => void;
  filterEmployee: string;
  onFilterEmployeeChange: (value: string) => void;
  employees: EmployeeOption[];
  onExportPdf: () => void;
}

export default function ReportFilters({
  stats,
  filterFromDate,
  onFilterFromDateChange,
  filterToDate,
  onFilterToDateChange,
  filterEmployee,
  onFilterEmployeeChange,
  employees,
  onExportPdf,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard label="Total Records" value={stats.totalRecords} color="blue" />
        <StatCard label="Check-Ins" value={stats.totalCheckIns} color="emerald" />
        <StatCard label="Check-Outs" value={stats.totalCheckOuts} color="indigo" />
        <StatCard label="Days Tracked" value={stats.uniqueDays} color="violet" />
        <StatCard label="Anomalies" value={stats.anomalies} color="amber" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 lg:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => onFilterFromDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => onFilterToDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => onFilterEmployeeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
              ))}
            </select>
          </div>
          <button
            onClick={onExportPdf}
            className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            title="Generate professional PDF report"
          >
            📄 Export PDF
          </button>
        </div>
      </div>
    </>
  );
}

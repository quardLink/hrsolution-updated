export interface LeaveTypeOption {
  value: string;
  label: string;
}

export const LEAVE_TYPES: LeaveTypeOption[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "emergency", label: "Emergency" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

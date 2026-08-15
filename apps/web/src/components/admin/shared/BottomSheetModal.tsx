import type { ReactNode } from "react";

interface Props {
  maxWidth?: string;
  scrollable?: boolean;
  children: ReactNode;
}

// The modal shell shared by the Employees and Leave Requests "add/edit" forms:
// a bottom sheet on mobile, a centered dialog on larger screens.
export default function BottomSheetModal({ maxWidth = "max-w-md", scrollable = false, children }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className={`bg-white rounded-t-2xl sm:rounded-xl shadow-xl ${maxWidth} w-full ${scrollable ? "max-h-[92vh] overflow-y-auto" : ""}`}>
        {children}
      </div>
    </div>
  );
}

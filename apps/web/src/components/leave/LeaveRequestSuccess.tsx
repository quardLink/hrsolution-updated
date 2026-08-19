export interface LeaveRequestSuccessData {
  employeeName: string;
  fromDate: string;
  toDate: string;
  type: string;
}

export default function LeaveRequestSuccess({ success, onReset }: { success: LeaveRequestSuccessData; onReset: () => void }) {
  return (
    <div className="p-6 sm:p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center text-3xl mb-4">
        ✓
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Request submitted</h2>
      <div className="text-sm text-muted-foreground space-y-1 mb-6">
        <p>Thank you, <span className="font-medium text-foreground">{success.employeeName}</span>.</p>
        <p>
          Your <span className="font-medium text-foreground/90">{success.type}</span> request for{" "}
          <span className="font-medium text-foreground/90">{success.fromDate}</span>
          {success.fromDate !== success.toDate && (
            <> → <span className="font-medium text-foreground/90">{success.toDate}</span></>
          )}{" "}
          has been sent to admin for review.
        </p>
        <p className="pt-2 text-xs text-muted-foreground">
          You'll be informed once it's approved or rejected.
        </p>
      </div>
      <button
        onClick={onReset}
        className="px-5 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium"
      >
        Submit another request
      </button>
    </div>
  );
}

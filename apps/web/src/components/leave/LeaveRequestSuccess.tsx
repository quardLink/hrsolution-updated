import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export interface LeaveRequestSuccessData {
  employeeName: string;
  fromDate: string;
  toDate: string;
  type: string;
}

export default function LeaveRequestSuccess({ success, onReset }: { success: LeaveRequestSuccessData; onReset: () => void }) {
  const { t, dict } = useLocale();
  return (
    <div className="p-6 sm:p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{t("leavePublic.submittedTitle")}</h2>
      <div className="text-sm text-muted-foreground space-y-1 mb-6">
        <p>{dict.leavePublic.thankYou(success.employeeName)}</p>
        <p>
          <span className="font-medium text-foreground/90">{success.type}</span>{" "}
          <span className="font-medium text-foreground/90">{success.fromDate}</span>
          {success.fromDate !== success.toDate && (
            <> → <span className="font-medium text-foreground/90">{success.toDate}</span></>
          )}{" "}
          {t("leavePublic.sentForReview")}
        </p>
        <p className="pt-2 text-xs text-muted-foreground">{t("leavePublic.willBeInformed")}</p>
      </div>
      <Button onClick={onReset}>{t("leavePublic.submitAnother")}</Button>
    </div>
  );
}

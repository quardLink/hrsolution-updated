import cron from "node-cron";
import { runDailyPayrollJob } from "./payrollDailyJob";
import { logger } from "./logger";

export function startScheduledJobs(): void {
  cron.schedule(
    "0 0 * * *",
    () => {
      const sheetId = process.env.GOOGLE_SHEET_ID;
      if (!sheetId) {
        logger.warn("Skipping scheduled daily payroll job — GOOGLE_SHEET_ID not configured");
        return;
      }
      void runDailyPayrollJob(sheetId);
    },
    { timezone: "Asia/Riyadh" },
  );

  logger.info("Daily payroll cron job scheduled (00:00 Asia/Riyadh)");
}

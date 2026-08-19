import cron from "node-cron";
import { runDailyPayrollJob } from "./payrollDailyJob";
import { logger } from "./logger";
import { isDbConfigured, getDb } from "../db/client";

export function startScheduledJobs(): void {
  cron.schedule(
    "0 0 * * *",
    async () => {
      if (!isDbConfigured()) {
        logger.warn("Skipping scheduled daily payroll job — DATABASE_URL not configured");
        return;
      }
      const orgs = await getDb().query.orgs.findMany({ columns: { id: true } });
      for (const org of orgs) {
        void runDailyPayrollJob(org.id);
      }
    },
    { timezone: "Asia/Riyadh" },
  );

  logger.info("Daily payroll cron job scheduled (00:00 Asia/Riyadh)");
}

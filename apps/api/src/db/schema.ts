import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoDataUrl: text("logo_data_url"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Composite-keyed on (org_id, code) — `code` is the human-facing "EMP001"
// style identifier the rest of the app already treats as the employee's
// id. Keeping it as the real key (rather than adding a surrogate uuid)
// avoids touching every call site that passes an employee id as a string.
export const employees = pgTable(
  "employees",
  {
    orgId: uuid("org_id").notNull().references(() => orgs.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    pinHash: text("pin_hash").notNull(),
    role: text("role").notNull().default("other"),
    active: boolean("active").notNull().default(true),
    useCustomSchedule: boolean("use_custom_schedule").notNull().default(false),
    morningStart: text("morning_start").notNull().default("08:00"),
    morningEnd: text("morning_end").notNull().default("13:30"),
    afternoonStart: text("afternoon_start").notNull().default("16:00"),
    afternoonEnd: text("afternoon_end").notNull().default("19:00"),
    monthlySalary: numeric("monthly_salary", { precision: 12, scale: 2 }).notNull().default("0"),
    // 128-d face-api.js recognition descriptor, captured once by an admin
    // pointing a camera at the employee. Never a photo — just the numeric
    // embedding, which can't be turned back into an image. Null means this
    // employee hasn't been enrolled yet and attendance stays PIN-only for
    // them (no forced rollout / no break for existing employees).
    faceDescriptor: jsonb("face_descriptor").$type<number[] | null>(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.code] })],
);

export const roles = pgTable(
  "roles",
  {
    orgId: uuid("org_id").notNull().references(() => orgs.id),
    value: text("value").notNull(),
    label: text("label").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.value] })],
);

// One row per org — replaces the old key/value Settings sheet with real
// columns. Time-of-day fields stay text ("HH:MM") to match the string
// format every caller (payroll.ts, routes) already expects.
export const orgSettings = pgTable("org_settings", {
  orgId: uuid("org_id").primaryKey().references(() => orgs.id),
  defaultMorningStart: text("default_morning_start").notNull().default("08:00"),
  defaultMorningEnd: text("default_morning_end").notNull().default("13:30"),
  defaultAfternoonStart: text("default_afternoon_start").notNull().default("16:00"),
  defaultAfternoonEnd: text("default_afternoon_end").notNull().default("19:00"),
  lunchBreakEnd: text("lunch_break_end").notNull().default("13:30"),
  lateThresholdMinutes: text("late_threshold_minutes").notNull().default("15"),
  weeklyOffDay: text("weekly_off_day").notNull().default("Friday"),
  payrollShiftStart: text("payroll_shift_start").notNull().default("09:00"),
  payrollShiftEnd: text("payroll_shift_end").notNull().default("18:00"),
  payrollBreakMinutes: text("payroll_break_minutes").notNull().default("60"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  type: text("type").notNull().default("annual"),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull(),
  reviewedAt: text("reviewed_at").notNull().default(""),
  reviewedBy: text("reviewed_by").notNull().default(""),
});

// `timestamp` (text) preserves the existing "MM/DD/YYYY, HH:MM:SS AM/PM"
// display format that payroll.ts's parseLogTimestamp already parses;
// `createdAt` is a real timestamptz used for ordering/queries.
export const attendanceLogs = pgTable("attendance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  action: text("action").notNull(),
  session: text("session").notNull(),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull(),
  message: text("message").notNull(),
  deviceId: uuid("device_id").references(() => devices.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollDailyEntries = pgTable("payroll_daily_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  date: text("date").notNull(),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  workedHours: numeric("worked_hours", { precision: 10, scale: 2 }).notNull(),
  otHours: numeric("ot_hours", { precision: 10, scale: 2 }).notNull(),
  dailyRate: numeric("daily_rate", { precision: 12, scale: 2 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }).notNull(),
  otPay: numeric("ot_pay", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A "device" is one paired kiosk. attendance/log and attendance/employees
// require a valid, unrevoked device token — this is what makes attendance
// impossible to fake from outside the office (the token never leaves the
// physical kiosk it was paired on).
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  // Captured once at pairing time (not re-checked afterward) — purely
  // informational, so an admin can tell which physical machine a device
  // row actually is. Not part of the security model: the token itself is
  // what's checked on every request.
  userAgent: text("user_agent"),
  pairedIp: text("paired_ip"),
  pairedLocation: text("paired_location"), // e.g. "Riyadh, Saudi Arabia" — resolved once at pairing time
  lastSeenIp: text("last_seen_ip"),
  pairedAt: timestamp("paired_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// Short-lived, single-use codes an admin generates in Settings and reads
// out to whoever is standing at the kiosk — the actual device token is
// never displayed or transmitted anywhere except this one-time exchange.
export const pairingCodes = pgTable("pairing_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  code: text("code").notNull(),
  deviceName: text("device_name").notNull().default("Kiosk"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

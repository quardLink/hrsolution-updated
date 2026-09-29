import {
  bigint,
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
    // The numeric ID this employee is enrolled under on a fingerprint
    // terminal (ZKTeco keypads are numeric-only, so this is usually
    // different from `code`, e.g. "EMP001"). Null means not enrolled on
    // any terminal yet — punches fall back to matching `code` directly.
    biometricPin: text("biometric_pin"),
    // Only consulted when orgSettings.payrollMethod is "hybrid" — null
    // means "inherit the company default". Switching the company method
    // into Hybrid backfills every employee's row to a real value (see
    // updateOfficeSettings in settings.ts), so a null here in Hybrid mode
    // only ever happens for a brand-new employee who hasn't been set yet.
    payrollMethod: text("payroll_method").$type<"hourly" | "daily" | null>(),
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
  // Expected break window, e.g. 12:00–13:00 — used as the fallback break
  // deduction on days with no real punched break (see payroll.ts). Set
  // breakEnd equal to breakStart to effectively disable the assumption.
  payrollBreakStart: text("payroll_break_start").notNull().default("12:00"),
  payrollBreakEnd: text("payroll_break_end").notNull().default("13:00"),
  // When on, a day's overtime only counts toward pay once HR approves it
  // (see otApprovals below) — worked-but-unapproved OT still shows on
  // Records, it just isn't paid until reviewed.
  otApprovalRequired: boolean("ot_approval_required").notNull().default(true),

  // Payroll calculation method — see payroll.ts's PayrollPolicy /
  // calculatePayrollForEmployee. "hybrid" defers to each employee's own
  // employees.payrollMethod field.
  payrollMethod: text("payroll_method").$type<"hourly" | "daily" | "hybrid">().notNull().default("daily"),
  payrollDailyRateBasis: text("payroll_daily_rate_basis").$type<"fixed_30" | "actual_days">().notNull().default("fixed_30"),
  payrollStandardDailyHours: text("payroll_standard_daily_hours").notNull().default("8"),
  payrollOtStartsAfterMinutes: text("payroll_ot_starts_after_minutes").notNull().default("30"),
  // Applied to the hourly rate — 1.5 covers both "Article 107" and "1.5x
  // basic" from the spec (see PayrollPolicy.otMultiplier for why those
  // collapse to the same number here).
  payrollOtMultiplier: text("payroll_ot_multiplier").notNull().default("1.5"),
  payrollRoundingBlockMinutes: text("payroll_rounding_block_minutes").notNull().default("15"),
  payrollFullDayMinHours: text("payroll_full_day_min_hours").notNull().default("7"),
  payrollHalfDayMinHours: text("payroll_half_day_min_hours").notNull().default("4"),
  payrollMaxLateMinutesBeforeHalfDay: text("payroll_max_late_minutes_before_half_day").notNull().default("60"),
  payrollMissingCheckoutHandling: text("payroll_missing_checkout_handling")
    .$type<"half_day" | "hr_review">()
    .notNull()
    .default("hr_review"),
  payrollWeekendHolidayPaidAsOvertime: boolean("payroll_weekend_holiday_paid_as_overtime").notNull().default(true),

  // Remote check-in (work-from-home / field staff, punching from their own
  // paired phone instead of the kiosk or a fingerprint terminal) — see
  // lib/remoteCheckIn.ts. "disabled" hides the feature entirely; a company
  // can already have phones paired from before disabling it, they just
  // stop being able to submit.
  remoteCheckInMode: text("remote_checkin_mode")
    .$type<"disabled" | "requires_approval" | "auto_approve">()
    .notNull()
    .default("disabled"),
  // Only consulted when remoteCheckInMode is "auto_approve" — outside any
  // configured geofenceSites row, the request falls back to pending
  // instead of auto-approving.
  remoteCheckInRequireGeofence: boolean("remote_checkin_require_geofence").notNull().default(false),
  // A pending request older than this is treated as expired the next time
  // anyone reads the list (see listRemoteCheckInRequests) — there's no
  // background job in this app to sweep it proactively.
  remoteCheckInExpiryHours: text("remote_checkin_expiry_hours").notNull().default("24"),
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
  biometricDeviceId: uuid("biometric_device_id").references(() => biometricDevices.id),
  // How this specific punch was verified — "pin" and "face" come from the
  // kiosk (see routes/attendance.ts), "fingerprint"/"card"/"password" come
  // from a ZKTeco terminal's own verify-mode code (see mapZktVerifyCode in
  // routes/zkteco.ts). Defaults to "pin" for rows written before this
  // column existed.
  authType: text("auth_type").notNull().default("pin"),
  // The raw, verbatim timestamp string a fingerprint terminal sent for
  // this punch — not trusted as the actual event time (the terminal's
  // clock is unreliable, see occurredAt below), but a retry of the same
  // physical punch resends this identical string, which is what makes it
  // useful as a dedup key: two punches this close together with different
  // raw strings are genuinely different events, not a retry.
  sourceRawTimestamp: text("source_raw_timestamp"),
  // True when this punch's corrected device time landed far from when the
  // server actually received it — either the terminal buffered a backlog
  // offline and pushed it late, or its clock jumped. occurredAt below is
  // still the best estimate of when the punch really happened; this is
  // just a signal for "double-check this one" / re-running that day's
  // payroll, not a correctness flag on occurredAt itself.
  syncedLate: boolean("synced_late").notNull().default(false),
  // The actual moment the event happened (kiosk tap or fingerprint punch),
  // as opposed to `createdAt` (row insertion time). These match for kiosk
  // rows, but diverge for a fingerprint terminal that was offline and
  // bulk-pushes a backlog of punches later — same-day/ordering logic must
  // use this column, not createdAt.
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
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

// HR's decision on one employee's overtime for one day — only consulted
// when orgSettings.otApprovalRequired is on (see calculateMonthlyPayroll in
// payroll.ts, which only pays OT for dates with an "approved" row here).
// A day with worked OT and no row at all is implicitly "pending". Keyed by
// (org, employee, date) rather than a surrogate id so approving twice just
// overwrites the same decision instead of creating duplicates.
export const otApprovals = pgTable(
  "ot_approvals",
  {
    orgId: uuid("org_id").notNull().references(() => orgs.id),
    employeeCode: text("employee_code").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    // Snapshot of the OT minutes this decision was made against — purely
    // for the admin UI's audit trail, never re-trusted for pay math (that
    // always recomputes fresh from attendance logs).
    otMinutes: numeric("ot_minutes", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("approved"), // "approved" | "rejected"
    reviewedBy: text("reviewed_by").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.employeeCode, t.date] })],
);

// A "device" is one paired kiosk, OR — when employeeCode is set — one
// employee's personal phone paired for remote check-in (see
// lib/remoteCheckIn.ts). attendance/log and attendance/employees require a
// valid, unrevoked device token — this is what makes attendance impossible
// to fake from outside the office (the token never leaves the physical
// kiosk it was paired on); a remote-checkin device token is scoped even
// tighter, to submitting punches for that one employee only.
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
  // Null for a shared kiosk. Set for a personal remote-checkin phone —
  // carried over from the pairing code that created this row (see
  // redeemPairingCode). Pairing a new phone for the same employee revokes
  // whatever device previously held this employeeCode, enforcing "one
  // paired phone per employee".
  employeeCode: text("employee_code"),
});

// A registered fingerprint/access-control terminal (e.g. a ZKTeco F22)
// that pushes attendance over the ADMS protocol. Unlike `devices`, there's
// no pairing handshake — an admin reads the serial number off the unit's
// screen (Comm menu) and registers it here, then points the terminal's
// "Cloud Server" setting at this app's URL. The serial is what the device
// sends on every request, so it's what maps a push back to an org.
export const biometricDevices = pgTable("biometric_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  serialNumber: text("serial_number").notNull().unique(),
  name: text("name").notNull().default("Fingerprint Terminal"),
  lastSeenIp: text("last_seen_ip"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  // This terminal's hardware clock can't be trusted or fixed by hand (ADMS
  // resyncs it off the server's HTTP response every heartbeat, drifting it
  // right back). Instead we track the gap between "server time when a
  // real-time punch arrived" and "what the device's own timestamp said",
  // and use that gap to correct every punch's reported time — see
  // ingestPunch in routes/zkteco.ts for the calibration logic. Null until
  // the first punch is calibrated.
  clockOffsetMs: bigint("clock_offset_ms", { mode: "number" }),
  // A newly-observed offset that disagrees with clockOffsetMs, held for
  // one punch to see if the NEXT punch confirms the same new gap (a real,
  // lasting clock change) rather than promoting it immediately (which a
  // single buffered/delayed punch would otherwise corrupt calibration
  // with).
  offsetCandidateMs: bigint("offset_candidate_ms", { mode: "number" }),
  offsetCandidateAt: timestamp("offset_candidate_at", { withTimezone: true }),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// Short-lived, single-use codes an admin generates in Settings (for a
// kiosk) or on an employee's own record (for their remote-checkin phone —
// see employeeCode below) and reads out to whoever is pairing — the actual
// device token is never displayed or transmitted anywhere except this
// one-time exchange. Redeemed by the same /devices/pair endpoint either
// way; employeeCode is just carried through to the resulting device row.
export const pairingCodes = pgTable("pairing_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  code: text("code").notNull(),
  deviceName: text("device_name").notNull().default("Kiosk"),
  employeeCode: text("employee_code"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Known field/site coordinates a company can set up so remote check-ins
// from those locations can be auto-approved without HR review (see
// orgSettings.remoteCheckInRequireGeofence). Manual lat/lng entry — no map
// picker in this pass.
export const geofenceSites = pgTable("geofence_sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  radiusMeters: numeric("radius_meters", { precision: 10, scale: 2 }).notNull().default("200"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One remote check-in/out submission. Stays "pending" (with its photo)
// until HR decides or it expires — no attendanceLogs row exists for it
// until approved, matching the spec: "it becomes a request, not a record,
// until HR approves it". Auto-approved requests still get a row here for
// the audit trail, just with status already "approved" and the photo
// discarded immediately (no review ever happens for those).
export const remoteCheckInRequests = pgTable("remote_checkin_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => orgs.id),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  action: text("action").notNull(), // "checkin" | "checkout"
  status: text("status").notNull().default("pending"), // pending | approved | rejected | expired
  // Server time at submission — the moment this becomes the punch's
  // occurredAt if/when approved. Never the phone's own clock.
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  deviceId: uuid("device_id").references(() => devices.id),
  // A live camera capture, kept only until the decision is made (or the
  // request expires) — see decideRemoteCheckInRequest / listRemoteCheckInRequests,
  // both of which null this out the moment a request leaves "pending".
  photoDataUrl: text("photo_data_url"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  // Null when geofencing isn't configured/relevant for this request (e.g.
  // mode is "requires_approval", where location is informational only).
  withinGeofence: boolean("within_geofence"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

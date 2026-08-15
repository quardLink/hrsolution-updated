# Software Document — Employee Attendance & Payroll

Functional specification for the system used by Petro Safe Tech to track
employee attendance, manage leave, and calculate monthly payroll. For the
technical/code architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 1. Overview

A single-company workforce system with two surfaces:

- **Employee Kiosk** (`/`) — a shared-device, no-login check-in/check-out
  terminal, plus a separate leave-request form (`/leave-request`)
- **Admin Dashboard** (`/admin`) — password-protected, for managing
  employees, reviewing attendance, approving leave, and running payroll

Data lives in **Google Sheets** (tabs: `Employees`, `Settings`,
`LeaveRequests`, `Roles`, plus an attendance log sheet), reached through a
Google Cloud service account — no database to host. If Google Sheets isn't
configured, the kiosk still works using a built-in seed employee list and
default office hours, without persisting anything.

## 2. Roles & Access

| Role | How they authenticate | What they can do |
|---|---|---|
| Employee | 4-digit PIN, selected by name on a shared kiosk device | Check in/out, submit a leave request |
| Admin | Single shared password (`admin123` by default, or `ADMIN_PASSWORD` env var / a custom hash set in Settings) | Everything below |

There is one admin role — no per-admin accounts or permission tiers.

## 3. Employee Kiosk

**Check-in / check-out** (`/`)
- Splash screen with live clock and a "Good Morning/Afternoon/Evening" greeting
- Employee selects their name from a list, enters their 4-digit PIN, and taps Check In or Check Out
- Each tap is logged with a timestamp (Asia/Riyadh timezone) and a status message
- Sound + banner reminders fire automatically at 1:30 PM and 7:00 PM to prompt checkout

**Current limitation (by design, documented in code):** the kiosk logs one
check-in and one check-out per day. The backend supports four session slots
(morning / afternoon-out / afternoon-in / evening) for full break tracking,
but nothing currently calls the middle two — so a split shift's lunch break
is *assumed* from the employee's schedule, not measured. See
`apps/api/src/lib/payroll.ts` if this needs to change.

**Leave request** (`/leave-request`)
- Employee selects their name, enters their kiosk PIN (re-verified server-side), leave type, date range, and an optional reason
- Submits directly to the admin queue as `pending` — no admin login needed to file a request

Leave types: Annual, Sick, Emergency, Unpaid, Other.

## 4. Admin Dashboard (`/admin`)

### Today
Live view of the current day: present/absent/on-time/late counts, and a
per-employee row showing first check-in, last check-out, and a status badge
(Absent / On time / Late \<n\>m), compared against each employee's expected
start time.

### Rankings
Ranks employees over a selected date range by a blended score:

**Score = Punctuality 40% + Attendance 30% + Reliability 30%**

- **Punctuality** — based on average minutes late relative to expected start time
- **Attendance** — days present ÷ days in the selected period
- **Reliability** — inverse of anomaly rate (see Summary below)

Top 3 get a podium display (🥇🥈🥉); every employee gets a letter grade and a
score breakdown with visual score bars.

### Attendance Records (Summary)
One row per employee per day: first check-in, last check-out, total hours,
check-in/check-out counts, and **anomaly detection** — flags days with a
missing check-out, a missing check-in, or a check-in/check-out count
mismatch. Filterable by employee and date range.

**PDF export** generates a branded report (cover page with company name and
report period, an executive-summary metrics table, then the detailed
tables) for record-keeping or sharing outside the system.

### Employees
Add, edit, deactivate/reactivate employees. Per employee:
- Name, 4-digit PIN, role (see Roles below)
- Active/inactive (deactivation is soft — history is preserved)
- Optional custom schedule (morning/afternoon start & end times) that
  overrides the office default
- Monthly salary (SAR) — required for payroll to produce a non-zero figure

### Leave Requests
Review pending requests, approve or reject them. Approved leave feeds
directly into payroll (see below) for the month it falls in.

### Payroll
Pick a year and month, run payroll for all active employees at once. Per
employee: worked hours, overtime hours & pay, paid/unpaid leave day counts,
leave deduction, and final salary — plus workspace-wide totals (total
payout, total OT cost). Flags any employee with no monthly salary set.

### Settings
- **General** — company name, late-arrival threshold
- **Hours** — default office morning/afternoon start & end times, weekly off day (used by payroll to apply full-day overtime)
- **Roles** — add/rename/remove employee role labels (seeded with Manager, Purchase, Shop Handler, Office Manager, Sales, Accounts, Other)
- **Security** — change the admin password

## 5. Payroll Calculation

Implemented in `apps/api/src/lib/payroll.ts` as pure, auditable functions.

- **Daily rate** = monthly salary ÷ days in that calendar month (so it
  self-adjusts for 28/29/30/31-day months)
- **Hourly rate** = daily rate ÷ 8
- **Worked time** = (checkout − checkin) minus the employee's scheduled
  break (afternoon start − morning end), assuming the break was taken as
  scheduled
- **Overtime** — exact minutes, no rounding:
  - Normal day: time before the shift's morning start, or after its
    afternoon end
  - Weekly off day (e.g. Friday, configurable): the *entire* worked span
    counts as overtime
- **Leave**:
  - Sick and Annual leave are **fully paid** (no deduction)
  - Unpaid, Emergency, and Other leave deduct one day's rate per day
  - Only `approved` leave requests are counted, clipped to the days that
    actually fall within the payroll month
- **Final salary** = monthly salary − leave deduction + overtime pay

Per-employee schedule overrides (from the Employees tab) are used in place
of office defaults when calculating that employee's hours and overtime.

## 6. Security Model

- Employee PINs are 4 digits, checked server-side against the Employees sheet (or local seed data)
- Admin password is either a bcrypt/scrypt-style hash stored in the Settings sheet (set via Settings → Security) or falls back to `admin123` / the `ADMIN_PASSWORD` environment variable when no custom hash is set
- Google Sheets access uses a **service account** (a machine identity scoped only to the one shared Sheet), not an OAuth login flow — portable across hosting platforms and doesn't depend on any single platform's connector ecosystem
- The browser never talks to Google Sheets directly — every read/write goes through the API server

## 7. Data & Deployment

- **Datastore**: Google Sheets, four tabs (`Employees`, `Settings`,
  `LeaveRequests`, `Roles`) auto-created and seeded on first use, plus an
  attendance log sheet
- **Local fallback**: without `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_PRIVATE_KEY`, and `GOOGLE_SHEET_ID` set, employee list and office
  settings serve from built-in defaults so the kiosk still works
  end-to-end (nothing persists in this mode)
- **Deployment**: Vercel — the frontend builds to static assets, the
  Express API runs as a single serverless function (see
  [vercel.json](./vercel.json))

import { ensureSheet, readSheet, appendSheetRow, updateSheetRow } from "./googleSheets";

export interface Role {
  value: string;
  label: string;
}

const SHEET_NAME = "Roles";
const HEADERS = ["Value", "Label"];

const SEED_ROLES: Role[] = [
  { value: "manager", label: "Manager" },
  { value: "purchase", label: "Purchase" },
  { value: "shop_handler", label: "Shop Handler" },
  { value: "office_manager", label: "Office Manager" },
  { value: "sales", label: "Sales" },
  { value: "accounts", label: "Accounts" },
  { value: "other", label: "Other" },
];

let cached: { data: Role[]; ts: number } | null = null;
const CACHE_MS = 30 * 1000;

function rowToRole(r: string[]): Role | null {
  if (!r[0]) return null;
  return { value: r[0].trim(), label: (r[1] ?? r[0]).trim() };
}

function normalizeValue(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "role";
}

async function loadAll(sheetId: string): Promise<Role[]> {
  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, HEADERS.length);

  if (rows.length === 0) {
    for (const r of SEED_ROLES) {
      await appendSheetRow(sheetId, SHEET_NAME, HEADERS.length, [r.value, r.label]);
    }
    return [...SEED_ROLES];
  }

  return rows.map(rowToRole).filter((r): r is Role => r !== null);
}

export async function getAllRoles(sheetId: string): Promise<Role[]> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;
  const data = await loadAll(sheetId);
  cached = { data, ts: Date.now() };
  return data;
}

export function clearRolesCache(): void {
  cached = null;
}

export async function addRole(sheetId: string, role: Role): Promise<Role> {
  const all = await loadAll(sheetId);
  const value = normalizeValue(role.value);
  if (all.some((r) => r.value === value)) {
    throw new Error(`Role "${value}" already exists`);
  }
  const newRole: Role = { value, label: role.label.trim() || value };
  await appendSheetRow(sheetId, SHEET_NAME, HEADERS.length, [newRole.value, newRole.label]);
  clearRolesCache();
  return newRole;
}

export async function updateRole(
  sheetId: string,
  oldValue: string,
  updates: Partial<Role>,
): Promise<Role> {
  const all = await loadAll(sheetId);
  const idx = all.findIndex((r) => r.value === oldValue);
  if (idx < 0) throw new Error(`Role "${oldValue}" not found`);
  const updated: Role = {
    value: updates.value ? normalizeValue(updates.value) : all[idx].value,
    label: updates.label?.trim() || all[idx].label,
  };
  await updateSheetRow(sheetId, SHEET_NAME, idx + 2, HEADERS.length, [updated.value, updated.label]);
  clearRolesCache();
  return updated;
}

export async function deleteRole(sheetId: string, value: string): Promise<void> {
  const all = await loadAll(sheetId);
  const idx = all.findIndex((r) => r.value === value);
  if (idx < 0) throw new Error(`Role "${value}" not found`);
  // Remove by overwriting with empty row marker — keep last row's data shifted up
  // Simpler: leave row but we need to actually clear. Use updateSheetRow with empty values then filter.
  // For Google Sheets simplicity: write blank values; rowToRole filters them out.
  await updateSheetRow(sheetId, SHEET_NAME, idx + 2, HEADERS.length, ["", ""]);
  clearRolesCache();
}

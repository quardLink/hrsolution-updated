import { Router, type IRouter } from "express";
import { signup, login, getAdminUser, changeAdminPassword } from "../lib/auth";
import { getOrgById, updateOrgBranding } from "../lib/orgs";
import { issueSessionToken, setSessionCookie, clearSessionCookie, requireOrgSession } from "../lib/session";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { name, email, password, orgName, logoDataUrl } = req.body ?? {};
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof orgName !== "string"
  ) {
    res.status(400).json({ error: "name, email, password and orgName are required" });
    return;
  }

  try {
    const { org, adminUser } = await signup({
      name,
      email,
      password,
      orgName,
      logoDataUrl: typeof logoDataUrl === "string" ? logoDataUrl : null,
    });
    setSessionCookie(res, issueSessionToken(adminUser.id, org.id));
    res.json({ org, adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Signup failed" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const adminUser = await login(email, password);
  if (!adminUser) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  setSessionCookie(res, issueSessionToken(adminUser.id, adminUser.orgId));
  res.json({ adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name } });
});

router.post("/auth/logout", (_req, res): void => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/auth/me", requireOrgSession, async (req, res): Promise<void> => {
  const [adminUser, org] = await Promise.all([
    getAdminUser(req.adminUserId!),
    getOrgById(req.orgId!),
  ]);
  if (!adminUser || !org) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({
    adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name },
    org,
  });
});

router.patch("/auth/org", requireOrgSession, async (req, res): Promise<void> => {
  const { name, logoDataUrl } = req.body ?? {};
  const updates: { name?: string; logoDataUrl?: string | null } = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (logoDataUrl !== undefined) updates.logoDataUrl = typeof logoDataUrl === "string" ? logoDataUrl : null;

  try {
    const org = await updateOrgBranding(req.orgId!, updates);
    res.json({ org });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update firm" });
  }
});

router.patch("/auth/password", requireOrgSession, async (req, res): Promise<void> => {
  const { oldPassword, newPassword } = req.body ?? {};
  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    res.status(400).json({ error: "oldPassword and newPassword are required" });
    return;
  }
  try {
    await changeAdminPassword(req.adminUserId!, oldPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to change password" });
  }
});

export default router;

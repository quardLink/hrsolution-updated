import { Router, type IRouter } from "express";
import { requireOrgSession } from "../lib/session";
import { generatePairingCode, redeemPairingCode, listDevices, revokeDevice } from "../lib/devices";

const router: IRouter = Router();

// Admin-side: generate a short-lived code to read out to whoever is at
// the kiosk. The device token itself is never shown here.
router.post("/admin/devices/pairing-code", requireOrgSession, async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : "Kiosk";
  const { code, expiresAt } = await generatePairingCode(req.orgId!, name);
  res.json({ code, expiresAt });
});

router.get("/admin/devices", requireOrgSession, async (req, res): Promise<void> => {
  const devices = await listDevices(req.orgId!);
  res.json({ devices: devices.map((d) => ({ id: d.id, name: d.name, pairedAt: d.pairedAt, lastSeenAt: d.lastSeenAt })) });
});

router.delete("/admin/devices/:id", requireOrgSession, async (req, res): Promise<void> => {
  await revokeDevice(req.orgId!, String(req.params.id));
  res.json({ success: true });
});

// Kiosk-side: exchanges a pairing code (typed in by whoever is standing at
// the machine) for a long-lived device token, stored only in that browser's
// localStorage from here on.
router.post("/devices/pair", async (req, res): Promise<void> => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Enter the 6-digit code shown in Settings" });
    return;
  }

  const result = await redeemPairingCode(code);
  if (!result) {
    res.status(400).json({ error: "That code is invalid or has expired" });
    return;
  }
  res.json({ token: result.token });
});

export default router;

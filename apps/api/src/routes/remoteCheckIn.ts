import { Router, type IRouter } from "express";
import { requireEmployeeDeviceToken } from "../lib/devices";
import { getAllEmployees } from "../lib/employees";
import { getOfficeSettings } from "../lib/settings";
import { getOrgById } from "../lib/orgs";
import { submitRemoteCheckIn, determineNextAction } from "../lib/remoteCheckIn";

const router: IRouter = Router();

// Every route below requires an employee-scoped device token (a paired
// personal phone, not a shared kiosk) — see requireEmployeeDeviceToken.
// The employee is always the one that token was paired to; nothing here
// ever trusts a client-supplied employee id.

router.get("/remote/status", requireEmployeeDeviceToken, async (req, res): Promise<void> => {
  try {
    const orgId = req.orgId!;
    const employeeCode = req.pairedEmployeeCode!;
    const [employees, settings, org] = await Promise.all([
      getAllEmployees(orgId),
      getOfficeSettings(orgId),
      getOrgById(orgId),
    ]);
    const employee = employees.find((e) => e.id === employeeCode);
    if (!employee || !employee.active) {
      res.status(404).json({ error: "This employee is no longer active" });
      return;
    }

    const nextAction = await determineNextAction(orgId, employeeCode, org?.timezone ?? "Asia/Riyadh");
    res.json({
      employeeName: employee.name,
      faceEnrolled: employee.faceEnrolled,
      remoteCheckInMode: settings.remoteCheckInMode,
      nextAction,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch remote check-in status");
    res.status(500).json({ error: "Failed to load status" });
  }
});

router.post("/remote/checkin", requireEmployeeDeviceToken, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const pin = typeof body.pin === "string" ? body.pin : "";
  const faceDescriptor = body.faceDescriptor;
  const photoDataUrl = typeof body.photoDataUrl === "string" ? body.photoDataUrl : null;
  const latitude = typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null;
  const longitude = typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null;

  if (!pin) {
    res.status(400).json({ error: "Passkey is required" });
    return;
  }
  // A live capture is mandatory — no gallery uploads. We can't verify the
  // photo came from the camera server-side, but requiring it non-empty at
  // least keeps a client that skips the capture step from submitting.
  if (!photoDataUrl || !photoDataUrl.startsWith("data:image/")) {
    res.status(400).json({ error: "A live photo capture is required" });
    return;
  }

  try {
    const result = await submitRemoteCheckIn({
      orgId: req.orgId!,
      deviceId: req.deviceId!,
      employeeCode: req.pairedEmployeeCode!,
      pin,
      faceDescriptor,
      photoDataUrl,
      latitude,
      longitude,
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ status: result.status, action: result.action });
  } catch (err) {
    req.log.error({ err }, "Failed to submit remote check-in");
    res.status(500).json({ error: "Failed to submit request" });
  }
});

export default router;

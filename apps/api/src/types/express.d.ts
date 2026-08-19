// Augments Express's Request with the org context attached by
// requireOrgSession (admin cookie session) or requireDeviceToken (paired
// kiosk). Routes downstream of either middleware can read req.orgId
// without re-deriving it.
export {};

declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      adminUserId?: string;
      deviceId?: string;
    }
  }
}

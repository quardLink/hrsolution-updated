import { Router, type IRouter } from "express";
import healthRouter from "./health";
import attendanceRouter from "./attendance";
import adminRouter from "./admin";
import leaveRouter from "./leave";

const router: IRouter = Router();

router.use(healthRouter);
router.use(attendanceRouter);
router.use(leaveRouter);
router.use(adminRouter);

export default router;

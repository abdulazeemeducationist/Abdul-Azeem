import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coursesRouter from "./courses";
import chaptersRouter from "./chapters";
import topicsRouter from "./topics";
import questionsRouter from "./questions";
import progressRouter from "./progress";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/subjects", chaptersRouter);
router.use("/chapters", topicsRouter);
router.use("/topics", questionsRouter);
router.use("/progress", progressRouter);
router.use("/admin", adminRouter);

export default router;

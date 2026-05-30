import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coursesRouter from "./courses";
import levelsRouter from "./levels";
import chaptersRouter from "./chapters";
import topicsRouter from "./topics";
import questionsRouter from "./questions";
import progressRouter from "./progress";
import adminRouter from "./admin";
import customQuestionsRouter from "./customQuestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/levels", levelsRouter);
router.use("/subjects", chaptersRouter);
router.use("/chapters", topicsRouter);
router.use("/topics", questionsRouter);
router.use("/progress", progressRouter);
router.use("/admin", adminRouter);
router.use("/custom-questions", customQuestionsRouter);

export default router;

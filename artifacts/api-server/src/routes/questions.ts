import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:topicId/questions", async (req, res) => {
  try {
    const topicId = parseInt(req.params.topicId);
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.topicId, topicId));
    const result = questions.map(q => ({
      ...q,
      correctAnswers: JSON.parse(q.correctAnswers),
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get questions" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:chapterId/topics", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const topics = await db.select().from(topicsTable).where(eq(topicsTable.chapterId, chapterId));
    const result = await Promise.all(topics.map(async (t) => {
      const [{ count: qc }] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.topicId, t.id));
      return { ...t, questionCount: Number(qc) };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get topics" });
  }
});

export default router;

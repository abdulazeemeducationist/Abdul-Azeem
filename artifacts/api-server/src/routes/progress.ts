import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProgressTable, topicsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      res.status(400).json({ error: "Bad Request", message: "userId is required" });
      return;
    }
    const progress = await db
      .select({
        id: userProgressTable.id,
        userId: userProgressTable.userId,
        topicId: userProgressTable.topicId,
        topicName: topicsTable.name,
        totalQuestions: userProgressTable.totalQuestions,
        correctAnswers: userProgressTable.correctAnswers,
        scorePercentage: userProgressTable.scorePercentage,
        completed: userProgressTable.completed,
        lastAttemptAt: userProgressTable.lastAttemptAt,
      })
      .from(userProgressTable)
      .innerJoin(topicsTable, eq(topicsTable.id, userProgressTable.topicId))
      .where(eq(userProgressTable.userId, userId));
    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get progress" });
  }
});

router.post("/save", async (req, res) => {
  try {
    const { userId, topicId, totalQuestions, correctAnswers, scorePercentage, completed } = req.body;
    const existing = await db.select().from(userProgressTable)
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.topicId, topicId)))
      .limit(1);

    let result;
    if (existing.length > 0) {
      const [updated] = await db.update(userProgressTable)
        .set({ totalQuestions, correctAnswers, scorePercentage: String(scorePercentage), completed, lastAttemptAt: new Date() })
        .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.topicId, topicId)))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db.insert(userProgressTable)
        .values({ userId, topicId, totalQuestions, correctAnswers, scorePercentage: String(scorePercentage), completed })
        .returning();
      result = inserted;
    }
    res.json({ ...result, topicName: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to save progress" });
  }
});

export default router;

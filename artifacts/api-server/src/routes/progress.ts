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
        lastQuestionIndex: userProgressTable.lastQuestionIndex,
        savedAnswers: userProgressTable.savedAnswers,
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

router.get("/quiz-state", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const topicId = parseInt(req.query.topicId as string);
    if (!userId || !topicId) {
      res.status(400).json({ error: "Bad Request", message: "userId and topicId are required" });
      return;
    }
    const [existing] = await db.select().from(userProgressTable)
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.topicId, topicId)))
      .limit(1);
    if (!existing || existing.completed) {
      res.json(null);
      return;
    }
    res.json({
      lastQuestionIndex: existing.lastQuestionIndex,
      savedAnswers: JSON.parse(existing.savedAnswers || "[]"),
      correctAnswers: existing.correctAnswers,
      totalQuestions: existing.totalQuestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get quiz state" });
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

router.post("/save-quiz-state", async (req, res) => {
  try {
    const { userId, topicId, lastQuestionIndex, savedAnswers, correctAnswers, totalQuestions } = req.body;
    const scorePercentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0";
    const existing = await db.select().from(userProgressTable)
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.topicId, topicId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(userProgressTable)
        .set({
          lastQuestionIndex,
          savedAnswers: JSON.stringify(savedAnswers),
          correctAnswers,
          totalQuestions,
          scorePercentage,
          completed: false,
          lastAttemptAt: new Date(),
        })
        .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.topicId, topicId)));
    } else {
      await db.insert(userProgressTable)
        .values({
          userId, topicId, lastQuestionIndex,
          savedAnswers: JSON.stringify(savedAnswers),
          correctAnswers, totalQuestions,
          scorePercentage,
          completed: false,
        });
    }
    res.json({ message: "Quiz state saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to save quiz state" });
  }
});

export default router;

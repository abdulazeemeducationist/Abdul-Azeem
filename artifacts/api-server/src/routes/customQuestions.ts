import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { inArray, eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /count — returns available question count without fetching all data
router.get("/count", async (req, res) => {
  try {
    const chapterIdsParam = req.query.chapterIds as string;
    const difficultyParam = req.query.difficulty as string | undefined;

    if (!chapterIdsParam) {
      res.status(400).json({ error: "chapterIds is required" });
      return;
    }

    const chapterIds = chapterIdsParam
      .split(",")
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (chapterIds.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const topics = await db
      .select({ id: topicsTable.id })
      .from(topicsTable)
      .where(inArray(topicsTable.chapterId, chapterIds));

    const topicIds = topics.map(t => t.id);
    if (topicIds.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const hasDifficultyFilter = difficultyParam && difficultyParam !== "mixed";

    const whereConditions = hasDifficultyFilter
      ? and(inArray(questionsTable.topicId, topicIds), eq(questionsTable.difficulty, difficultyParam!))
      : inArray(questionsTable.topicId, topicIds);

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(questionsTable)
      .where(whereConditions);

    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to count questions" });
  }
});

// GET / — returns randomised questions with optional difficulty + limit filters
router.get("/", async (req, res) => {
  try {
    const chapterIdsParam = req.query.chapterIds as string;
    const limitParam = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const difficultyParam = req.query.difficulty as string | undefined;

    if (!chapterIdsParam) {
      res.status(400).json({ error: "chapterIds is required" });
      return;
    }

    const chapterIds = chapterIdsParam
      .split(",")
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (chapterIds.length === 0) {
      res.json([]);
      return;
    }

    const topics = await db
      .select({ id: topicsTable.id })
      .from(topicsTable)
      .where(inArray(topicsTable.chapterId, chapterIds));

    const topicIds = topics.map(t => t.id);
    if (topicIds.length === 0) {
      res.json([]);
      return;
    }

    const hasDifficultyFilter = difficultyParam && difficultyParam !== "mixed";

    const whereConditions = hasDifficultyFilter
      ? and(inArray(questionsTable.topicId, topicIds), eq(questionsTable.difficulty, difficultyParam!))
      : inArray(questionsTable.topicId, topicIds);

    const questions = await db
      .select({
        id: questionsTable.id,
        topicId: questionsTable.topicId,
        topicName: topicsTable.name,
        questionText: questionsTable.questionText,
        questionHtml: questionsTable.questionHtml,
        questionImageUrl: questionsTable.questionImageUrl,
        optionA: questionsTable.optionA,
        optionB: questionsTable.optionB,
        optionC: questionsTable.optionC,
        optionD: questionsTable.optionD,
        correctAnswers: questionsTable.correctAnswers,
        explanation: questionsTable.explanation,
        questionType: questionsTable.questionType,
        difficulty: questionsTable.difficulty,
        marks: questionsTable.marks,
      })
      .from(questionsTable)
      .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
      .where(whereConditions)
      .orderBy(sql`RANDOM()`);

    const parsed = questions.map(q => ({
      ...q,
      correctAnswers:
        typeof q.correctAnswers === "string"
          ? JSON.parse(q.correctAnswers)
          : q.correctAnswers,
    }));

    res.json(limitParam ? parsed.slice(0, limitParam) : parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get custom questions" });
  }
});

export default router;

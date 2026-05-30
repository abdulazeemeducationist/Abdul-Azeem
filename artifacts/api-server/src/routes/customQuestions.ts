import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable } from "@workspace/db";
import { inArray, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const chapterIdsParam = req.query.chapterIds as string;
    const limitParam = req.query.limit ? parseInt(req.query.limit as string) : undefined;

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
      .where(inArray(questionsTable.topicId, topicIds))
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

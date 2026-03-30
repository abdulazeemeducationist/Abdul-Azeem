import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chaptersTable, topicsTable, questionsTable, chapterVideosTable, chapterNotesTable } from "@workspace/db";
import { eq, count, sql, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:subjectId/chapters", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.subjectId, subjectId));
    const result = await Promise.all(chapters.map(async (ch) => {
      const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(eq(topicsTable.chapterId, ch.id));
      const topicIds = topics.map(t => t.id);
      let questionCount = 0;
      if (topicIds.length > 0) {
        const [{ count: qc }] = await db.select({ count: count() }).from(questionsTable).where(
          sql`${questionsTable.topicId} = ANY(${sql`ARRAY[${sql.raw(topicIds.join(","))}]::int[]`})`
        );
        questionCount = Number(qc);
      }
      return { ...ch, topicCount: topics.length, questionCount };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get chapters" });
  }
});

router.get("/:chapterId/videos", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const videos = await db
      .select()
      .from(chapterVideosTable)
      .where(eq(chapterVideosTable.chapterId, chapterId))
      .orderBy(asc(chapterVideosTable.orderIndex));
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get videos" });
  }
});

router.get("/:chapterId/notes", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const notes = await db
      .select()
      .from(chapterNotesTable)
      .where(eq(chapterNotesTable.chapterId, chapterId))
      .orderBy(asc(chapterNotesTable.orderIndex));
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get notes" });
  }
});

export default router;

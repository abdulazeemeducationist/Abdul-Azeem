import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { topicsTable, questionsTable, chapterVideosTable, chapterNotesTable } from "@workspace/db";
import { eq, count, asc } from "drizzle-orm";

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

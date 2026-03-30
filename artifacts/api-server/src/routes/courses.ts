import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, subjectsTable, chaptersTable, topicsTable, questionsTable,
  levelsTable, userSubjectPurchasesTable
} from "@workspace/db";
import { eq, count, sql, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.isActive, true)).orderBy(coursesTable.orderNumber);
    const result = await Promise.all(courses.map(async (c) => {
      const subjects = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.courseId, c.id));
      const subjectIds = subjects.map(s => s.id);
      let questionCount = 0;
      if (subjectIds.length > 0) {
        const chapters = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(
          sql`${chaptersTable.subjectId} = ANY(${sql`ARRAY[${sql.raw(subjectIds.join(","))}]::int[]`})`
        );
        const chapterIds = chapters.map(ch => ch.id);
        if (chapterIds.length > 0) {
          const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(
            sql`${topicsTable.chapterId} = ANY(${sql`ARRAY[${sql.raw(chapterIds.join(","))}]::int[]`})`
          );
          const topicIds = topics.map(t => t.id);
          if (topicIds.length > 0) {
            const [{ count: qCount }] = await db.select({ count: count() }).from(questionsTable).where(
              sql`${questionsTable.topicId} = ANY(${sql`ARRAY[${sql.raw(topicIds.join(","))}]::int[]`})`
            );
            questionCount = Number(qCount);
          }
        }
      }
      return { ...c, subjectCount: subjectIds.length, questionCount };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get courses" });
  }
});

router.get("/:courseId/levels", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const levels = await db.select().from(levelsTable)
      .where(eq(levelsTable.courseId, courseId))
      .orderBy(levelsTable.orderNumber);
    const result = await Promise.all(levels.map(async (lv) => {
      const subjects = await db.select({ id: subjectsTable.id }).from(subjectsTable)
        .where(and(eq(subjectsTable.levelId, lv.id), eq(subjectsTable.isActive, true)));
      return { ...lv, subjectCount: subjects.length };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get levels" });
  }
});

router.get("/:courseId", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
    if (!course) { res.status(404).json({ error: "Not Found", message: "Course not found" }); return; }
    res.json({ ...course, subjectCount: 0, questionCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get course" });
  }
});

router.get("/:courseId/subjects", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const isAdmin = req.query.admin === "true";

    let purchasedIds = new Set<number>();
    if (userId) {
      const purchases = await db.select({ subjectId: userSubjectPurchasesTable.subjectId })
        .from(userSubjectPurchasesTable)
        .where(eq(userSubjectPurchasesTable.userId, userId));
      purchasedIds = new Set(purchases.map(p => p.subjectId));
    }

    const whereClause = isAdmin
      ? eq(subjectsTable.courseId, courseId)
      : and(eq(subjectsTable.courseId, courseId), eq(subjectsTable.isActive, true));

    const subjects = await db.select().from(subjectsTable).where(whereClause);
    const result = await Promise.all(subjects.map(async (s) => {
      const chapters = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(eq(chaptersTable.subjectId, s.id));
      const chapterIds = chapters.map(c => c.id);
      let questionCount = 0;
      if (chapterIds.length > 0) {
        const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(
          sql`${topicsTable.chapterId} = ANY(${sql`ARRAY[${sql.raw(chapterIds.join(","))}]::int[]`})`
        );
        const topicIds = topics.map(t => t.id);
        if (topicIds.length > 0) {
          const [{ count: qc }] = await db.select({ count: count() }).from(questionsTable).where(
            sql`${questionsTable.topicId} = ANY(${sql`ARRAY[${sql.raw(topicIds.join(","))}]::int[]`})`
          );
          questionCount = Number(qc);
        }
      }
      return {
        ...s,
        chapterCount: chapterIds.length,
        questionCount,
        purchased: userId ? purchasedIds.has(s.id) : true,
      };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get subjects" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, subjectsTable, chaptersTable, topicsTable, questionsTable,
  usersTable, userProgressTable, userSubjectPurchasesTable, levelsTable,
  chapterVideosTable, chapterNotesTable, courseAccessLogsTable
} from "@workspace/db";
import { eq, count, avg, and, inArray, max, asc, or, ilike } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(p: string) { return crypto.createHash("sha256").update(p + "mcq-salt-2024").digest("hex"); }

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [{ count: totalUsers }] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student"));
    const [{ count: totalStaff }] = await db.select({ count: count() }).from(usersTable).where(or(eq(usersTable.role, "teacher"), eq(usersTable.role, "teacher_assistant")));
    const [{ count: totalCourses }] = await db.select({ count: count() }).from(coursesTable);
    const [{ count: totalSubjects }] = await db.select({ count: count() }).from(subjectsTable);
    const [{ count: totalChapters }] = await db.select({ count: count() }).from(chaptersTable);
    const [{ count: totalTopics }] = await db.select({ count: count() }).from(topicsTable);
    const [{ count: totalQuestions }] = await db.select({ count: count() }).from(questionsTable);
    const [{ count: totalAttempts }] = await db.select({ count: count() }).from(userProgressTable);
    const [{ avg: avgScore }] = await db.select({ avg: avg(userProgressTable.scorePercentage) }).from(userProgressTable);
    res.json({
      totalUsers: Number(totalUsers),
      totalStaff: Number(totalStaff),
      totalCourses: Number(totalCourses),
      totalSubjects: Number(totalSubjects),
      totalChapters: Number(totalChapters),
      totalTopics: Number(totalTopics),
      totalQuestions: Number(totalQuestions),
      totalAttempts: Number(totalAttempts),
      averageScore: Number(avgScore) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get stats" });
  }
});

function computeAccessStatus(record: { isBlocked: boolean; expiresAt: Date | null }): 'active' | 'expired' | 'blocked' {
  if (record.isBlocked) return 'blocked';
  if (record.expiresAt && record.expiresAt < new Date()) return 'expired';
  return 'active';
}

router.get("/students", async (_req, res) => {
  try {
    const students = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, isBlocked: usersTable.isBlocked, whatsappNumber: usersTable.whatsappNumber, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.role, "student"));

    const result = await Promise.all(students.map(async (s) => {
      const purchases = await db
        .select({
          id: userSubjectPurchasesTable.subjectId,
          name: subjectsTable.name,
          code: subjectsTable.code,
          assignedAt: userSubjectPurchasesTable.assignedAt,
          expiresAt: userSubjectPurchasesTable.expiresAt,
          isBlocked: userSubjectPurchasesTable.isBlocked,
          blockedAt: userSubjectPurchasesTable.blockedAt,
        })
        .from(userSubjectPurchasesTable)
        .innerJoin(subjectsTable, eq(userSubjectPurchasesTable.subjectId, subjectsTable.id))
        .where(eq(userSubjectPurchasesTable.userId, s.id));

      const assignedSubjects = purchases.map(p => ({
        ...p,
        accessStatus: computeAccessStatus(p),
      }));

      return { ...s, assignedSubjects };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get students" });
  }
});

router.post("/students/:userId/subjects", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subjectId, assignedBy, expiresAt } = req.body;
    if (!subjectId) { res.status(400).json({ error: "subjectId is required" }); return; }

    const existing = await db.select().from(userSubjectPurchasesTable)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Already enrolled", message: "Student already has access to this paper" });
      return;
    }

    const [purchase] = await db.insert(userSubjectPurchasesTable)
      .values({ userId, subjectId, assignedBy: assignedBy ?? null, expiresAt: expiresAt ? new Date(expiresAt) : null })
      .returning();

    await db.insert(courseAccessLogsTable).values({
      userId, subjectId, action: 'assigned',
      performedBy: assignedBy ?? null,
      notes: expiresAt ? `Expires: ${expiresAt}` : null,
    });

    res.status(201).json(purchase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to assign paper" });
  }
});

router.patch("/students/:userId/subjects/:subjectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const subjectId = parseInt(req.params.subjectId);
    const { action, expiresAt, performedBy } = req.body;
    if (!action) { res.status(400).json({ error: "action is required" }); return; }

    const existing = await db.select().from(userSubjectPurchasesTable)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)))
      .limit(1);
    if (!existing.length) { res.status(404).json({ error: "Not found", message: "Access record not found" }); return; }

    const now = new Date();
    let updateValues: Record<string, unknown> = {};
    let logNote: string | null = null;

    if (action === 'block') {
      updateValues = { isBlocked: true, blockedAt: now, blockedBy: performedBy ?? null };
      logNote = 'Manual block';
    } else if (action === 'unblock') {
      updateValues = { isBlocked: false, blockedAt: null, blockedBy: null };
      logNote = 'Access unblocked';
    } else if (action === 'set_expiry') {
      updateValues = { expiresAt: expiresAt ? new Date(expiresAt) : null };
      logNote = expiresAt ? `Expiry set to: ${expiresAt}` : 'Expiry removed';
    } else {
      res.status(400).json({ error: "Invalid action" }); return;
    }

    await db.update(userSubjectPurchasesTable)
      .set(updateValues)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)));

    await db.insert(courseAccessLogsTable).values({
      userId, subjectId, action, performedBy: performedBy ?? null, notes: logNote,
    });

    res.json({ message: "Access updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update access" });
  }
});

router.delete("/students/:userId/subjects/:subjectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const subjectId = parseInt(req.params.subjectId);

    await db.insert(courseAccessLogsTable).values({
      userId, subjectId, action: 'revoked', performedBy: null, notes: null,
    }).catch(() => {});

    await db.delete(userSubjectPurchasesTable)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)));
    res.json({ message: "Paper access revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to revoke paper" });
  }
});

router.get("/students/:userId/access-logs", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const logs = await db
      .select({
        id: courseAccessLogsTable.id,
        userId: courseAccessLogsTable.userId,
        subjectId: courseAccessLogsTable.subjectId,
        subjectName: subjectsTable.name,
        subjectCode: subjectsTable.code,
        action: courseAccessLogsTable.action,
        performedBy: courseAccessLogsTable.performedBy,
        performedByName: usersTable.name,
        performedAt: courseAccessLogsTable.performedAt,
        notes: courseAccessLogsTable.notes,
      })
      .from(courseAccessLogsTable)
      .innerJoin(subjectsTable, eq(courseAccessLogsTable.subjectId, subjectsTable.id))
      .leftJoin(usersTable, eq(courseAccessLogsTable.performedBy, usersTable.id))
      .where(eq(courseAccessLogsTable.userId, userId))
      .orderBy(asc(courseAccessLogsTable.performedAt));
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get access logs" });
  }
});

router.get("/subjects", async (_req, res) => {
  try {
    const subjects = await db
      .select({
        id: subjectsTable.id,
        name: subjectsTable.name,
        code: subjectsTable.code,
        courseId: subjectsTable.courseId,
        levelId: subjectsTable.levelId,
        isActive: subjectsTable.isActive,
        courseName: coursesTable.name,
        courseCode: coursesTable.code,
      })
      .from(subjectsTable)
      .innerJoin(coursesTable, eq(subjectsTable.courseId, coursesTable.id));
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get subjects" });
  }
});

router.get("/courses", async (_req, res) => {
  try {
    const courses = await db.select().from(coursesTable).orderBy(coursesTable.orderNumber);
    const result = await Promise.all(courses.map(async (c) => {
      const [{ count: subjectCount }] = await db.select({ count: count() }).from(subjectsTable).where(eq(subjectsTable.courseId, c.id));
      return { ...c, subjectCount: Number(subjectCount) };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get courses" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const { name, code, description, icon, color, logo } = req.body;
    if (!name || !code) { res.status(400).json({ error: "name and code are required" }); return; }
    const [{ maxOrder }] = await db.select({ maxOrder: max(coursesTable.orderNumber) }).from(coursesTable);
    const nextOrder = (maxOrder ?? 0) + 1;
    const [course] = await db.insert(coursesTable).values({ name, code, description, icon, color, logo, orderNumber: nextOrder }).returning();
    res.status(201).json({ ...course, subjectCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create course" });
  }
});

router.patch("/courses/:courseId/order", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);
    const { direction } = req.body; // "up" | "down"
    const allCourses = await db.select({ id: coursesTable.id, orderNumber: coursesTable.orderNumber })
      .from(coursesTable).orderBy(coursesTable.orderNumber);
    const idx = allCourses.findIndex(c => c.id === id);
    if (idx === -1) { res.status(404).json({ error: "Course not found" }); return; }
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allCourses.length) { res.json({ message: "Already at boundary" }); return; }
    const curr = allCourses[idx];
    const swap = allCourses[swapIdx];
    await db.update(coursesTable).set({ orderNumber: swap.orderNumber }).where(eq(coursesTable.id, curr.id));
    await db.update(coursesTable).set({ orderNumber: curr.orderNumber }).where(eq(coursesTable.id, swap.id));
    res.json({ message: "Order updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update order" });
  }
});

router.put("/courses/:courseId", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);
    const { name, code, description, logo } = req.body;
    const [course] = await db.update(coursesTable).set({ name, code, description, logo }).where(eq(coursesTable.id, id)).returning();
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update course" });
  }
});

router.patch("/courses/:courseId/active", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);
    const { isActive } = req.body;
    const [course] = await db.update(coursesTable).set({ isActive }).where(eq(coursesTable.id, id)).returning();
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update course status" });
  }
});

router.patch("/subjects/:subjectId/active", async (req, res) => {
  try {
    const id = parseInt(req.params.subjectId);
    const { isActive } = req.body;
    const [subject] = await db.update(subjectsTable).set({ isActive }).where(eq(subjectsTable.id, id)).returning();
    if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update subject status" });
  }
});

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);

    // Manual cascade: subjects → chapters → topics → questions/progress
    const subjects = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.courseId, id));
    const subjectIds = subjects.map(s => s.id);

    if (subjectIds.length > 0) {
      const chapters = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(inArray(chaptersTable.subjectId, subjectIds));
      const chapterIds = chapters.map(c => c.id);

      if (chapterIds.length > 0) {
        const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(inArray(topicsTable.chapterId, chapterIds));
        const topicIds = topics.map(t => t.id);

        if (topicIds.length > 0) {
          await db.delete(questionsTable).where(inArray(questionsTable.topicId, topicIds));
          await db.delete(userProgressTable).where(inArray(userProgressTable.topicId, topicIds));
          await db.delete(topicsTable).where(inArray(topicsTable.id, topicIds));
        }
        await db.delete(chaptersTable).where(inArray(chaptersTable.id, chapterIds));
      }
      await db.delete(userSubjectPurchasesTable).where(inArray(userSubjectPurchasesTable.subjectId, subjectIds));
      await db.delete(subjectsTable).where(eq(subjectsTable.courseId, id));
    }

    await db.delete(coursesTable).where(eq(coursesTable.id, id));
    res.json({ message: "Program deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete course" });
  }
});

router.post("/subjects", async (req, res) => {
  try {
    const { courseId, levelId, name, code, description } = req.body;
    const [subject] = await db.insert(subjectsTable).values({ courseId, levelId: levelId ?? null, name, code, description }).returning();
    res.status(201).json({ ...subject, chapterCount: 0, questionCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create subject" });
  }
});

router.post("/chapters", async (req, res) => {
  try {
    const { subjectId, name, orderNumber } = req.body;
    const [chapter] = await db.insert(chaptersTable).values({ subjectId, name, orderNumber }).returning();
    res.status(201).json({ ...chapter, topicCount: 0, questionCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create chapter" });
  }
});

router.get("/chapters/:chapterId/topics", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const topics = await db
      .select({
        id: topicsTable.id,
        chapterId: topicsTable.chapterId,
        name: topicsTable.name,
        orderNumber: topicsTable.orderNumber,
        createdAt: topicsTable.createdAt,
        questionCount: count(questionsTable.id),
      })
      .from(topicsTable)
      .leftJoin(questionsTable, eq(questionsTable.topicId, topicsTable.id))
      .where(eq(topicsTable.chapterId, chapterId))
      .groupBy(topicsTable.id)
      .orderBy(asc(topicsTable.orderNumber));
    res.json(topics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get topics" });
  }
});

router.get("/subjects/:subjectId/chapters", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const chapters = await db
      .select({
        id: chaptersTable.id,
        subjectId: chaptersTable.subjectId,
        name: chaptersTable.name,
        orderNumber: chaptersTable.orderNumber,
        isActive: chaptersTable.isActive,
        createdAt: chaptersTable.createdAt,
        topicCount: count(topicsTable.id),
      })
      .from(chaptersTable)
      .leftJoin(topicsTable, eq(topicsTable.chapterId, chaptersTable.id))
      .where(eq(chaptersTable.subjectId, subjectId))
      .groupBy(chaptersTable.id)
      .orderBy(asc(chaptersTable.orderNumber));
    res.json(chapters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get chapters" });
  }
});

router.put("/chapters/:chapterId", async (req, res) => {
  try {
    const id = parseInt(req.params.chapterId);
    const { name, orderNumber } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [chapter] = await db.update(chaptersTable).set({ name, orderNumber }).where(eq(chaptersTable.id, id)).returning();
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
    res.json(chapter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update chapter" });
  }
});

router.patch("/chapters/:chapterId/active", async (req, res) => {
  try {
    const id = parseInt(req.params.chapterId);
    const { isActive } = req.body;
    const [chapter] = await db.update(chaptersTable).set({ isActive }).where(eq(chaptersTable.id, id)).returning();
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
    res.json(chapter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to toggle chapter" });
  }
});

router.delete("/chapters/:chapterId", async (req, res) => {
  try {
    const id = parseInt(req.params.chapterId);
    const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(eq(topicsTable.chapterId, id));
    const topicIds = topics.map(t => t.id);
    if (topicIds.length > 0) {
      await db.delete(questionsTable).where(inArray(questionsTable.topicId, topicIds));
      await db.delete(topicsTable).where(inArray(topicsTable.id, topicIds));
    }
    await db.delete(chapterVideosTable).where(eq(chapterVideosTable.chapterId, id));
    await db.delete(chapterNotesTable).where(eq(chapterNotesTable.chapterId, id));
    await db.delete(chaptersTable).where(eq(chaptersTable.id, id));
    res.json({ message: "Chapter deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete chapter" });
  }
});

router.post("/topics", async (req, res) => {
  try {
    const { chapterId, name, orderNumber } = req.body;
    if (!chapterId || !name?.trim()) {
      res.status(400).json({ error: "Bad Request", message: "chapterId and name are required" }); return;
    }
    const [topic] = await db.insert(topicsTable).values({ chapterId, name: name.trim(), orderNumber }).returning();
    res.status(201).json({ ...topic, questionCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create topic" });
  }
});

router.put("/topics/:topicId", async (req, res) => {
  try {
    const id = parseInt(req.params.topicId);
    const { name, orderNumber } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Bad Request", message: "name is required" }); return;
    }
    const [topic] = await db.update(topicsTable)
      .set({ name: name.trim(), orderNumber })
      .where(eq(topicsTable.id, id))
      .returning();
    if (!topic) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(topic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update topic" });
  }
});

router.delete("/topics/:topicId", async (req, res) => {
  try {
    const id = parseInt(req.params.topicId);
    await db.delete(questionsTable).where(eq(questionsTable.topicId, id));
    await db.delete(userProgressTable).where(eq(userProgressTable.topicId, id));
    await db.delete(topicsTable).where(eq(topicsTable.id, id));
    res.json({ message: "Topic deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete topic" });
  }
});

router.patch("/topics/reorder", async (req, res) => {
  try {
    const { topicId, direction } = req.body as { topicId: number; direction: "up" | "down" };
    if (!topicId || !direction) {
      res.status(400).json({ error: "topicId and direction are required" }); return;
    }
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, topicId));
    if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }

    const siblings = await db
      .select({ id: topicsTable.id, orderNumber: topicsTable.orderNumber })
      .from(topicsTable)
      .where(eq(topicsTable.chapterId, topic.chapterId))
      .orderBy(asc(topicsTable.orderNumber));

    const idx = siblings.findIndex(s => s.id === topicId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      res.json({ message: "Already at boundary" }); return;
    }
    const curr = siblings[idx];
    const neighbor = siblings[swapIdx];
    await Promise.all([
      db.update(topicsTable).set({ orderNumber: neighbor.orderNumber }).where(eq(topicsTable.id, curr.id)),
      db.update(topicsTable).set({ orderNumber: curr.orderNumber }).where(eq(topicsTable.id, neighbor.id)),
    ]);
    res.json({ message: "Topics reordered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to reorder topics" });
  }
});

router.get("/topics/search", async (req, res) => {
  try {
    const name = ((req.query.name as string) ?? "").trim();
    if (!name || name.length < 2) { res.json([]); return; }
    const results = await db
      .select({
        id: topicsTable.id,
        name: topicsTable.name,
        chapterId: topicsTable.chapterId,
        chapterName: chaptersTable.name,
        subjectName: subjectsTable.name,
      })
      .from(topicsTable)
      .innerJoin(chaptersTable, eq(chaptersTable.id, topicsTable.chapterId))
      .innerJoin(subjectsTable, eq(subjectsTable.id, chaptersTable.subjectId))
      .where(ilike(topicsTable.name, `%${name}%`))
      .orderBy(asc(topicsTable.name))
      .limit(20);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to search topics" });
  }
});

router.get("/questions", async (req, res) => {
  try {
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : null;
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : null;
    const chapterId = req.query.chapterId ? parseInt(req.query.chapterId as string) : null;

    const selectFields = {
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
    };

    let rows;
    if (topicId) {
      rows = await db.select(selectFields).from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .where(eq(questionsTable.topicId, topicId));
    } else if (chapterId) {
      rows = await db.select(selectFields).from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .where(eq(topicsTable.chapterId, chapterId));
    } else if (subjectId) {
      rows = await db.select(selectFields).from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .innerJoin(chaptersTable, eq(chaptersTable.id, topicsTable.chapterId))
        .where(eq(chaptersTable.subjectId, subjectId));
    } else {
      rows = await db.select(selectFields).from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .limit(200);
    }

    res.json(rows.map(r => ({ ...r, correctAnswers: JSON.parse(r.correctAnswers) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get questions" });
  }
});

router.post("/questions", async (req, res) => {
  try {
    const {
      topicId, questionText, questionHtml, questionImageUrl,
      optionA, optionB, optionC, optionD, correctAnswers,
      explanation, questionType, difficulty, marks,
      numericAnswer, numericUnit, tolerance, allowedDecimalPrecision,
      matchingGridRows, matchingGridColumns, matchingGridAnswers,
      dropdownOptions, dropdownCorrectAnswer,
    } = req.body;
    if (!topicId || isNaN(Number(topicId))) {
      res.status(400).json({ error: "Bad Request", message: "topicId is required and must be a valid number" }); return;
    }
    if (!explanation) {
      res.status(400).json({ error: "Bad Request", message: "explanation is required" }); return;
    }
    const qType = questionType ?? "single";
    const isMCQType = qType === "single" || qType === "multiple";
    if (isMCQType && (!optionA || !optionB || !correctAnswers?.length)) {
      res.status(400).json({ error: "Bad Request", message: "MCQ requires at least 2 options and a correct answer" }); return;
    }
    if (qType === "fill_blank" && (numericAnswer === undefined || numericAnswer === null || numericAnswer === "")) {
      res.status(400).json({ error: "Bad Request", message: "fill_blank requires numericAnswer" }); return;
    }
    if (qType === "matching" && (!matchingGridRows || !matchingGridColumns || !matchingGridAnswers)) {
      res.status(400).json({ error: "Bad Request", message: "matching requires grid rows, columns, and answers" }); return;
    }
    if (qType === "dropdown" && (!dropdownOptions || !dropdownCorrectAnswer)) {
      res.status(400).json({ error: "Bad Request", message: "dropdown requires options and a correct answer" }); return;
    }
    const [question] = await db.insert(questionsTable).values({
      topicId: Number(topicId),
      questionText: questionText ?? "",
      questionHtml: questionHtml ?? null,
      questionImageUrl: questionImageUrl ?? null,
      optionA: optionA ?? "",
      optionB: optionB ?? "",
      optionC: optionC ?? "",
      optionD: optionD ?? "",
      correctAnswers: JSON.stringify(correctAnswers ?? []),
      explanation,
      questionType: qType,
      difficulty: difficulty ?? "medium",
      marks: marks ? Number(marks) : 1,
      numericAnswer: numericAnswer != null ? String(numericAnswer) : null,
      numericUnit: numericUnit ?? null,
      tolerance: tolerance != null ? String(tolerance) : null,
      allowedDecimalPrecision: allowedDecimalPrecision != null ? Number(allowedDecimalPrecision) : null,
      matchingGridRows: matchingGridRows ?? null,
      matchingGridColumns: matchingGridColumns ?? null,
      matchingGridAnswers: matchingGridAnswers ?? null,
      dropdownOptions: dropdownOptions ?? null,
      dropdownCorrectAnswer: dropdownCorrectAnswer ?? null,
    }).returning();
    res.status(201).json({ ...question, correctAnswers: JSON.parse(question.correctAnswers) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create question" });
  }
});

router.get("/questions/:questionId", async (req, res) => {
  try {
    const id = parseInt(req.params.questionId);
    const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, id));
    if (!question) { res.status(404).json({ error: "Question not found" }); return; }
    res.json({ ...question, correctAnswers: JSON.parse(question.correctAnswers) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch question" });
  }
});

router.post("/questions/import", async (req, res) => {
  try {
    const { questions } = req.body as { questions: Array<{
      topicId: number;
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswers: string[];
      explanation: string;
      questionType?: string;
      difficulty?: string;
    }> };
    if (!Array.isArray(questions) || !questions.length) {
      res.status(400).json({ error: "No questions provided" }); return;
    }
    const values = questions.map(q => ({
      topicId: q.topicId,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswers: JSON.stringify(q.correctAnswers),
      explanation: q.explanation,
      questionType: q.questionType ?? "single",
      difficulty: q.difficulty ?? "medium",
    }));
    const inserted = await db.insert(questionsTable).values(values).returning({ id: questionsTable.id });
    res.status(201).json({ imported: inserted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to import questions" });
  }
});

router.put("/questions/:questionId", async (req, res) => {
  try {
    const id = parseInt(req.params.questionId);
    const {
      topicId, questionText, questionHtml, questionImageUrl,
      optionA, optionB, optionC, optionD, correctAnswers,
      explanation, questionType, difficulty, marks,
      numericAnswer, numericUnit, tolerance, allowedDecimalPrecision,
      matchingGridRows, matchingGridColumns, matchingGridAnswers,
      dropdownOptions, dropdownCorrectAnswer,
    } = req.body;
    const [question] = await db.update(questionsTable).set({
      topicId,
      questionText: questionText ?? "",
      questionHtml: questionHtml ?? null,
      questionImageUrl: questionImageUrl ?? null,
      optionA: optionA ?? "",
      optionB: optionB ?? "",
      optionC: optionC ?? "",
      optionD: optionD ?? "",
      correctAnswers: JSON.stringify(correctAnswers ?? []),
      explanation,
      questionType,
      difficulty: difficulty ?? "medium",
      marks: marks ? Number(marks) : 1,
      numericAnswer: numericAnswer != null ? String(numericAnswer) : null,
      numericUnit: numericUnit ?? null,
      tolerance: tolerance != null ? String(tolerance) : null,
      allowedDecimalPrecision: allowedDecimalPrecision != null ? Number(allowedDecimalPrecision) : null,
      matchingGridRows: matchingGridRows ?? null,
      matchingGridColumns: matchingGridColumns ?? null,
      matchingGridAnswers: matchingGridAnswers ?? null,
      dropdownOptions: dropdownOptions ?? null,
      dropdownCorrectAnswer: dropdownCorrectAnswer ?? null,
    }).where(eq(questionsTable.id, id)).returning();
    res.json({ ...question, correctAnswers: JSON.parse(question.correctAnswers) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update question" });
  }
});

router.delete("/questions/:questionId", async (req, res) => {
  try {
    const id = parseInt(req.params.questionId);
    await db.delete(questionsTable).where(eq(questionsTable.id, id));
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete question" });
  }
});

// ── Subject (Paper) edit & delete ──────────────────────────────────────

router.put("/subjects/:subjectId", async (req, res) => {
  try {
    const id = parseInt(req.params.subjectId);
    const { name, code, description } = req.body;
    if (!name || !code) { res.status(400).json({ error: "name and code are required" }); return; }
    const [subject] = await db.update(subjectsTable)
      .set({ name, code, description: description ?? null })
      .where(eq(subjectsTable.id, id))
      .returning();
    if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update subject" });
  }
});

router.delete("/subjects/:subjectId", async (req, res) => {
  try {
    const id = parseInt(req.params.subjectId);
    const chapters = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(eq(chaptersTable.subjectId, id));
    const chapterIds = chapters.map(c => c.id);
    if (chapterIds.length > 0) {
      const topics = await db.select({ id: topicsTable.id }).from(topicsTable).where(inArray(topicsTable.chapterId, chapterIds));
      const topicIds = topics.map(t => t.id);
      if (topicIds.length > 0) {
        await db.delete(questionsTable).where(inArray(questionsTable.topicId, topicIds));
        await db.delete(userProgressTable).where(inArray(userProgressTable.topicId, topicIds));
        await db.delete(topicsTable).where(inArray(topicsTable.id, topicIds));
      }
      await db.delete(chaptersTable).where(inArray(chaptersTable.id, chapterIds));
    }
    await db.delete(userSubjectPurchasesTable).where(eq(userSubjectPurchasesTable.subjectId, id));
    await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
    res.json({ message: "Paper deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete subject" });
  }
});

// ── Student management ─────────────────────────────────────────────────

router.post("/students", async (req, res) => {
  try {
    const { name, email, password, whatsappNumber } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: "name, email and password are required" }); return; }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role: "student",
      whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null,
    }).returning();
    res.status(201).json({ id: user.id, name: user.name, email: user.email, isBlocked: user.isBlocked, whatsappNumber: user.whatsappNumber, createdAt: user.createdAt, purchasedSubjects: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create student" });
  }
});

router.put("/students/:userId", async (req, res) => {
  try {
    const id = parseInt(req.params.userId);
    const { name, email, whatsappNumber } = req.body;
    if (!name || !email) { res.status(400).json({ error: "name and email are required" }); return; }
    const [user] = await db.update(usersTable)
      .set({ name: name.trim(), email: email.trim().toLowerCase(), whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null })
      .where(eq(usersTable.id, id))
      .returning();
    if (!user) { res.status(404).json({ error: "Student not found" }); return; }
    res.json({ id: user.id, name: user.name, email: user.email, isBlocked: user.isBlocked, whatsappNumber: user.whatsappNumber, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update student" });
  }
});

router.patch("/students/:userId/block", async (req, res) => {
  try {
    const id = parseInt(req.params.userId);
    const { isBlocked } = req.body;
    const [user] = await db.update(usersTable).set({ isBlocked }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Student not found" }); return; }
    res.json({ id: user.id, isBlocked: user.isBlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update student status" });
  }
});

router.post("/students/:userId/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.userId);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" });
      return;
    }
    const passwordHash = hashPassword(newPassword);
    const [user] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Student not found" }); return; }
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to reset password" });
  }
});

// ── Staff management (teachers & teaching assistants) ────────────────────

router.get("/staff", async (_req, res) => {
  try {
    const staff = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isBlocked: usersTable.isBlocked, whatsappNumber: usersTable.whatsappNumber, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(inArray(usersTable.role, ["teacher", "teacher_assistant"]));
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get staff" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { name, email, password, role, whatsappNumber } = req.body;
    if (!name || !email || !password || !role) { res.status(400).json({ error: "name, email, password and role are required" }); return; }
    if (!["teacher", "teacher_assistant"].includes(role)) { res.status(400).json({ error: "role must be 'teacher' or 'teacher_assistant'" }); return; }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }
    const [user] = await db.insert(usersTable).values({
      name: name.trim(), email: email.trim().toLowerCase(), passwordHash: hashPassword(password), role,
      whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null,
    }).returning();
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, isBlocked: user.isBlocked, whatsappNumber: user.whatsappNumber, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create staff member" });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, whatsappNumber } = req.body;
    if (!name || !email || !role) { res.status(400).json({ error: "name, email and role are required" }); return; }
    if (!["teacher", "teacher_assistant"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    const [user] = await db.update(usersTable)
      .set({ name: name.trim(), email: email.trim().toLowerCase(), role, whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null })
      .where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, isBlocked: user.isBlocked, whatsappNumber: user.whatsappNumber, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update staff member" });
  }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete staff member" });
  }
});

router.patch("/staff/:id/block", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isBlocked } = req.body;
    const [user] = await db.update(usersTable).set({ isBlocked }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json({ id: user.id, isBlocked: user.isBlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update staff status" });
  }
});

router.post("/staff/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) { res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" }); return; }
    const [user] = await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to reset password" });
  }
});

// ── Chapter Videos ──────────────────────────────────────────────────────

router.get("/chapters/:chapterId/videos", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const videos = await db.select().from(chapterVideosTable).where(eq(chapterVideosTable.chapterId, chapterId)).orderBy(asc(chapterVideosTable.orderIndex));
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get videos" });
  }
});

router.post("/chapter-videos", async (req, res) => {
  try {
    const { chapterId, title, youtubeUrl, description, orderIndex } = req.body;
    if (!chapterId || !title || !youtubeUrl) { res.status(400).json({ error: "chapterId, title and youtubeUrl are required" }); return; }
    const [video] = await db.insert(chapterVideosTable).values({ chapterId, title, youtubeUrl, description: description ?? null, orderIndex: orderIndex ?? 0 }).returning();
    res.status(201).json(video);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create video" });
  }
});

router.put("/chapter-videos/:videoId", async (req, res) => {
  try {
    const id = parseInt(req.params.videoId);
    const { title, youtubeUrl, description, orderIndex } = req.body;
    if (!title || !youtubeUrl) { res.status(400).json({ error: "title and youtubeUrl are required" }); return; }
    const [video] = await db.update(chapterVideosTable).set({ title, youtubeUrl, description: description ?? null, orderIndex: orderIndex ?? 0 }).where(eq(chapterVideosTable.id, id)).returning();
    if (!video) { res.status(404).json({ error: "Video not found" }); return; }
    res.json(video);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update video" });
  }
});

router.delete("/chapter-videos/:videoId", async (req, res) => {
  try {
    const id = parseInt(req.params.videoId);
    await db.delete(chapterVideosTable).where(eq(chapterVideosTable.id, id));
    res.json({ message: "Video deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete video" });
  }
});

// ── Chapter Notes ──────────────────────────────────────────────────────

router.get("/chapters/:chapterId/notes", async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    const notes = await db.select().from(chapterNotesTable).where(eq(chapterNotesTable.chapterId, chapterId)).orderBy(asc(chapterNotesTable.orderIndex));
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get notes" });
  }
});

router.post("/chapter-notes", async (req, res) => {
  try {
    const { chapterId, title, fileUrl, description, orderIndex } = req.body;
    if (!chapterId || !title || !fileUrl) { res.status(400).json({ error: "chapterId, title and fileUrl are required" }); return; }
    const [note] = await db.insert(chapterNotesTable).values({ chapterId, title, fileUrl, description: description ?? null, orderIndex: orderIndex ?? 0 }).returning();
    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create note" });
  }
});

router.put("/chapter-notes/:noteId", async (req, res) => {
  try {
    const id = parseInt(req.params.noteId);
    const { title, fileUrl, description, orderIndex } = req.body;
    if (!title || !fileUrl) { res.status(400).json({ error: "title and fileUrl are required" }); return; }
    const [note] = await db.update(chapterNotesTable).set({ title, fileUrl, description: description ?? null, orderIndex: orderIndex ?? 0 }).where(eq(chapterNotesTable.id, id)).returning();
    if (!note) { res.status(404).json({ error: "Note not found" }); return; }
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update note" });
  }
});

router.delete("/chapter-notes/:noteId", async (req, res) => {
  try {
    const id = parseInt(req.params.noteId);
    await db.delete(chapterNotesTable).where(eq(chapterNotesTable.id, id));
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete note" });
  }
});

export default router;

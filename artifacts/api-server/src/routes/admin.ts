import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, subjectsTable, chaptersTable, topicsTable, questionsTable,
  usersTable, userProgressTable, userSubjectPurchasesTable, levelsTable
} from "@workspace/db";
import { eq, count, avg, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [{ count: totalUsers }] = await db.select({ count: count() }).from(usersTable);
    const [{ count: totalCourses }] = await db.select({ count: count() }).from(coursesTable);
    const [{ count: totalSubjects }] = await db.select({ count: count() }).from(subjectsTable);
    const [{ count: totalChapters }] = await db.select({ count: count() }).from(chaptersTable);
    const [{ count: totalTopics }] = await db.select({ count: count() }).from(topicsTable);
    const [{ count: totalQuestions }] = await db.select({ count: count() }).from(questionsTable);
    const [{ count: totalAttempts }] = await db.select({ count: count() }).from(userProgressTable);
    const [{ avg: avgScore }] = await db.select({ avg: avg(userProgressTable.scorePercentage) }).from(userProgressTable);
    res.json({
      totalUsers: Number(totalUsers),
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

router.get("/students", async (_req, res) => {
  try {
    const students = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.role, "student"));

    const result = await Promise.all(students.map(async (s) => {
      const purchases = await db
        .select({
          subjectId: userSubjectPurchasesTable.subjectId,
          subjectName: subjectsTable.name,
          subjectCode: subjectsTable.code,
          assignedAt: userSubjectPurchasesTable.assignedAt,
        })
        .from(userSubjectPurchasesTable)
        .innerJoin(subjectsTable, eq(userSubjectPurchasesTable.subjectId, subjectsTable.id))
        .where(eq(userSubjectPurchasesTable.userId, s.id));
      return { ...s, purchasedSubjects: purchases };
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
    const { subjectId, assignedBy } = req.body;
    if (!subjectId) { res.status(400).json({ error: "subjectId is required" }); return; }

    const existing = await db.select().from(userSubjectPurchasesTable)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Already enrolled", message: "Student already has access to this paper" });
      return;
    }

    const [purchase] = await db.insert(userSubjectPurchasesTable)
      .values({ userId, subjectId, assignedBy: assignedBy ?? null })
      .returning();
    res.status(201).json(purchase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to assign paper" });
  }
});

router.delete("/students/:userId/subjects/:subjectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const subjectId = parseInt(req.params.subjectId);
    await db.delete(userSubjectPurchasesTable)
      .where(and(eq(userSubjectPurchasesTable.userId, userId), eq(userSubjectPurchasesTable.subjectId, subjectId)));
    res.json({ message: "Paper access revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to revoke paper" });
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
    const courses = await db.select().from(coursesTable);
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
    const [course] = await db.insert(coursesTable).values({ name, code, description, icon, color, logo }).returning();
    res.status(201).json({ ...course, subjectCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create course" });
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

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const id = parseInt(req.params.courseId);
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

router.post("/topics", async (req, res) => {
  try {
    const { chapterId, name, orderNumber } = req.body;
    const [topic] = await db.insert(topicsTable).values({ chapterId, name, orderNumber }).returning();
    res.status(201).json({ ...topic, questionCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create topic" });
  }
});

router.get("/questions", async (req, res) => {
  try {
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : null;
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : null;

    let rows;
    if (topicId) {
      rows = await db
        .select({
          id: questionsTable.id,
          topicId: questionsTable.topicId,
          topicName: topicsTable.name,
          questionText: questionsTable.questionText,
          optionA: questionsTable.optionA,
          optionB: questionsTable.optionB,
          optionC: questionsTable.optionC,
          optionD: questionsTable.optionD,
          correctAnswers: questionsTable.correctAnswers,
          explanation: questionsTable.explanation,
          questionType: questionsTable.questionType,
        })
        .from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .where(eq(questionsTable.topicId, topicId));
    } else if (subjectId) {
      rows = await db
        .select({
          id: questionsTable.id,
          topicId: questionsTable.topicId,
          topicName: topicsTable.name,
          questionText: questionsTable.questionText,
          optionA: questionsTable.optionA,
          optionB: questionsTable.optionB,
          optionC: questionsTable.optionC,
          optionD: questionsTable.optionD,
          correctAnswers: questionsTable.correctAnswers,
          explanation: questionsTable.explanation,
          questionType: questionsTable.questionType,
        })
        .from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .innerJoin(chaptersTable, eq(chaptersTable.id, topicsTable.chapterId))
        .where(eq(chaptersTable.subjectId, subjectId));
    } else {
      rows = await db
        .select({
          id: questionsTable.id,
          topicId: questionsTable.topicId,
          topicName: topicsTable.name,
          questionText: questionsTable.questionText,
          optionA: questionsTable.optionA,
          optionB: questionsTable.optionB,
          optionC: questionsTable.optionC,
          optionD: questionsTable.optionD,
          correctAnswers: questionsTable.correctAnswers,
          explanation: questionsTable.explanation,
          questionType: questionsTable.questionType,
        })
        .from(questionsTable)
        .innerJoin(topicsTable, eq(topicsTable.id, questionsTable.topicId))
        .limit(100);
    }

    res.json(rows.map(r => ({ ...r, correctAnswers: JSON.parse(r.correctAnswers) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get questions" });
  }
});

router.post("/questions", async (req, res) => {
  try {
    const { topicId, questionText, optionA, optionB, optionC, optionD, correctAnswers, explanation, questionType } = req.body;
    const [question] = await db.insert(questionsTable).values({
      topicId, questionText, optionA, optionB, optionC, optionD,
      correctAnswers: JSON.stringify(correctAnswers),
      explanation, questionType,
    }).returning();
    res.status(201).json({ ...question, correctAnswers: JSON.parse(question.correctAnswers) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create question" });
  }
});

router.put("/questions/:questionId", async (req, res) => {
  try {
    const id = parseInt(req.params.questionId);
    const { topicId, questionText, optionA, optionB, optionC, optionD, correctAnswers, explanation, questionType } = req.body;
    const [question] = await db.update(questionsTable).set({
      topicId, questionText, optionA, optionB, optionC, optionD,
      correctAnswers: JSON.stringify(correctAnswers),
      explanation, questionType,
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

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, subjectsTable, chaptersTable, topicsTable, questionsTable,
  usersTable, userProgressTable, userCoursesTable
} from "@workspace/db";
import { eq, count, avg, sql, and } from "drizzle-orm";

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
      const enrollments = await db
        .select({ courseId: userCoursesTable.courseId, courseName: coursesTable.name, courseCode: coursesTable.code, assignedAt: userCoursesTable.assignedAt })
        .from(userCoursesTable)
        .innerJoin(coursesTable, eq(userCoursesTable.courseId, coursesTable.id))
        .where(eq(userCoursesTable.userId, s.id));
      return { ...s, enrolledCourses: enrollments };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get students" });
  }
});

router.post("/students/:userId/courses", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { courseId, assignedBy } = req.body;
    if (!courseId) { res.status(400).json({ error: "courseId is required" }); return; }

    const existing = await db.select().from(userCoursesTable)
      .where(and(eq(userCoursesTable.userId, userId), eq(userCoursesTable.courseId, courseId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Already enrolled", message: "Student already has access to this course" });
      return;
    }

    const [enrollment] = await db.insert(userCoursesTable)
      .values({ userId, courseId, assignedBy: assignedBy ?? null })
      .returning();
    res.status(201).json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to assign course" });
  }
});

router.delete("/students/:userId/courses/:courseId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const courseId = parseInt(req.params.courseId);
    await db.delete(userCoursesTable)
      .where(and(eq(userCoursesTable.userId, userId), eq(userCoursesTable.courseId, courseId)));
    res.json({ message: "Course access revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to revoke course" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const { name, code, description, icon, color } = req.body;
    const [course] = await db.insert(coursesTable).values({ name, code, description, icon, color }).returning();
    res.status(201).json({ ...course, subjectCount: 0, questionCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create course" });
  }
});

router.post("/subjects", async (req, res) => {
  try {
    const { courseId, name, code, description } = req.body;
    const [subject] = await db.insert(subjectsTable).values({ courseId, name, code, description }).returning();
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

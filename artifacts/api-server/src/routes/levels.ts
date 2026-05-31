import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  levelsTable, subjectsTable, chaptersTable, topicsTable, questionsTable,
  userSubjectPurchasesTable
} from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:levelId/subjects", async (req, res) => {
  try {
    const levelId = parseInt(req.params.levelId);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    type PurchaseRecord = { subjectId: number; isBlocked: boolean; expiresAt: Date | null };
    let allPurchases: PurchaseRecord[] = [];
    let purchasedIds = new Set<number>();
    if (userId) {
      allPurchases = await db.select({
        subjectId: userSubjectPurchasesTable.subjectId,
        isBlocked: userSubjectPurchasesTable.isBlocked,
        expiresAt: userSubjectPurchasesTable.expiresAt,
      })
        .from(userSubjectPurchasesTable)
        .where(eq(userSubjectPurchasesTable.userId, userId));
      const now = new Date();
      purchasedIds = new Set(
        allPurchases
          .filter(p => !p.isBlocked && (!p.expiresAt || p.expiresAt > now))
          .map(p => p.subjectId)
      );
    }

    const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.levelId, levelId));
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
      const purchase = userId ? allPurchases.find(p => p.subjectId === s.id) : null;
      const now = new Date();
      const accessStatus = purchase
        ? (purchase.isBlocked ? 'blocked' : (purchase.expiresAt && purchase.expiresAt < now ? 'expired' : 'active'))
        : null;
      return {
        ...s,
        chapterCount: chapterIds.length,
        questionCount,
        purchased: userId ? purchasedIds.has(s.id) : true,
        accessStatus,
      };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get subjects for level" });
  }
});

export default router;

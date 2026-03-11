import { pgTable, serial, text, integer, boolean, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  name: text("name").notNull(),
  orderNumber: integer("order_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id),
  name: text("name").notNull(),
  orderNumber: integer("order_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswers: text("correct_answers").notNull(),
  explanation: text("explanation").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull().default("single"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  scorePercentage: numeric("score_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  completed: boolean("completed").notNull().default(false),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true });
export const insertChapterSchema = createInsertSchema(chaptersTable).omit({ id: true, createdAt: true });
export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export const insertProgressSchema = createInsertSchema(userProgressTable).omit({ id: true, lastAttemptAt: true });

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
export type Chapter = typeof chaptersTable.$inferSelect;
export type Topic = typeof topicsTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;

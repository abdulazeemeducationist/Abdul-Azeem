import { pgTable, serial, text, integer, boolean, numeric, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  whatsappVerified: boolean("whatsapp_verified").notNull().default(false),
  profilePicture: text("profile_picture"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpVerificationsTable = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  logo: text("logo"),
  isActive: boolean("is_active").notNull().default(true),
  orderNumber: integer("order_number").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const levelsTable = pgTable("levels", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderNumber: integer("order_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  levelId: integer("level_id").references(() => levelsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderNumber: integer("order_number").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderNumber: integer("order_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswers: text("correct_answers").notNull(),
  explanation: text("explanation").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull().default("single"),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"),
  marks: integer("marks").notNull().default(1),
  questionHtml: text("question_html"),
  questionImageUrl: text("question_image_url"),
  numericAnswer: numeric("numeric_answer"),
  numericUnit: text("numeric_unit"),
  tolerance: numeric("tolerance"),
  allowedDecimalPrecision: integer("allowed_decimal_precision"),
  matchingGridRows: text("matching_grid_rows"),
  matchingGridColumns: text("matching_grid_columns"),
  matchingGridAnswers: text("matching_grid_answers"),
  dropdownOptions: text("dropdown_options"),
  dropdownCorrectAnswer: text("dropdown_correct_answer"),
  timeLimitMinutes: real("time_limit_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userCoursesTable = pgTable("user_courses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: integer("assigned_by").references(() => usersTable.id),
});

export const userSubjectPurchasesTable = pgTable("user_subject_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: integer("assigned_by").references(() => usersTable.id),
  expiresAt: timestamp("expires_at"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedAt: timestamp("blocked_at"),
  blockedBy: integer("blocked_by").references(() => usersTable.id),
});

export const courseAccessLogsTable = pgTable("course_access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  performedBy: integer("performed_by").references(() => usersTable.id),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  scorePercentage: numeric("score_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  completed: boolean("completed").notNull().default(false),
  lastQuestionIndex: integer("last_question_index").notNull().default(0),
  savedAnswers: text("saved_answers").notNull().default("[]"),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
});

export const chapterVideosTable = pgTable("chapter_videos", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chapterNotesTable = pgTable("chapter_notes", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertLevelSchema = createInsertSchema(levelsTable).omit({ id: true, createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true });
export const insertChapterSchema = createInsertSchema(chaptersTable).omit({ id: true, createdAt: true });
export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export const insertProgressSchema = createInsertSchema(userProgressTable).omit({ id: true, lastAttemptAt: true });
export const insertUserCourseSchema = createInsertSchema(userCoursesTable).omit({ id: true, assignedAt: true });
export const insertUserSubjectPurchaseSchema = createInsertSchema(userSubjectPurchasesTable).omit({ id: true, assignedAt: true });
export const insertCourseAccessLogSchema = createInsertSchema(courseAccessLogsTable).omit({ id: true, performedAt: true });
export const insertChapterVideoSchema = createInsertSchema(chapterVideosTable).omit({ id: true, createdAt: true });
export const insertChapterNoteSchema = createInsertSchema(chapterNotesTable).omit({ id: true, createdAt: true });

export type User = typeof usersTable.$inferSelect;
export type UserCourse = typeof userCoursesTable.$inferSelect;
export type UserSubjectPurchase = typeof userSubjectPurchasesTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Level = typeof levelsTable.$inferSelect;
export type Subject = typeof subjectsTable.$inferSelect;
export type Chapter = typeof chaptersTable.$inferSelect;
export type Topic = typeof topicsTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;
export type ChapterVideo = typeof chapterVideosTable.$inferSelect;
export type ChapterNote = typeof chapterNotesTable.$inferSelect;

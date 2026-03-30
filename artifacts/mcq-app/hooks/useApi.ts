const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  logo?: string;
  isActive: boolean;
  orderNumber: number;
  subjectCount: number;
  questionCount: number;
}

export interface Level {
  id: number;
  courseId: number;
  name: string;
  orderNumber: number;
  subjectCount: number;
}

export interface Subject {
  id: number;
  courseId: number;
  levelId?: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  chapterCount: number;
  questionCount: number;
  purchased: boolean;
}

export interface Chapter {
  id: number;
  subjectId: number;
  name: string;
  orderNumber: number;
  topicCount: number;
  questionCount: number;
}

export interface Topic {
  id: number;
  chapterId: number;
  name: string;
  orderNumber: number;
  questionCount: number;
}

export interface Question {
  id: number;
  topicId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string[];
  explanation: string;
  questionType: "single" | "multiple";
}

export interface UserProgress {
  id: number;
  userId: number;
  topicId: number;
  topicName?: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  completed: boolean;
  lastQuestionIndex: number;
  savedAnswers: string;
  lastAttemptAt?: string;
}

export interface ChapterVideo {
  id: number;
  chapterId: number;
  title: string;
  youtubeUrl: string;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface ChapterNote {
  id: number;
  chapterId: number;
  title: string;
  fileUrl: string;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface QuizState {
  lastQuestionIndex: number;
  savedAnswers: string[][];
  correctAnswers: number;
  totalQuestions: number;
}

export interface AdminSubject {
  id: number;
  name: string;
  code: string;
  courseId: number;
  levelId?: number;
  courseName: string;
  courseCode: string;
  isActive: boolean;
}

export interface StudentPurchasedSubject {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  assignedAt: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  isBlocked: boolean;
  whatsappNumber?: string | null;
  createdAt: string;
  purchasedSubjects: StudentPurchasedSubject[];
}

export const api = {
  getCourses: async (): Promise<Course[]> => {
    const res = await fetch(`${API_BASE}/courses`);
    if (!res.ok) throw new Error("Failed to fetch courses");
    return res.json();
  },
  getLevels: async (courseId: number): Promise<Level[]> => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/levels`);
    if (!res.ok) throw new Error("Failed to fetch levels");
    return res.json();
  },
  getSubjectsByLevel: async (levelId: number, userId?: number): Promise<Subject[]> => {
    const url = userId ? `${API_BASE}/levels/${levelId}/subjects?userId=${userId}` : `${API_BASE}/levels/${levelId}/subjects`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch subjects for level");
    return res.json();
  },
  getSubjects: async (courseId: number, userId?: number): Promise<Subject[]> => {
    const url = userId ? `${API_BASE}/courses/${courseId}/subjects?userId=${userId}` : `${API_BASE}/courses/${courseId}/subjects`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch subjects");
    return res.json();
  },
  getChapters: async (subjectId: number): Promise<Chapter[]> => {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/chapters`);
    if (!res.ok) throw new Error("Failed to fetch chapters");
    return res.json();
  },
  getTopics: async (chapterId: number): Promise<Topic[]> => {
    const res = await fetch(`${API_BASE}/chapters/${chapterId}/topics`);
    if (!res.ok) throw new Error("Failed to fetch topics");
    return res.json();
  },
  getQuestions: async (topicId: number): Promise<Question[]> => {
    const res = await fetch(`${API_BASE}/topics/${topicId}/questions`);
    if (!res.ok) throw new Error("Failed to fetch questions");
    return res.json();
  },
  getUserProgress: async (userId: number): Promise<UserProgress[]> => {
    const res = await fetch(`${API_BASE}/progress?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch progress");
    return res.json();
  },
  getQuizState: async (userId: number, topicId: number): Promise<QuizState | null> => {
    const res = await fetch(`${API_BASE}/progress/quiz-state?userId=${userId}&topicId=${topicId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz state");
    return res.json();
  },
  saveProgress: async (data: {
    userId: number;
    topicId: number;
    totalQuestions: number;
    correctAnswers: number;
    scorePercentage: number;
    completed: boolean;
  }): Promise<UserProgress> => {
    const res = await fetch(`${API_BASE}/progress/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save progress");
    return res.json();
  },
  saveQuizState: async (data: {
    userId: number;
    topicId: number;
    lastQuestionIndex: number;
    savedAnswers: string[][];
    correctAnswers: number;
    totalQuestions: number;
  }): Promise<void> => {
    const res = await fetch(`${API_BASE}/progress/save-quiz-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save quiz state");
  },
  getAdminCourses: async (): Promise<(Course & { subjectCount: number })[]> => {
    const res = await fetch(`${API_BASE}/admin/courses`);
    if (!res.ok) throw new Error("Failed to fetch admin courses");
    return res.json();
  },
  updateCourse: async (id: number, data: { name: string; code: string; description?: string; logo?: string }): Promise<Course> => {
    const res = await fetch(`${API_BASE}/admin/courses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update course");
    return res.json();
  },
  deleteCourse: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/courses/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete course");
  },
  toggleCourseActive: async (id: number, isActive: boolean): Promise<Course> => {
    const res = await fetch(`${API_BASE}/admin/courses/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error("Failed to toggle course status");
    return res.json();
  },
  reorderCourse: async (id: number, direction: "up" | "down"): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/courses/${id}/order`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) throw new Error("Failed to reorder course");
  },
  toggleSubjectActive: async (id: number, isActive: boolean): Promise<AdminSubject> => {
    const res = await fetch(`${API_BASE}/admin/subjects/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error("Failed to toggle subject status");
    return res.json();
  },
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  getStudents: async (): Promise<Student[]> => {
    const res = await fetch(`${API_BASE}/admin/students`);
    if (!res.ok) throw new Error("Failed to fetch students");
    return res.json();
  },
  getAllSubjects: async (): Promise<AdminSubject[]> => {
    const res = await fetch(`${API_BASE}/admin/subjects`);
    if (!res.ok) throw new Error("Failed to fetch subjects");
    return res.json();
  },
  assignSubject: async (userId: number, subjectId: number, assignedBy?: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/students/${userId}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, assignedBy }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to assign paper");
    }
  },
  revokeSubject: async (userId: number, subjectId: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/students/${userId}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to revoke paper");
  },
  createStudent: async (data: { name: string; email: string; password: string; whatsappNumber?: string }): Promise<Student> => {
    const res = await fetch(`${API_BASE}/admin/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create student");
    return json;
  },
  updateStudent: async (id: number, data: { name: string; email: string; whatsappNumber?: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update student");
  },
  toggleBlockStudent: async (id: number, isBlocked: boolean): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/students/${id}/block`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked }),
    });
    if (!res.ok) throw new Error("Failed to update student status");
  },
  updateSubject: async (id: number, data: { name: string; code: string; description?: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/subjects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update subject");
  },
  deleteSubject: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/subjects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete subject");
  },
  createCourse: async (data: { name: string; code: string; description?: string; logo?: string }) => {
    const res = await fetch(`${API_BASE}/admin/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create course");
    return res.json();
  },
  createSubject: async (data: { courseId: number; levelId?: number; name: string; code: string; description?: string }) => {
    const res = await fetch(`${API_BASE}/admin/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create subject");
    return res.json();
  },
  createChapter: async (data: { subjectId: number; name: string; orderNumber: number }) => {
    const res = await fetch(`${API_BASE}/admin/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create chapter");
    return res.json();
  },
  getAdminChapters: async (subjectId: number) => {
    const res = await fetch(`${API_BASE}/admin/subjects/${subjectId}/chapters`);
    if (!res.ok) throw new Error("Failed to fetch chapters");
    return res.json() as Promise<Array<{ id: number; subjectId: number; name: string; orderNumber: number; isActive: boolean; createdAt: string; topicCount: number }>>;
  },
  updateChapter: async (id: number, data: { name: string; orderNumber?: number }) => {
    const res = await fetch(`${API_BASE}/admin/chapters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update chapter");
    return res.json();
  },
  deleteChapter: async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/chapters/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete chapter");
  },
  toggleChapterActive: async (id: number, isActive: boolean) => {
    const res = await fetch(`${API_BASE}/admin/chapters/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error("Failed to toggle chapter");
    return res.json();
  },
  bulkImportMCQs: async (questions: Array<{
    topicId: number; questionText: string; optionA: string; optionB: string;
    optionC: string; optionD: string; correctAnswers: string[]; explanation: string;
    questionType?: string; difficulty?: string;
  }>) => {
    const res = await fetch(`${API_BASE}/admin/questions/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    if (!res.ok) throw new Error("Failed to import MCQs");
    return res.json() as Promise<{ imported: number }>;
  },
  createTopic: async (data: { chapterId: number; name: string; orderNumber: number }) => {
    const res = await fetch(`${API_BASE}/admin/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create topic");
    return res.json();
  },
  createQuestion: async (data: {
    topicId: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
    questionType: "single" | "multiple";
    difficulty: string;
  }) => {
    const res = await fetch(`${API_BASE}/admin/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create question");
    return res.json();
  },
  getAdminQuestions: async (params: { topicId?: number; subjectId?: number; chapterId?: number } = {}): Promise<Question[]> => {
    const qs = new URLSearchParams();
    if (params.topicId) qs.set("topicId", String(params.topicId));
    if (params.subjectId) qs.set("subjectId", String(params.subjectId));
    if (params.chapterId) qs.set("chapterId", String(params.chapterId));
    const res = await fetch(`${API_BASE}/admin/questions?${qs}`);
    if (!res.ok) throw new Error("Failed to fetch questions");
    return res.json();
  },
  importQuestions: async (questions: Array<{
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
  }>) => {
    const res = await fetch(`${API_BASE}/admin/questions/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    if (!res.ok) throw new Error("Failed to import questions");
    return res.json() as Promise<{ imported: number }>;
  },
  updateQuestion: async (id: number, data: {
    topicId: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswers: string[];
    explanation: string;
    questionType: "single" | "multiple";
    difficulty: string;
  }) => {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update question");
    return res.json();
  },
  deleteQuestion: async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete question");
    return res.json();
  },

  getChapterVideos: async (chapterId: number): Promise<ChapterVideo[]> => {
    const res = await fetch(`${API_BASE}/chapters/${chapterId}/videos`);
    if (!res.ok) throw new Error("Failed to fetch videos");
    return res.json();
  },
  getChapterNotes: async (chapterId: number): Promise<ChapterNote[]> => {
    const res = await fetch(`${API_BASE}/chapters/${chapterId}/notes`);
    if (!res.ok) throw new Error("Failed to fetch notes");
    return res.json();
  },

  createChapterVideo: async (data: { chapterId: number; title: string; youtubeUrl: string; description?: string; orderIndex?: number }): Promise<ChapterVideo> => {
    const res = await fetch(`${API_BASE}/admin/chapter-videos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create video");
    return json;
  },
  updateChapterVideo: async (id: number, data: { title: string; youtubeUrl: string; description?: string; orderIndex?: number }): Promise<ChapterVideo> => {
    const res = await fetch(`${API_BASE}/admin/chapter-videos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to update video");
    return res.json();
  },
  deleteChapterVideo: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/chapter-videos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete video");
  },

  createChapterNote: async (data: { chapterId: number; title: string; fileUrl: string; description?: string; orderIndex?: number }): Promise<ChapterNote> => {
    const res = await fetch(`${API_BASE}/admin/chapter-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create note");
    return json;
  },
  updateChapterNote: async (id: number, data: { title: string; fileUrl: string; description?: string; orderIndex?: number }): Promise<ChapterNote> => {
    const res = await fetch(`${API_BASE}/admin/chapter-notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to update note");
    return res.json();
  },
  deleteChapterNote: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/chapter-notes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete note");
  },
};

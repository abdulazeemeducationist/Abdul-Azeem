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
  }) => {
    const res = await fetch(`${API_BASE}/admin/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create question");
    return res.json();
  },
  deleteQuestion: async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete question");
    return res.json();
  },
};

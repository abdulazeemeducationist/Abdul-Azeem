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
  subjectCount: number;
  questionCount: number;
}

export interface Subject {
  id: number;
  courseId: number;
  name: string;
  code: string;
  description?: string;
  chapterCount: number;
  questionCount: number;
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
  lastAttemptAt?: string;
}

export const api = {
  getCourses: async (): Promise<Course[]> => {
    const res = await fetch(`${API_BASE}/courses`);
    if (!res.ok) throw new Error("Failed to fetch courses");
    return res.json();
  },
  getSubjects: async (courseId: number): Promise<Subject[]> => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/subjects`);
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
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  createCourse: async (data: { name: string; code: string; description?: string; icon?: string; color?: string }) => {
    const res = await fetch(`${API_BASE}/admin/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create course");
    return res.json();
  },
  createSubject: async (data: { courseId: number; name: string; code: string; description?: string }) => {
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

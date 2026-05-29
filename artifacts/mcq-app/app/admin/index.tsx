import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import React, { useState, useRef, useEffect } from "react";
import CountryCodePicker, { DEFAULT_COUNTRY, detectCountry, type Country } from "@/components/CountryCodePicker";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api, Student, AdminSubject, Course, ChapterVideo, ChapterNote } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

type TabType = "programs" | "courses" | "content" | "students" | "staff";
const STAFF_ROLES = ["teacher", "teacher_assistant"] as const;
type StaffRole = typeof STAFF_ROLES[number];

interface ProgramForm { name: string; code: string; description: string; logo: string }
const EMPTY_FORM: ProgramForm = { name: "", code: "", description: "", logo: "" };

// ── Topic Reorder List ──────────────────────────────────────────────────────
interface TopicReorderListProps {
  topics: any[];
  onReorder: (orderedIds: number[]) => Promise<void>;
  onEdit: (t: any) => void;
  onDelete: (t: any) => void;
}
function TopicReorderList({ topics, onReorder, onEdit, onDelete }: TopicReorderListProps) {
  const [localTopics, setLocalTopics] = React.useState<any[]>(topics);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { setLocalTopics(topics); }, [topics]);

  const move = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= localTopics.length) return;
    const next = [...localTopics];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setLocalTopics(next);
    setSaving(true);
    try { await onReorder(next.map(t => t.id)); }
    catch { setLocalTopics(localTopics); }
    finally { setSaving(false); }
  };

  return (
    <View>
      {saving && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, paddingHorizontal: 4 }}>
          <ActivityIndicator size="small" color={Colors.light.primary} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted }}>Saving order…</Text>
        </View>
      )}
      {localTopics.map((t: any, ti: number) => (
        <View key={t.id} style={topicRowStyle}>
          {/* Reorder arrows */}
          <View style={{ gap: 2, marginRight: 6 }}>
            <Pressable
              style={[arrowBtn, ti === 0 && { opacity: 0.25 }]}
              onPress={() => move(ti, ti - 1)}
              disabled={ti === 0 || saving}
            >
              <Ionicons name="chevron-up" size={12} color={Colors.light.primary} />
            </Pressable>
            <Pressable
              style={[arrowBtn, ti === localTopics.length - 1 && { opacity: 0.25 }]}
              onPress={() => move(ti, ti + 1)}
              disabled={ti === localTopics.length - 1 || saving}
            >
              <Ionicons name="chevron-down" size={12} color={Colors.light.primary} />
            </Pressable>
          </View>
          {/* Position number */}
          <View style={dotStyle}>
            <Text style={dotTextStyle}>{ti + 1}</Text>
          </View>
          {/* Name */}
          <Text style={nameStyle} numberOfLines={2}>{t.name}</Text>
          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable
              style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.light.primary + "18", alignItems: "center", justifyContent: "center" }}
              onPress={() => onEdit(t)}
            >
              <Ionicons name="pencil" size={13} color={Colors.light.primary} />
            </Pressable>
            <Pressable
              style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.light.error + "15", alignItems: "center", justifyContent: "center" }}
              onPress={() => onDelete(t)}
            >
              <Ionicons name="trash" size={13} color={Colors.light.error} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
const topicRowStyle: import("react-native").ViewStyle = {
  flexDirection: "row", alignItems: "center",
  backgroundColor: "#FFF", borderRadius: 10,
  paddingVertical: 7, paddingHorizontal: 8,
  marginBottom: 6, borderWidth: 1, borderColor: "#E5E7EB",
};
const arrowBtn: import("react-native").ViewStyle = {
  width: 20, height: 20, borderRadius: 5,
  backgroundColor: Colors.light.primary + "15",
  alignItems: "center", justifyContent: "center",
};
const dotStyle: import("react-native").ViewStyle = {
  width: 22, height: 22, borderRadius: 11,
  backgroundColor: Colors.light.primary + "20",
  alignItems: "center", justifyContent: "center",
  marginRight: 8, flexShrink: 0,
};
const dotTextStyle: import("react-native").TextStyle = {
  fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.primary,
};
const nameStyle: import("react-native").TextStyle = {
  flex: 1, fontSize: 13, fontFamily: "Inter_500Medium",
  color: Colors.light.text, marginRight: 6,
};

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();

  const isAdminRole = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isTA = user?.role === "teacher_assistant";
  const isStaff = isTeacher || isTA;

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = params.tab;
    if (t === "students" || t === "content" || t === "programs" || t === "courses" || t === "staff") return t as TabType;
    if (isTeacher) return "courses";
    if (isTA) return "content";
    return "programs";
  });

  useEffect(() => {
    const t = params.tab;
    if (t === "students" || t === "content" || t === "programs" || t === "courses" || t === "staff") {
      setActiveTab(t as TabType);
    }
  }, [params.tab]);

  // Programs state
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<(Course & { subjectCount: number }) | null>(null);
  const [programForm, setProgramForm] = useState<ProgramForm>(EMPTY_FORM);
  const [savingProgram, setSavingProgram] = useState(false);
  const [pendingProgDeleteIds, setPendingProgDeleteIds] = useState<number[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Students state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [pendingRevokeIds, setPendingRevokeIds] = useState<{ studentId: number; subjectId: number }[]>([]);

  // Papers / Courses state
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<AdminSubject | null>(null);
  const [paperForm, setPaperForm] = useState({ name: "", code: "", description: "" });
  const [savingPaper, setSavingPaper] = useState(false);
  const [pendingPaperDeleteIds, setPendingPaperDeleteIds] = useState<number[]>([]);
  const [coursesTabProgramId, setCoursesTabProgramId] = useState<number | null>(null);

  // Student management state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({ name: "", email: "", password: "", showPassword: false });
  const [studentCountry, setStudentCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [studentLocalNumber, setStudentLocalNumber] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentFormError, setStudentFormError] = useState("");
  const [resetPwdStudent, setResetPwdStudent] = useState<Student | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState("");
  const [resetPwdShow, setResetPwdShow] = useState(false);
  const [resetPwdSaving, setResetPwdSaving] = useState(false);
  const [resetPwdError, setResetPwdError] = useState("");

  // Staff management state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", role: "teacher" as StaffRole, showPassword: false });
  const [staffFormError, setStaffFormError] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [resetStaffPwd, setResetStaffPwd] = useState<any | null>(null);
  const [resetStaffPwdValue, setResetStaffPwdValue] = useState("");
  const [resetStaffPwdShow, setResetStaffPwdShow] = useState(false);
  const [resetStaffPwdSaving, setResetStaffPwdSaving] = useState(false);
  const [resetStaffPwdError, setResetStaffPwdError] = useState("");

  // Content sub-tab
  const [contentSubTab, setContentSubTab] = useState<"chapters" | "videos" | "notes" | "practice">("chapters");

  // Chapter management state
  const [chapFilterSubjectId, setChapFilterSubjectId] = useState<number | null>(null);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [chapterForm, setChapterForm] = useState({ name: "", orderNumber: "1" });
  const [savingChapter, setSavingChapter] = useState(false);

  // Topic management state
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any | null>(null);
  const [topicForm, setTopicForm] = useState({ name: "", orderNumber: "1" });
  const [savingTopic, setSavingTopic] = useState(false);

  // Video management state
  const [videoFilterSubjectId, setVideoFilterSubjectId] = useState<number | null>(null);
  const [videoFilterChapterId, setVideoFilterChapterId] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ChapterVideo | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", youtubeUrl: "", description: "" });
  const [savingVideo, setSavingVideo] = useState(false);

  // Note management state
  const [noteFilterSubjectId, setNoteFilterSubjectId] = useState<number | null>(null);
  const [noteFilterChapterId, setNoteFilterChapterId] = useState<number | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<ChapterNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", fileUrl: "", description: "" });
  const [noteFileName, setNoteFileName] = useState("");
  const [pickingNote, setPickingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Content state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
  const [mcqFilterSubjectId, setMcqFilterSubjectId] = useState<number | null>(null);
  const [mcqFilterChapterId, setMcqFilterChapterId] = useState<number | null>(null);
  const [qFormSubjectId, setQFormSubjectId] = useState<number | null>(null);
  const [qFormChapterId, setQFormChapterId] = useState<number | null>(null);
  const [savingQ, setSavingQ] = useState(false);
  const [pendingQDeleteIds, setPendingQDeleteIds] = useState<number[]>([]);

  // Undo snackbar
  const [snackbar, setSnackbar] = useState<{ message: string; countdown: number } | null>(null);
  const snackUndoRef = useRef<(() => void) | null>(null);
  const snackCommitRef = useRef<(() => Promise<void> | void) | null>(null);
  const snackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const EMPTY_Q = { topicId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswers: "", explanation: "", difficulty: "medium" };
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importState, setImportState] = useState<"idle"|"preview"|"importing"|"done">("idle");
  const [importData, setImportData] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(0);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"], queryFn: api.getAdminStats,
  });
  const { data: programs, isLoading: programsLoading, refetch: refetchPrograms } = useQuery({
    queryKey: ["adminCourses"], queryFn: api.getAdminCourses, enabled: activeTab === "programs" || activeTab === "courses",
  });
  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["adminStudents"], queryFn: api.getStudents, enabled: activeTab === "students",
  });
  const { data: staffList, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ["adminStaff"], queryFn: api.getStaff, enabled: activeTab === "staff",
  });
  const { data: allSubjects, refetch: refetchSubjects } = useQuery({
    queryKey: ["adminSubjects"], queryFn: api.getAllSubjects,
    enabled: showEnrollModal || activeTab === "content" || activeTab === "programs" || activeTab === "courses",
  });
  const { data: adminQuestions, isLoading: questionsLoading, refetch: refetchQuestions } = useQuery({
    queryKey: ["adminQuestions", mcqFilterSubjectId, mcqFilterChapterId],
    queryFn: () => api.getAdminQuestions(
      mcqFilterChapterId ? { chapterId: mcqFilterChapterId } :
      mcqFilterSubjectId ? { subjectId: mcqFilterSubjectId } : {}
    ),
    enabled: activeTab === "content" && contentSubTab === "practice" && !!mcqFilterChapterId,
  });
  const { data: mcqChapters, isLoading: mcqChaptersLoading } = useQuery({
    queryKey: ["chapters", mcqFilterSubjectId, "mcq"],
    queryFn: () => api.getAdminChapters(Number(mcqFilterSubjectId)),
    enabled: activeTab === "content" && contentSubTab === "practice" && !!mcqFilterSubjectId,
  });
  const { data: videoChapters, isLoading: videoChaptersLoading } = useQuery({
    queryKey: ["chapters", videoFilterSubjectId],
    queryFn: () => api.getChapters(Number(videoFilterSubjectId)),
    enabled: activeTab === "content" && contentSubTab === "videos" && !!videoFilterSubjectId,
  });
  const { data: noteChapters, isLoading: noteChaptersLoading } = useQuery({
    queryKey: ["chapters", noteFilterSubjectId],
    queryFn: () => api.getChapters(Number(noteFilterSubjectId)),
    enabled: activeTab === "content" && contentSubTab === "notes" && !!noteFilterSubjectId,
  });
  const { data: chapterVideos, isLoading: chapterVideosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["admin-chapter-videos", videoFilterChapterId],
    queryFn: () => api.getChapterVideos(Number(videoFilterChapterId)),
    enabled: activeTab === "content" && contentSubTab === "videos" && !!videoFilterChapterId,
  });
  const { data: chapterNotes, isLoading: chapterNotesLoading, refetch: refetchNotes } = useQuery({
    queryKey: ["admin-chapter-notes", noteFilterChapterId],
    queryFn: () => api.getChapterNotes(Number(noteFilterChapterId)),
    enabled: activeTab === "content" && contentSubTab === "notes" && !!noteFilterChapterId,
  });
  const { data: adminChapters, isLoading: adminChaptersLoading, refetch: refetchAdminChapters } = useQuery({
    queryKey: ["admin-chapters", chapFilterSubjectId],
    queryFn: () => api.getAdminChapters(Number(chapFilterSubjectId)),
    enabled: activeTab === "content" && contentSubTab === "chapters" && !!chapFilterSubjectId,
  });
  const { data: qFormChapters } = useQuery({
    queryKey: ["qform-chapters", qFormSubjectId],
    queryFn: () => api.getAdminChapters(Number(qFormSubjectId)),
    enabled: showAddQuestion && !!qFormSubjectId,
  });
  const { data: qFormTopics } = useQuery({
    queryKey: ["qform-topics", qFormChapterId],
    queryFn: () => api.getTopics(Number(qFormChapterId)),
    enabled: showAddQuestion && !!qFormChapterId,
  });
  const { data: expandedTopics, refetch: refetchExpandedTopics } = useQuery({
    queryKey: ["chapter-topics", expandedChapterId],
    queryFn: () => api.getTopics(Number(expandedChapterId)),
    enabled: !!expandedChapterId,
  });

  if (!isAdminRole && !isStaff) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <Text style={styles.noAccessText}>Access required</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // --- Programs CRUD ---
  const openAddProgram = () => { setEditingProgram(null); setProgramForm(EMPTY_FORM); setShowProgramModal(true); };
  const openEditProgram = (p: Course & { subjectCount: number }) => {
    setEditingProgram(p);
    setProgramForm({ name: p.name, code: p.code, description: p.description ?? "", logo: p.logo ?? "" });
    setShowProgramModal(true);
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setProgramForm(f => ({ ...f, logo: base64 }));
        };
        reader.readAsDataURL(blob);
      } else {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        const mime = asset.mimeType ?? "image/jpeg";
        setProgramForm(f => ({ ...f, logo: `data:${mime};base64,${base64}` }));
      }
    }
  };
  const handleSaveProgram = async () => {
    if (!programForm.name.trim() || !programForm.code.trim()) return;
    setSavingProgram(true);
    const wasEditing = editingProgram;
    const oldValues = wasEditing
      ? { name: wasEditing.name, code: wasEditing.code, description: wasEditing.description ?? "", logo: wasEditing.logo ?? "" }
      : null;
    try {
      const payload = {
        name: programForm.name.trim(),
        code: programForm.code.trim(),
        description: programForm.description.trim() || undefined,
        logo: programForm.logo || undefined,
      };
      let newId: number | null = null;
      if (wasEditing) {
        await api.updateCourse(wasEditing.id, payload);
      } else {
        const created = await api.createCourse(payload);
        newId = created.id;
      }
      qc.invalidateQueries({ queryKey: ["adminCourses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      refetchPrograms();
      refetchStats();
      setShowProgramModal(false);
      if (wasEditing && oldValues) {
        showUndo("Changes saved.", () => {}, async () => {
          await api.updateCourse(wasEditing.id, { name: oldValues.name, code: oldValues.code, description: oldValues.description || undefined, logo: oldValues.logo || undefined });
          refetchPrograms();
          qc.invalidateQueries({ queryKey: ["courses"] });
        });
      } else if (newId) {
        showUndo("Program created.", () => {}, async () => {
          await api.deleteCourse(newId!);
          refetchPrograms();
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchStats();
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingProgram(false);
    }
  };
  // ── Undo snackbar helpers ──
  const clearSnack = () => {
    if (snackIntervalRef.current) clearInterval(snackIntervalRef.current);
    snackUndoRef.current = null;
    snackCommitRef.current = null;
    setSnackbar(null);
  };
  const showUndo = (message: string, commitFn: () => Promise<void> | void, undoFn: () => void) => {
    clearSnack();
    snackUndoRef.current = undoFn;
    snackCommitRef.current = commitFn;
    setSnackbar({ message, countdown: 10 });
    let count = 10;
    snackIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        const commit = snackCommitRef.current;
        clearSnack();
        if (commit) commit();
      } else {
        setSnackbar({ message, countdown: count });
      }
    }, 1000);
  };
  const handleUndo = () => {
    const undoFn = snackUndoRef.current;
    clearSnack();
    if (undoFn) undoFn();
  };

  const handleToggleCourse = async (id: number, current: boolean) => {
    try {
      await api.toggleCourseActive(id, !current);
      qc.invalidateQueries({ queryKey: ["adminCourses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      refetchPrograms();
    } catch (e) { console.error(e); }
  };
  const handleReorderCourse = async (id: number, direction: "up" | "down") => {
    try {
      await api.reorderCourse(id, direction);
      refetchPrograms();
      qc.invalidateQueries({ queryKey: ["courses"] });
    } catch (e) { console.error(e); }
  };
  const handleToggleSubject = async (id: number, current: boolean) => {
    try {
      await api.toggleSubjectActive(id, !current);
      qc.invalidateQueries({ queryKey: ["adminSubjects"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      refetchSubjects();
    } catch (e) { console.error(e); }
  };

  // ── Paper (Subject) CRUD ──
  const openAddPaper = (courseId: number) => {
    setEditingPaper(null);
    setPaperForm({ name: "", code: "", description: "" });
    setExpandedProgramId(courseId);
    setShowPaperModal(true);
  };
  const openEditPaper = (paper: AdminSubject) => {
    setEditingPaper(paper);
    setPaperForm({ name: paper.name, code: paper.code, description: "" });
    setShowPaperModal(true);
  };
  const handleSavePaper = async () => {
    if (!paperForm.name.trim() || !paperForm.code.trim()) return;
    setSavingPaper(true);
    const wasEditing = editingPaper;
    try {
      if (wasEditing) {
        await api.updateSubject(wasEditing.id, { name: paperForm.name.trim(), code: paperForm.code.trim().toUpperCase(), description: paperForm.description.trim() || undefined });
        showUndo("Course updated.", () => {}, async () => {
          await api.updateSubject(wasEditing.id, { name: wasEditing.name, code: wasEditing.code });
          refetchSubjects(); qc.invalidateQueries({ queryKey: ["adminSubjects"] });
        });
      } else {
        const created = await api.createSubject({ courseId: expandedProgramId!, name: paperForm.name.trim(), code: paperForm.code.trim().toUpperCase(), description: paperForm.description.trim() || undefined });
        showUndo("Course added.", () => {}, async () => {
          await api.deleteSubject(created.id);
          refetchSubjects(); qc.invalidateQueries({ queryKey: ["adminSubjects"] }); qc.invalidateQueries({ queryKey: ["adminCourses"] }); refetchPrograms();
        });
      }
      qc.invalidateQueries({ queryKey: ["adminSubjects"] });
      qc.invalidateQueries({ queryKey: ["adminCourses"] });
      refetchSubjects(); refetchPrograms();
      setShowPaperModal(false);
    } catch (e) { console.error(e); }
    finally { setSavingPaper(false); }
  };
  const confirmDeletePaper = (paper: AdminSubject) => {
    setConfirmModal({
      title: "Delete Course?",
      message: `This will permanently delete "${paper.name}" and all its chapters, topics, and questions.`,
      onConfirm: () => {
        setConfirmModal(null);
        setPendingPaperDeleteIds(prev => [...prev, paper.id]);
        showUndo("Course deleted.", async () => {
          await api.deleteSubject(paper.id);
          setPendingPaperDeleteIds(prev => prev.filter(x => x !== paper.id));
          qc.invalidateQueries({ queryKey: ["adminSubjects"] });
          qc.invalidateQueries({ queryKey: ["adminCourses"] });
          refetchSubjects(); refetchPrograms();
        }, () => {
          setPendingPaperDeleteIds(prev => prev.filter(x => x !== paper.id));
        });
      },
    });
  };

  // ── Student CRUD ──
  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ name: "", email: "", password: "", showPassword: false });
    setStudentCountry(DEFAULT_COUNTRY);
    setStudentLocalNumber("");
    setStudentFormError("");
    setShowStudentModal(true);
  };
  const openEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({ name: s.name, email: s.email, password: "", showPassword: false });
    if (s.whatsappNumber) {
      const { country, local } = detectCountry(s.whatsappNumber);
      setStudentCountry(country ?? DEFAULT_COUNTRY);
      setStudentLocalNumber(local ?? "");
    } else {
      setStudentCountry(DEFAULT_COUNTRY);
      setStudentLocalNumber("");
    }
    setStudentFormError("");
    setShowStudentModal(true);
  };
  const handleSaveStudent = async () => {
    setStudentFormError("");
    if (!studentForm.name.trim() || !studentForm.email.trim()) { setStudentFormError("Name and email are required"); return; }
    if (!editingStudent && !studentForm.password) { setStudentFormError("Password is required for new students"); return; }
    setSavingStudent(true);
    try {
      const localClean = studentLocalNumber.replace(/\D/g, "").replace(/^0+/, "");
      const whatsapp = localClean.length >= 7 ? studentCountry.code + localClean : undefined;
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, { name: studentForm.name.trim(), email: studentForm.email.trim(), whatsappNumber: whatsapp });
        qc.invalidateQueries({ queryKey: ["adminStudents"] }); refetchStudents();
      } else {
        await api.createStudent({ name: studentForm.name.trim(), email: studentForm.email.trim(), password: studentForm.password, whatsappNumber: whatsapp });
        qc.invalidateQueries({ queryKey: ["adminStudents"] }); qc.invalidateQueries({ queryKey: ["adminStats"] }); refetchStudents(); refetchStats();
      }
      setShowStudentModal(false);
    } catch (e: any) {
      setStudentFormError(e.message || "Failed to save student");
    } finally { setSavingStudent(false); }
  };
  const handleToggleBlockStudent = async (s: Student) => {
    try {
      await api.toggleBlockStudent(s.id, !s.isBlocked);
      qc.invalidateQueries({ queryKey: ["adminStudents"] }); refetchStudents();
    } catch (e) { console.error(e); }
  };
  const handleResetPassword = async () => {
    if (!resetPwdStudent) return;
    if (resetPwdValue.length < 6) { setResetPwdError("Password must be at least 6 characters"); return; }
    setResetPwdSaving(true);
    setResetPwdError("");
    try {
      await api.resetStudentPassword(resetPwdStudent.id, resetPwdValue);
      setResetPwdStudent(null);
      setResetPwdValue("");
    } catch (e: any) {
      setResetPwdError(e.message || "Failed to reset password");
    } finally {
      setResetPwdSaving(false);
    }
  };
  // --- Staff CRUD ---
  const openAddStaff = () => { setEditingStaff(null); setStaffForm({ name: "", email: "", password: "", role: "teacher", showPassword: false }); setStaffFormError(""); setShowStaffModal(true); };
  const openEditStaff = (s: any) => { setEditingStaff(s); setStaffForm({ name: s.name, email: s.email, password: "", role: s.role, showPassword: false }); setStaffFormError(""); setShowStaffModal(true); };
  const handleSaveStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) { setStaffFormError("Name and email are required"); return; }
    if (!editingStaff && staffForm.password.length < 6) { setStaffFormError("Password must be at least 6 characters"); return; }
    setSavingStaff(true); setStaffFormError("");
    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, { name: staffForm.name.trim(), email: staffForm.email.trim(), role: staffForm.role });
      } else {
        await api.createStaff({ name: staffForm.name.trim(), email: staffForm.email.trim(), password: staffForm.password, role: staffForm.role });
      }
      qc.invalidateQueries({ queryKey: ["adminStaff"] }); refetchStaff();
      setShowStaffModal(false);
    } catch (e: any) { setStaffFormError(e.message || "Failed to save"); }
    finally { setSavingStaff(false); }
  };
  const handleToggleBlockStaff = async (s: any) => {
    try { await api.toggleBlockStaff(s.id, !s.isBlocked); qc.invalidateQueries({ queryKey: ["adminStaff"] }); refetchStaff(); }
    catch (e) { console.error(e); }
  };
  const handleDeleteStaff = (s: any) => {
    setConfirmModal({
      title: "Remove Staff Member?",
      message: `This will permanently remove ${s.name}'s account. They will no longer be able to log in.`,
      onConfirm: async () => { setConfirmModal(null); await api.deleteStaff(s.id); qc.invalidateQueries({ queryKey: ["adminStaff"] }); refetchStaff(); },
      onCancel: () => setConfirmModal(null),
    });
  };
  const handleResetStaffPassword = async () => {
    if (!resetStaffPwd) return;
    if (resetStaffPwdValue.length < 6) { setResetStaffPwdError("Password must be at least 6 characters"); return; }
    setResetStaffPwdSaving(true); setResetStaffPwdError("");
    try { await api.resetStaffPassword(resetStaffPwd.id, resetStaffPwdValue); setResetStaffPwd(null); setResetStaffPwdValue(""); }
    catch (e: any) { setResetStaffPwdError(e.message || "Failed to reset password"); }
    finally { setResetStaffPwdSaving(false); }
  };

  const confirmDelete = (id: number) => {
    setConfirmModal({
      title: "Delete Program?",
      message: "This will permanently delete the program and all its papers, chapters, topics, and questions.",
      onConfirm: () => {
        setConfirmModal(null);
        setPendingProgDeleteIds(prev => [...prev, id]);
        showUndo("Program deleted.", async () => {
          await api.deleteCourse(id);
          setPendingProgDeleteIds(prev => prev.filter(x => x !== id));
          qc.invalidateQueries({ queryKey: ["adminCourses"] });
          qc.invalidateQueries({ queryKey: ["courses"] });
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchPrograms();
          refetchStats();
        }, () => {
          setPendingProgDeleteIds(prev => prev.filter(x => x !== id));
        });
      },
    });
  };

  // --- Enroll ---
  const handleAssignPaper = async (subjectId: number) => {
    if (!selectedStudent) return;
    setSavingEnroll(true);
    try {
      await api.assignSubject(selectedStudent.id, subjectId, user.id);
      qc.invalidateQueries({ queryKey: ["adminStudents"] });
      refetchStudents();
      setShowEnrollModal(false);
      setSelectedStudent(null);
    } catch (e: any) { console.error(e); }
    finally { setSavingEnroll(false); }
  };
  const handleRevokePaper = (student: Student, subjectId: number, subjectCode: string) => {
    setConfirmModal({
      title: "Remove Paper Access?",
      message: `This will remove ${student.name}'s access to ${subjectCode}. You can re-assign it later from the Students tab.`,
      onConfirm: () => {
        setConfirmModal(null);
        setPendingRevokeIds(prev => [...prev, { studentId: student.id, subjectId }]);
        showUndo(`Access to ${subjectCode} removed.`, async () => {
          await api.revokeSubject(student.id, subjectId);
          setPendingRevokeIds(prev => prev.filter(r => !(r.studentId === student.id && r.subjectId === subjectId)));
          qc.invalidateQueries({ queryKey: ["adminStudents"] });
          refetchStudents();
        }, () => {
          setPendingRevokeIds(prev => prev.filter(r => !(r.studentId === student.id && r.subjectId === subjectId)));
        });
      },
    });
  };

  // --- Add / Edit Question ---
  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQForm(EMPTY_Q);
    setQFormSubjectId(mcqFilterSubjectId);
    setQFormChapterId(mcqFilterChapterId);
    setShowAddQuestion(true);
  };
  const openEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setQForm({
      topicId: String(q.topicId),
      questionText: q.questionText,
      optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
      correctAnswers: (q.correctAnswers as string[]).join(","),
      explanation: q.explanation,
      difficulty: q.difficulty ?? "medium",
    });
    setQFormSubjectId(mcqFilterSubjectId);
    setQFormChapterId(mcqFilterChapterId);
    setShowAddQuestion(true);
  };
  const handleSaveQuestion = async () => {
    const topicIdNum = parseInt(qForm.topicId);
    if (!qForm.topicId || isNaN(topicIdNum) || !qForm.questionText || !qForm.optionA || !qForm.optionB || !qForm.optionC || !qForm.optionD || !qForm.correctAnswers || !qForm.explanation) return;
    const answers = qForm.correctAnswers.toUpperCase().split(",").map(a => a.trim()).filter(a => ["A","B","C","D"].includes(a));
    if (!answers.length) return;
    setSavingQ(true);
    const wasEditing = editingQuestion;
    const oldQ = wasEditing ? { ...wasEditing } : null;
    try {
      const payload = {
        topicId: topicIdNum,
        questionText: qForm.questionText,
        optionA: qForm.optionA, optionB: qForm.optionB, optionC: qForm.optionC, optionD: qForm.optionD,
        correctAnswers: answers, explanation: qForm.explanation,
        questionType: answers.length > 1 ? "multiple" as const : "single" as const,
        difficulty: qForm.difficulty,
      };
      let newQId: number | null = null;
      if (wasEditing) {
        await api.updateQuestion(wasEditing.id, payload);
      } else {
        const created = await api.createQuestion(payload);
        newQId = created.id;
      }
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      refetchStats();
      refetchQuestions();
      setShowAddQuestion(false);
      setQForm(EMPTY_Q);
      setEditingQuestion(null);
      if (wasEditing && oldQ) {
        showUndo("Changes saved.", () => {}, async () => {
          await api.updateQuestion(wasEditing.id, {
            topicId: oldQ.topicId, questionText: oldQ.questionText,
            optionA: oldQ.optionA, optionB: oldQ.optionB, optionC: oldQ.optionC, optionD: oldQ.optionD,
            correctAnswers: oldQ.correctAnswers, explanation: oldQ.explanation,
            questionType: oldQ.questionType, difficulty: oldQ.difficulty,
          });
          refetchQuestions();
          qc.invalidateQueries({ queryKey: ["adminQuestions"] });
        });
      } else if (newQId) {
        showUndo("Question added.", () => {}, async () => {
          await api.deleteQuestion(newQId!);
          refetchQuestions();
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchStats();
        });
      }
    } catch (e) { console.error(e); }
    finally { setSavingQ(false); }
  };
  const confirmDeleteQ = (id: number) => {
    setConfirmModal({
      title: "Delete Question?",
      message: "This question will be permanently removed from the question bank.",
      onConfirm: () => {
        setConfirmModal(null);
        setPendingQDeleteIds(prev => [...prev, id]);
        showUndo("Question deleted.", async () => {
          await api.deleteQuestion(id);
          setPendingQDeleteIds(prev => prev.filter(x => x !== id));
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          qc.invalidateQueries({ queryKey: ["adminQuestions"] });
          refetchStats();
          refetchQuestions();
        }, () => {
          setPendingQDeleteIds(prev => prev.filter(x => x !== id));
        });
      },
    });
  };

  // --- Chapter Management ---
  const openAddChapter = () => {
    setEditingChapter(null);
    setChapterForm({ name: "", orderNumber: String((adminChapters?.length ?? 0) + 1) });
    setShowChapterModal(true);
  };
  const openEditChapter = (ch: any) => {
    setEditingChapter(ch);
    setChapterForm({ name: ch.name, orderNumber: String(ch.orderNumber) });
    setShowChapterModal(true);
  };
  const handleSaveChapter = async () => {
    if (!chapterForm.name.trim() || !chapFilterSubjectId) return;
    setSavingChapter(true);
    const wasEditing = editingChapter;
    try {
      if (wasEditing) {
        await api.updateChapter(wasEditing.id, { name: chapterForm.name.trim(), orderNumber: parseInt(chapterForm.orderNumber) || wasEditing.orderNumber });
        showUndo("Chapter updated.", () => {}, async () => {
          await api.updateChapter(wasEditing.id, { name: wasEditing.name, orderNumber: wasEditing.orderNumber });
          refetchAdminChapters();
        });
      } else {
        const created = await api.createChapter({ subjectId: chapFilterSubjectId, name: chapterForm.name.trim(), orderNumber: parseInt(chapterForm.orderNumber) || (adminChapters?.length ?? 0) + 1 });
        showUndo("Chapter created.", () => {}, async () => {
          await api.deleteChapter(created.id);
          refetchAdminChapters();
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchStats();
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-chapters", chapFilterSubjectId] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      refetchAdminChapters();
      refetchStats();
      setShowChapterModal(false);
      setEditingChapter(null);
    } catch (e) { console.error(e); }
    finally { setSavingChapter(false); }
  };
  const handleDeleteChapter = (ch: any) => {
    setConfirmModal({
      title: "Delete Chapter?",
      message: `"${ch.name}" and all its content (videos, notes, MCQs) will be permanently deleted.`,
      onConfirm: () => {
        setConfirmModal(null);
        showUndo(`Chapter "${ch.name}" deleted.`, async () => {
          await api.deleteChapter(ch.id);
          qc.invalidateQueries({ queryKey: ["admin-chapters", chapFilterSubjectId] });
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchAdminChapters();
          refetchStats();
        }, () => {});
      },
    });
  };

  // --- Topic CRUD ---
  const openAddTopic = (chapterId: number) => {
    setEditingTopic(null);
    setTopicForm({ name: "", orderNumber: String((expandedTopics?.length ?? 0) + 1) });
    setExpandedChapterId(chapterId);
    setShowTopicModal(true);
  };
  const openEditTopic = (t: any) => {
    setEditingTopic(t);
    setTopicForm({ name: t.name, orderNumber: String(t.orderNumber ?? 1) });
    setShowTopicModal(true);
  };
  const handleSaveTopic = async () => {
    if (!topicForm.name.trim() || !expandedChapterId) return;
    setSavingTopic(true);
    try {
      if (editingTopic) {
        await api.updateTopic(editingTopic.id, { name: topicForm.name.trim(), orderNumber: parseInt(topicForm.orderNumber) || editingTopic.orderNumber });
      } else {
        await api.createTopic({ chapterId: expandedChapterId, name: topicForm.name.trim(), orderNumber: parseInt(topicForm.orderNumber) || (expandedTopics?.length ?? 0) + 1 });
        qc.invalidateQueries({ queryKey: ["adminStats"] });
        qc.invalidateQueries({ queryKey: ["admin-chapters", chapFilterSubjectId] });
        refetchStats();
        refetchAdminChapters();
      }
      qc.invalidateQueries({ queryKey: ["chapter-topics", expandedChapterId] });
      refetchExpandedTopics();
      setShowTopicModal(false);
      setEditingTopic(null);
    } catch (e) { console.error(e); }
    finally { setSavingTopic(false); }
  };
  const handleDeleteTopic = (t: any) => {
    setConfirmModal({
      title: "Delete Topic?",
      message: `"${t.name}" and all its MCQ questions will be permanently deleted.`,
      onConfirm: () => {
        setConfirmModal(null);
        showUndo(`Topic "${t.name}" deleted.`, async () => {
          await api.deleteTopic(t.id);
          qc.invalidateQueries({ queryKey: ["chapter-topics", expandedChapterId] });
          qc.invalidateQueries({ queryKey: ["admin-chapters", chapFilterSubjectId] });
          qc.invalidateQueries({ queryKey: ["adminStats"] });
          refetchExpandedTopics();
          refetchAdminChapters();
          refetchStats();
        }, () => {});
      },
    });
  };
  const handleToggleChapter = async (ch: any) => {
    try {
      await api.toggleChapterActive(ch.id, !ch.isActive);
      qc.invalidateQueries({ queryKey: ["admin-chapters", chapFilterSubjectId] });
      refetchAdminChapters();
      showUndo(`Chapter ${!ch.isActive ? "published" : "hidden"}.`, () => {}, async () => {
        await api.toggleChapterActive(ch.id, ch.isActive);
        refetchAdminChapters();
      });
    } catch (e) { console.error(e); }
  };

  // --- Import MCQs ---
  const openImport = () => { setImportState("idle"); setImportData([]); setImportError(""); setImportResult(0); setShowImportModal(true); };
  const pickImportFile = async () => {
    setImportError("");
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/csv", "text/plain", "*/*"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const FileSystem = await import("expo-file-system");
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const name = (result.assets[0].name ?? "").toLowerCase();
      let parsed: any[] = [];
      if (name.endsWith(".json")) {
        try { parsed = JSON.parse(content); if (!Array.isArray(parsed)) parsed = [parsed]; }
        catch { setImportError("Invalid JSON file. Expected an array of question objects."); return; }
      } else {
        // CSV parse
        const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
        const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));
        const required = ["topicid","questiontext","optiona","optionb","optionc","optiond","correctanswers","explanation"];
        const missing = required.filter(r => !header.includes(r));
        if (missing.length) { setImportError(`CSV missing columns: ${missing.join(", ")}`); return; }
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ""));
          const row: any = {};
          header.forEach((h, idx) => row[h] = vals[idx] ?? "");
          const answers = row["correctanswers"].toUpperCase().split(/[,;|]/).map((a: string) => a.trim()).filter((a: string) => ["A","B","C","D"].includes(a));
          parsed.push({
            topicId: parseInt(row["topicid"]),
            questionText: row["questiontext"],
            optionA: row["optiona"], optionB: row["optionb"], optionC: row["optionc"], optionD: row["optiond"],
            correctAnswers: answers,
            explanation: row["explanation"],
            questionType: answers.length > 1 ? "multiple" : "single",
            difficulty: row["difficulty"] ?? "medium",
          });
        }
      }
      // Validate
      const invalid = parsed.filter(q => !q.topicId || !q.questionText || !q.optionA || !q.correctAnswers?.length);
      if (invalid.length) { setImportError(`${invalid.length} row(s) missing required fields (topicId, questionText, optionA, correctAnswers).`); return; }
      setImportData(parsed);
      setImportState("preview");
    } catch (e: any) { setImportError(e?.message ?? "Failed to read file"); }
  };
  const handleConfirmImport = async () => {
    if (!importData.length) return;
    setImportState("importing");
    try {
      const res = await api.importQuestions(importData);
      setImportResult(res.imported);
      setImportState("done");
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      refetchStats();
      refetchQuestions();
    } catch (e: any) { setImportError(e?.message ?? "Import failed"); setImportState("preview"); }
  };

  // --- Videos CRUD ---
  const openAddVideo = () => { setEditingVideo(null); setVideoForm({ title: "", youtubeUrl: "", description: "" }); setShowVideoModal(true); };
  const openEditVideo = (v: ChapterVideo) => { setEditingVideo(v); setVideoForm({ title: v.title, youtubeUrl: v.youtubeUrl, description: v.description ?? "" }); setShowVideoModal(true); };
  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.youtubeUrl.trim() || !videoFilterChapterId) return;
    setSavingVideo(true);
    try {
      if (editingVideo) {
        await api.updateChapterVideo(editingVideo.id, { title: videoForm.title.trim(), youtubeUrl: videoForm.youtubeUrl.trim(), description: videoForm.description.trim() || undefined });
      } else {
        await api.createChapterVideo({ chapterId: videoFilterChapterId, title: videoForm.title.trim(), youtubeUrl: videoForm.youtubeUrl.trim(), description: videoForm.description.trim() || undefined });
      }
      setShowVideoModal(false);
      refetchVideos();
    } catch (e: any) { } finally { setSavingVideo(false); }
  };
  const handleDeleteVideo = (id: number) => {
    setConfirmModal({
      title: "Delete Video?",
      message: "This video will be permanently removed.",
      onConfirm: async () => {
        setConfirmModal(null);
        await api.deleteChapterVideo(id);
        refetchVideos();
      },
    });
  };

  // --- Notes CRUD ---
  const openAddNote = () => { setEditingNote(null); setNoteForm({ title: "", fileUrl: "", description: "" }); setNoteFileName(""); setShowNoteModal(true); };
  const openEditNote = (n: ChapterNote) => {
    setEditingNote(n);
    setNoteForm({ title: n.title, fileUrl: n.fileUrl, description: n.description ?? "" });
    setNoteFileName(n.fileUrl.startsWith("data:") ? "Uploaded PDF" : n.fileUrl ? "Existing file" : "");
    setShowNoteModal(true);
  };
  const pickNoteFile = async () => {
    setPickingNote(true);
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "*/*"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "application/pdf";
      let dataUri: string;
      if (Platform.OS === "web") {
        // On web, asset.uri is a blob: URL — use FileReader to convert to base64 data URI
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // On native, use expo-file-system
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        dataUri = `data:${mimeType};base64,${base64}`;
      }
      setNoteForm(f => ({ ...f, fileUrl: dataUri }));
      setNoteFileName(asset.name ?? "Uploaded file");
    } catch (e) { console.error("pickNoteFile error:", e); }
    finally { setPickingNote(false); }
  };
  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.fileUrl.trim() || !noteFilterChapterId) return;
    setSavingNote(true);
    try {
      if (editingNote) {
        await api.updateChapterNote(editingNote.id, { title: noteForm.title.trim(), fileUrl: noteForm.fileUrl.trim(), description: noteForm.description.trim() || undefined });
      } else {
        await api.createChapterNote({ chapterId: noteFilterChapterId, title: noteForm.title.trim(), fileUrl: noteForm.fileUrl.trim(), description: noteForm.description.trim() || undefined });
      }
      setShowNoteModal(false);
      refetchNotes();
    } catch (e: any) { } finally { setSavingNote(false); }
  };
  const handleDeleteNote = (id: number) => {
    setConfirmModal({
      title: "Delete Note?",
      message: "This study note will be permanently removed.",
      onConfirm: async () => {
        setConfirmModal(null);
        await api.deleteChapterNote(id);
        refetchNotes();
      },
    });
  };

  const groupedSubjects = (allSubjects ?? []).reduce<Record<string, AdminSubject[]>>((acc, s) => {
    const key = `${s.courseCode} — ${s.courseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const allTabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "programs",  label: "Programs",  icon: "school-outline" },
    { key: "courses",   label: "Courses",   icon: "book-outline" },
    { key: "content",   label: "Content",   icon: "document-text-outline" },
    { key: "students",  label: "Students",  icon: "people-outline" },
    { key: "staff",     label: "Staff",     icon: "people-circle-outline" },
  ];
  // Admin & Teacher: all tabs | TA: content only
  const tabs = isTA
    ? allTabs.filter(t => t.key === "content")
    : allTabs;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isAdminRole ? "Admin Panel" : isTeacher ? "Teacher Panel" : "TA Panel"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {tabs.map(tab => (
            <Pressable key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
              <Ionicons
                name={tab.icon}
                size={19}
                color={activeTab === tab.key ? Colors.light.primary : Colors.light.textMuted}
              />
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>

        {/* PROGRAMS TAB */}
        {activeTab === "programs" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Programs</Text>
              {isAdminRole && (
                <Pressable style={styles.addBtnSmall} onPress={openAddProgram}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.addBtnText}>Add Program</Text>
                </Pressable>
              )}
            </View>

            {/* Summary banner */}
            {!programsLoading && !!programs?.length && (
              <View style={styles.tabSummaryCard}>
                <View style={styles.tabSummaryItem}>
                  <View style={[styles.tabSummaryIcon, { backgroundColor: "#059669" + "20" }]}>
                    <Ionicons name="school" size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.tabSummaryValue}>{programs.length}</Text>
                    <Text style={styles.tabSummaryLabel}>Total Programs</Text>
                  </View>
                </View>
                <View style={styles.tabSummaryDivider} />
                <View style={styles.tabSummaryItem}>
                  <View style={[styles.tabSummaryIcon, { backgroundColor: "#7C3AED" + "20" }]}>
                    <Ionicons name="book" size={18} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={styles.tabSummaryValue}>{programs.reduce((a, p) => a + (p.subjectCount ?? 0), 0)}</Text>
                    <Text style={styles.tabSummaryLabel}>Total Papers</Text>
                  </View>
                </View>
              </View>
            )}

            {programsLoading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={Colors.light.primary} />
              </View>
            ) : !programs?.length ? (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No programs yet</Text>
              </View>
            ) : (
              programs.filter(p => !pendingProgDeleteIds.includes(p.id)).map((prog, idx) => {
                const accentColors = ["#059669", "#7C3AED", "#3B82F6", "#D97706", "#DC2626", "#0891B2"];
                const accent = accentColors[idx % accentColors.length];
                const isExpanded = expandedProgramId === prog.id;
                const progPapers = (allSubjects ?? []).filter(s => s.courseId === prog.id && !pendingPaperDeleteIds.includes(s.id));
                return (
                  <View key={prog.id} style={{ marginBottom: 4 }}>
                    <View style={[styles.programRow, { borderLeftColor: accent, borderLeftWidth: 3, marginBottom: 0 }]}>
                      {isAdminRole && (
                        <View style={styles.reorderBtns}>
                          <Pressable
                            onPress={() => handleReorderCourse(prog.id, "up")}
                            disabled={idx === 0}
                            style={({ pressed }) => ({ opacity: idx === 0 ? 0.2 : pressed ? 0.5 : 1 })}
                          >
                            <Ionicons name="chevron-up" size={16} color={Colors.light.textMuted} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleReorderCourse(prog.id, "down")}
                            disabled={idx === programs.filter(p => !pendingProgDeleteIds.includes(p.id)).length - 1}
                            style={({ pressed }) => ({ opacity: idx === programs.filter(p => !pendingProgDeleteIds.includes(p.id)).length - 1 ? 0.2 : pressed ? 0.5 : 1 })}
                          >
                            <Ionicons name="chevron-down" size={16} color={Colors.light.textMuted} />
                          </Pressable>
                        </View>
                      )}
                      {prog.logo ? (
                        <Image source={{ uri: prog.logo }} style={styles.progLogoThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.progCodeBox, { backgroundColor: accent + "18" }]}>
                          <Text style={[styles.progCode, { color: accent }]}>{prog.code}</Text>
                        </View>
                      )}
                      <Pressable style={{ flex: 1 }} onPress={() => setExpandedProgramId(isExpanded ? null : prog.id)}>
                        <Text style={styles.progName} numberOfLines={1}>{prog.name}</Text>
                        {prog.description ? <Text style={styles.progDesc} numberOfLines={1}>{prog.description}</Text> : null}
                        <View style={styles.progMetaRow}>
                          <Ionicons name="book-outline" size={11} color={Colors.light.textMuted} />
                          <Text style={styles.progMeta}>{prog.subjectCount} course{prog.subjectCount !== 1 ? "s" : ""}</Text>
                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={11} color={Colors.light.textMuted} style={{ marginLeft: 4 }} />
                        </View>
                      </Pressable>
                      {isAdminRole && (
                        <View style={styles.rowActions}>
                          <Pressable
                            style={[styles.toggleIconBtn, { backgroundColor: prog.isActive ? "#DCFCE7" : "#FEE2E2" }]}
                            onPress={() => handleToggleCourse(prog.id, prog.isActive)}
                          >
                            <Ionicons name={prog.isActive ? "eye" : "eye-off"} size={15} color={prog.isActive ? "#059669" : "#DC2626"} />
                          </Pressable>
                          <Pressable style={styles.editIconBtn} onPress={() => openEditProgram(prog)}>
                            <Ionicons name="pencil" size={15} color={Colors.light.primary} />
                          </Pressable>
                          <Pressable style={styles.deleteIconBtn} onPress={() => confirmDelete(prog.id)}>
                            <Ionicons name="trash" size={15} color={Colors.light.error} />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* Expandable Courses Section */}
                    {isExpanded && (
                      <View style={styles.papersSection}>
                        <View style={styles.papersSectionHeader}>
                          <Text style={styles.papersSectionTitle}>Courses</Text>
                          <Pressable style={styles.addPaperBtn} onPress={() => openAddPaper(prog.id)}>
                            <Ionicons name="add" size={14} color="#FFF" />
                            <Text style={styles.addPaperBtnText}>Add Course</Text>
                          </Pressable>
                        </View>
                        {progPapers.length === 0 ? (
                          <View style={styles.papersEmpty}>
                            <Text style={styles.papersEmptyText}>No courses yet. Tap "Add Course" to create one.</Text>
                          </View>
                        ) : (
                          progPapers.map(paper => (
                            <View key={paper.id} style={styles.paperRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.courseCodeLarge, { color: paper.isActive ? Colors.light.primary : Colors.light.textMuted }]}>{paper.code}</Text>
                                <Text style={[styles.courseNameSub, !paper.isActive && { color: Colors.light.textMuted }]} numberOfLines={1}>{paper.name}</Text>
                              </View>
                              {!paper.isActive && (
                                <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Off</Text></View>
                              )}
                              <View style={styles.paperActions}>
                                <Pressable
                                  style={[styles.toggleIconBtn, { backgroundColor: paper.isActive ? "#DCFCE7" : "#FEE2E2" }]}
                                  onPress={() => handleToggleSubject(paper.id, paper.isActive)}
                                >
                                  <Ionicons name={paper.isActive ? "eye" : "eye-off"} size={13} color={paper.isActive ? "#059669" : "#DC2626"} />
                                </Pressable>
                                <Pressable style={styles.editIconBtn} onPress={() => openEditPaper(paper)}>
                                  <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                                </Pressable>
                                <Pressable style={styles.deleteIconBtn} onPress={() => confirmDeletePaper(paper)}>
                                  <Ionicons name="trash" size={13} color={Colors.light.error} />
                                </Pressable>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

          </View>
        )}

        {/* COURSES TAB */}
        {activeTab === "courses" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Courses</Text>
              {!!coursesTabProgramId && (
                <Pressable style={styles.addBtnSmall} onPress={() => openAddPaper(coursesTabProgramId)}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.addBtnText}>Add Course</Text>
                </Pressable>
              )}
            </View>

            {/* Program filter */}
            {programsLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 12 }} /> : (
              <>
                <View style={styles.filterRow}>
                  <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
                  <Text style={styles.filterLabel}>Filter by program:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                  {(programs ?? []).map(p => (
                    <Pressable key={p.id}
                      style={[styles.filterChip, coursesTabProgramId === p.id && styles.filterChipActive]}
                      onPress={() => setCoursesTabProgramId(prev => prev === p.id ? null : p.id)}>
                      <Text style={[styles.filterChipText, coursesTabProgramId === p.id && styles.filterChipTextActive]}>{p.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Course list */}
            {(() => {
              const filtered = (allSubjects ?? []).filter(s =>
                !pendingPaperDeleteIds.includes(s.id) &&
                (coursesTabProgramId ? s.courseId === coursesTabProgramId : true)
              );
              if (!allSubjects) return <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} />;
              if (filtered.length === 0) return (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={Colors.light.textMuted} />
                  <Text style={styles.emptyText}>
                    {coursesTabProgramId ? "No courses yet. Tap \"Add Course\" to create one." : "No courses yet. Add programs first, then add courses."}
                  </Text>
                </View>
              );
              if (!coursesTabProgramId) {
                return (programs ?? []).map(prog => {
                  const progCourses = filtered.filter(s => s.courseId === prog.id);
                  if (!progCourses.length) return null;
                  return (
                    <View key={prog.id} style={{ marginBottom: 6 }}>
                      <Text style={styles.courseGroupHeader}>{prog.name}</Text>
                      {progCourses.map(paper => (
                        <View key={paper.id} style={styles.paperRowFull}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.courseCodeLarge, { color: paper.isActive ? Colors.light.primary : Colors.light.textMuted }]}>{paper.code}</Text>
                            <Text style={[styles.courseNameSub, !paper.isActive && { color: Colors.light.textMuted }]} numberOfLines={1}>{paper.name}</Text>
                          </View>
                          {!paper.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Off</Text></View>}
                          <View style={styles.paperActions}>
                            <Pressable style={[styles.toggleIconBtn, { backgroundColor: paper.isActive ? "#DCFCE7" : "#FEE2E2" }]} onPress={() => handleToggleSubject(paper.id, paper.isActive)}>
                              <Ionicons name={paper.isActive ? "eye" : "eye-off"} size={13} color={paper.isActive ? "#059669" : "#DC2626"} />
                            </Pressable>
                            <Pressable style={styles.editIconBtn} onPress={() => openEditPaper(paper)}>
                              <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                            </Pressable>
                            <Pressable style={styles.deleteIconBtn} onPress={() => confirmDeletePaper(paper)}>
                              <Ionicons name="trash" size={13} color={Colors.light.error} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                });
              }
              return filtered.map(paper => (
                <View key={paper.id} style={styles.paperRowFull}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courseCodeLarge, { color: paper.isActive ? Colors.light.primary : Colors.light.textMuted }]}>{paper.code}</Text>
                    <Text style={[styles.courseNameSub, !paper.isActive && { color: Colors.light.textMuted }]} numberOfLines={1}>{paper.name}</Text>
                  </View>
                  {!paper.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Off</Text></View>}
                  <View style={styles.paperActions}>
                    <Pressable style={[styles.toggleIconBtn, { backgroundColor: paper.isActive ? "#DCFCE7" : "#FEE2E2" }]} onPress={() => handleToggleSubject(paper.id, paper.isActive)}>
                      <Ionicons name={paper.isActive ? "eye" : "eye-off"} size={13} color={paper.isActive ? "#059669" : "#DC2626"} />
                    </Pressable>
                    <Pressable style={styles.editIconBtn} onPress={() => openEditPaper(paper)}>
                      <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                    </Pressable>
                    <Pressable style={styles.deleteIconBtn} onPress={() => confirmDeletePaper(paper)}>
                      <Ionicons name="trash" size={13} color={Colors.light.error} />
                    </Pressable>
                  </View>
                </View>
              ));
            })()}
          </View>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Students</Text>
              <Pressable style={styles.addBtnSmall} onPress={openAddStudent}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addBtnText}>Add Student</Text>
              </Pressable>
            </View>

            {/* Summary banner */}
            {!studentsLoading && !!students?.length && (
              <View style={styles.tabSummaryCard}>
                <View style={styles.tabSummaryItem}>
                  <View style={[styles.tabSummaryIcon, { backgroundColor: "#3B82F6" + "20" }]}>
                    <Ionicons name="people" size={18} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.tabSummaryValue}>{students.length}</Text>
                    <Text style={styles.tabSummaryLabel}>Registered</Text>
                  </View>
                </View>
                <View style={styles.tabSummaryDivider} />
                <View style={styles.tabSummaryItem}>
                  <View style={[styles.tabSummaryIcon, { backgroundColor: "#059669" + "20" }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.tabSummaryValue}>{students.reduce((a, s) => a + s.purchasedSubjects.length, 0)}</Text>
                    <Text style={styles.tabSummaryLabel}>Courses Assigned</Text>
                  </View>
                </View>
              </View>
            )}

            {studentsLoading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={Colors.light.primary} />
              </View>
            ) : !students?.length ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No students registered yet</Text>
              </View>
            ) : (
              students.map(student => (
                <View key={student.id} style={[styles.studentCard, { borderLeftWidth: 3, borderLeftColor: student.isBlocked ? Colors.light.error : Colors.light.primary }]}>
                  <View style={styles.studentHeader}>
                    <View style={[styles.avatarCircle, student.isBlocked && { backgroundColor: Colors.light.error + "20" }]}>
                      <Text style={[styles.avatarText, student.isBlocked && { color: Colors.light.error }]}>{student.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        {student.isBlocked && (
                          <View style={styles.blockedBadge}><Text style={styles.blockedBadgeText}>Blocked</Text></View>
                        )}
                      </View>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                      {student.whatsappNumber && (
                        <Text style={styles.studentPhone}>+{student.whatsappNumber}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: "column", gap: 4 }}>
                      <Pressable style={styles.assignBtn} onPress={() => { setSelectedStudent(student); setShowEnrollModal(true); }}>
                        <Ionicons name="add" size={14} color="#FFF" />
                        <Text style={styles.assignBtnText}>Assign</Text>
                      </Pressable>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable style={styles.editIconBtn} onPress={() => openEditStudent(student)}>
                          <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                        </Pressable>
                        <Pressable
                          style={[styles.editIconBtn, { backgroundColor: "#FEF3C7" }]}
                          onPress={() => { setResetPwdStudent(student); setResetPwdValue(""); setResetPwdError(""); setResetPwdShow(false); }}
                        >
                          <Ionicons name="key-outline" size={13} color="#D97706" />
                        </Pressable>
                        <Pressable
                          style={[styles.toggleIconBtn, { backgroundColor: student.isBlocked ? "#DCFCE7" : "#FEE2E2" }]}
                          onPress={() => handleToggleBlockStudent(student)}
                        >
                          <Ionicons name={student.isBlocked ? "lock-open" : "ban"} size={13} color={student.isBlocked ? "#059669" : Colors.light.error} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  <View style={styles.studentPapersRow}>
                    <Ionicons name="book-outline" size={12} color={Colors.light.textMuted} />
                    <Text style={styles.studentPapersLabel}>
                      {student.purchasedSubjects.length === 0 ? "No courses assigned" : `${student.purchasedSubjects.length} course${student.purchasedSubjects.length !== 1 ? "s" : ""} assigned`}
                    </Text>
                  </View>
                  {student.purchasedSubjects.filter(p => !pendingRevokeIds.some(r => r.studentId === student.id && r.subjectId === p.subjectId)).length > 0 && (
                    <View style={styles.chipsWrap}>
                      {student.purchasedSubjects
                        .filter(p => !pendingRevokeIds.some(r => r.studentId === student.id && r.subjectId === p.subjectId))
                        .map(p => (
                        <View key={p.subjectId} style={styles.paperChip}>
                          <Text style={styles.paperChipText}>{p.subjectCode}</Text>
                          <Pressable onPress={() => handleRevokePaper(student, p.subjectId, p.subjectCode)} hitSlop={8}>
                            <Ionicons name="close-circle" size={15} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* STAFF TAB */}
        {activeTab === "staff" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Staff Members</Text>
              <Pressable style={styles.addBtnSmall} onPress={openAddStaff}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addBtnText}>Add Staff</Text>
              </Pressable>
            </View>

            {/* Role legend */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#7C3AED18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Ionicons name="school" size={13} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#7C3AED" }}>Teacher — full access (no program management)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#0891B218", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Ionicons name="people" size={13} color="#0891B2" />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#0891B2" }}>Teacher Assistant — content & MCQs only</Text>
              </View>
            </View>

            {staffLoading ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}><ActivityIndicator color={Colors.light.primary} /></View>
            ) : !staffList?.length ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-circle-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No staff members yet. Add a teacher or teaching assistant.</Text>
              </View>
            ) : (
              staffList.map((s: any) => {
                const isTeacherRole = s.role === "teacher";
                const roleColor = isTeacherRole ? "#7C3AED" : "#0891B2";
                const roleLabel = isTeacherRole ? "Teacher" : "Teacher Assistant";
                return (
                  <View key={s.id} style={[styles.studentCard, { borderLeftWidth: 3, borderLeftColor: s.isBlocked ? Colors.light.error : roleColor }]}>
                    <View style={styles.studentHeader}>
                      <View style={[styles.avatarCircle, { backgroundColor: roleColor + "20" }, s.isBlocked && { backgroundColor: Colors.light.error + "20" }]}>
                        <Text style={[styles.avatarText, { color: roleColor }, s.isBlocked && { color: Colors.light.error }]}>{s.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={styles.studentName}>{s.name}</Text>
                          <View style={{ backgroundColor: roleColor + "18", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: roleColor }}>{roleLabel}</Text>
                          </View>
                          {s.isBlocked && (
                            <View style={styles.blockedBadge}><Text style={styles.blockedBadgeText}>Blocked</Text></View>
                          )}
                        </View>
                        <Text style={styles.studentEmail}>{s.email}</Text>
                        {s.whatsappNumber && <Text style={styles.studentPhone}>+{s.whatsappNumber}</Text>}
                      </View>
                      <View style={{ flexDirection: "column", gap: 4 }}>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <Pressable style={styles.editIconBtn} onPress={() => openEditStaff(s)}>
                            <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                          </Pressable>
                          <Pressable
                            style={[styles.editIconBtn, { backgroundColor: "#FEF3C7" }]}
                            onPress={() => { setResetStaffPwd(s); setResetStaffPwdValue(""); setResetStaffPwdError(""); setResetStaffPwdShow(false); }}
                          >
                            <Ionicons name="key-outline" size={13} color="#D97706" />
                          </Pressable>
                          <Pressable
                            style={[styles.toggleIconBtn, { backgroundColor: s.isBlocked ? "#DCFCE7" : "#FEE2E2" }]}
                            onPress={() => handleToggleBlockStaff(s)}
                          >
                            <Ionicons name={s.isBlocked ? "lock-open" : "ban"} size={13} color={s.isBlocked ? "#059669" : Colors.light.error} />
                          </Pressable>
                          <Pressable style={styles.deleteIconBtn} onPress={() => handleDeleteStaff(s)}>
                            <Ionicons name="trash" size={13} color={Colors.light.error} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.studentPapersRow, { marginTop: 4 }]}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.light.textMuted} />
                      <Text style={styles.studentPapersLabel}>Joined {new Date(s.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* CONTENT TAB */}
        {activeTab === "content" && (
          <View style={styles.section}>

            {/* Content sub-tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.contentSubTabs, { gap: 8, paddingHorizontal: 0 }]}>
              {([
                { key: "chapters" as const,  label: "Chapters",  icon: "list-outline" },
                { key: "videos" as const,    label: "Videos",    icon: "play-circle-outline" },
                { key: "notes" as const,     label: "Notes",     icon: "document-text-outline" },
                { key: "practice" as const,  label: "Practice",  icon: "help-circle-outline" },
              ]).map(st => (
                <Pressable
                  key={st.key}
                  style={[styles.contentSubTab, { minWidth: 80 }, contentSubTab === st.key && styles.contentSubTabActive]}
                  onPress={() => setContentSubTab(st.key)}
                >
                  <Ionicons name={st.icon as any} size={14} color={contentSubTab === st.key ? Colors.light.primary : Colors.light.textMuted} />
                  <Text style={[styles.contentSubTabText, contentSubTab === st.key && styles.contentSubTabTextActive]}>{st.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Chapters sub-section */}
            {contentSubTab === "chapters" && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Chapter Management</Text>
                  {!!chapFilterSubjectId && (
                    <Pressable style={styles.addBtnSmall} onPress={openAddChapter}>
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.addBtnText}>Add Chapter</Text>
                    </Pressable>
                  )}
                </View>

                {/* Course filter */}
                <View style={styles.filterRow}>
                  <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
                  <Text style={styles.filterLabel}>Select a course to manage chapters:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                  {(allSubjects ?? []).map(s => (
                    <Pressable
                      key={s.id}
                      style={[styles.filterChip, chapFilterSubjectId === s.id && styles.filterChipActive]}
                      onPress={() => setChapFilterSubjectId(s.id)}
                    >
                      <Text style={[styles.filterChipText, chapFilterSubjectId === s.id && styles.filterChipTextActive]}>{s.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {!chapFilterSubjectId ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="list-outline" size={48} color={Colors.light.textMuted} />
                    <Text style={styles.emptyText}>Select a course above to view and manage its chapters</Text>
                  </View>
                ) : adminChaptersLoading ? (
                  <View style={{ paddingTop: 30, alignItems: "center" }}>
                    <ActivityIndicator color={Colors.light.primary} />
                  </View>
                ) : !adminChapters?.length ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="book-outline" size={48} color={Colors.light.textMuted} />
                    <Text style={styles.emptyText}>No chapters yet. Add the first chapter.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.qCount}>{adminChapters.length} chapter{adminChapters.length !== 1 ? "s" : ""}</Text>
                    {adminChapters.map((ch: any, idx: number) => {
                      const isExpanded = expandedChapterId === ch.id;
                      return (
                        <View key={ch.id}>
                          <View style={[styles.chapterAdminRow, !ch.isActive && styles.chapterAdminRowInactive]}>
                            <Pressable
                              style={styles.chapterAdminLeft}
                              onPress={() => setExpandedChapterId(isExpanded ? null : ch.id)}
                            >
                              <View style={styles.chapterOrderBadge}>
                                <Text style={styles.chapterOrderText}>{idx + 1}</Text>
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={[styles.chapterAdminName, !ch.isActive && { color: Colors.light.textMuted }]} numberOfLines={1}>{ch.name}</Text>
                                  {!ch.isActive && (
                                    <View style={styles.hiddenBadge}><Text style={styles.hiddenBadgeText}>Hidden</Text></View>
                                  )}
                                </View>
                                <Text style={styles.chapterAdminMeta}>{ch.topicCount ?? 0} topic{ch.topicCount !== 1 ? "s" : ""} · tap to manage</Text>
                              </View>
                              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.light.textMuted} style={{ marginRight: 4 }} />
                            </Pressable>
                            <View style={styles.chapterAdminActions}>
                              <Pressable
                                style={[styles.toggleIconBtn, { backgroundColor: ch.isActive ? "#FEF9C3" : "#DCFCE7" }]}
                                onPress={() => handleToggleChapter(ch)}
                              >
                                <Ionicons name={ch.isActive ? "eye-off-outline" : "eye-outline"} size={14} color={ch.isActive ? "#D97706" : "#059669"} />
                              </Pressable>
                              <Pressable style={styles.editIconBtn} onPress={() => openEditChapter(ch)}>
                                <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                              </Pressable>
                              <Pressable style={styles.deleteIconBtn} onPress={() => handleDeleteChapter(ch)}>
                                <Ionicons name="trash" size={13} color={Colors.light.error} />
                              </Pressable>
                            </View>
                          </View>

                          {/* ── Inline Topic Management ── */}
                          {isExpanded && (
                            <View style={styles.topicPanel}>
                              <View style={styles.topicPanelHeader}>
                                <Text style={styles.topicPanelTitle}>Topics in "{ch.name}"</Text>
                                <Pressable style={styles.addTopicBtn} onPress={() => openAddTopic(ch.id)}>
                                  <Ionicons name="add" size={14} color="#FFF" />
                                  <Text style={styles.addTopicBtnText}>Add Topic</Text>
                                </Pressable>
                              </View>
                              {!expandedTopics ? (
                                <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 12 }} />
                              ) : expandedTopics.length === 0 ? (
                                <View style={styles.topicEmptyState}>
                                  <Ionicons name="file-tray-outline" size={32} color={Colors.light.textMuted} />
                                  <Text style={styles.topicEmptyText}>No topics yet. Add one to start adding MCQs.</Text>
                                </View>
                              ) : (
                                <TopicReorderList
                                  topics={expandedTopics}
                                  onReorder={async (orderedIds) => {
                                    qc.setQueryData(["chapter-topics", expandedChapterId], (old: any[]) =>
                                      orderedIds.map(id => old.find((t: any) => t.id === id))
                                    );
                                    await api.reorderTopics(orderedIds);
                                    qc.invalidateQueries({ queryKey: ["chapter-topics", expandedChapterId] });
                                  }}
                                  onEdit={openEditTopic}
                                  onDelete={handleDeleteTopic}
                                />
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* Practice (MCQs) sub-section */}
            {contentSubTab === "practice" && (<>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>MCQ Questions</Text>
              {!!mcqFilterChapterId && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={[styles.addBtnSmall, { backgroundColor: "#7C3AED" }]} onPress={openImport}>
                    <Ionicons name="cloud-upload-outline" size={15} color="#FFF" />
                    <Text style={styles.addBtnText}>Import</Text>
                  </Pressable>
                  <Pressable style={styles.addBtnSmall} onPress={openAddQuestion}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.addBtnText}>Add MCQ</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Course filter */}
            <View style={styles.filterRow}>
              <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
              <Text style={styles.filterLabel}>Select course:</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {(allSubjects ?? []).map(s => (
                <Pressable
                  key={s.id}
                  style={[styles.filterChip, mcqFilterSubjectId === s.id && styles.filterChipActive]}
                  onPress={() => { setMcqFilterSubjectId(s.id); setMcqFilterChapterId(null); }}
                >
                  <Text style={[styles.filterChipText, mcqFilterSubjectId === s.id && styles.filterChipTextActive]}>{s.code}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {mcqFilterSubjectId && (
              <>
                <View style={styles.filterRow}>
                  <Ionicons name="layers-outline" size={14} color={Colors.light.textMuted} />
                  <Text style={styles.filterLabel}>Select chapter:</Text>
                </View>
                {mcqChaptersLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginBottom: 8 }} /> : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                    {(mcqChapters ?? []).map((ch: any) => (
                      <Pressable key={ch.id} style={[styles.filterChip, mcqFilterChapterId === ch.id && styles.filterChipActive]}
                        onPress={() => setMcqFilterChapterId(ch.id)}>
                        <Text style={[styles.filterChipText, mcqFilterChapterId === ch.id && styles.filterChipTextActive]}>Ch {ch.orderNumber}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {!mcqFilterChapterId ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>
                  {!mcqFilterSubjectId ? "Select a course to manage MCQs" : "Select a chapter to view and add MCQs"}
                </Text>
              </View>
            ) : questionsLoading ? (
              <View style={{ paddingTop: 30, alignItems: "center" }}>
                <ActivityIndicator color={Colors.light.primary} />
              </View>
            ) : !adminQuestions?.length ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No questions for this chapter yet</Text>
              </View>
            ) : (
              <>
                <Text style={styles.qCount}>{adminQuestions.filter((q: any) => !pendingQDeleteIds.includes(q.id)).length} question{adminQuestions.filter((q: any) => !pendingQDeleteIds.includes(q.id)).length !== 1 ? "s" : ""}</Text>
                {adminQuestions.filter((q: any) => !pendingQDeleteIds.includes(q.id)).map((q, idx) => (
                  <View key={q.id} style={styles.qCard}>
                    <View style={styles.qCardHeader}>
                      <View style={styles.qNumBadge}>
                        <Text style={styles.qNumText}>#{idx + 1}</Text>
                      </View>
                      <Text style={styles.qTopicTag} numberOfLines={1}>{(q as any).topicName ?? `Topic ${q.topicId}`}</Text>
                      <View style={[styles.qTypeBadge, q.questionType === "multiple" ? styles.qTypeMultiple : styles.qTypeSingle]}>
                        <Text style={styles.qTypeText}>{q.questionType === "multiple" ? "Multi" : "Single"}</Text>
                      </View>
                      <View style={[styles.diffBadge,
                        (q as any).difficulty === "easy" ? styles.diffEasy :
                        (q as any).difficulty === "hard" ? styles.diffHard : styles.diffMedium
                      ]}>
                        <Text style={styles.diffText}>{(q as any).difficulty ?? "medium"}</Text>
                      </View>
                      <Pressable style={styles.editIconBtn} onPress={() => openEditQuestion(q)}>
                        <Ionicons name="pencil" size={14} color={Colors.light.primary} />
                      </Pressable>
                      <Pressable style={styles.deleteIconBtn} onPress={() => confirmDeleteQ(q.id)}>
                        <Ionicons name="trash" size={14} color={Colors.light.error} />
                      </Pressable>
                    </View>
                    <Text style={styles.qText} numberOfLines={2}>{q.questionText}</Text>
                    <View style={styles.qOptions}>
                      {(["A","B","C","D"] as const).map(opt => {
                        const text = q[`option${opt}` as keyof typeof q] as string;
                        const isCorrect = q.correctAnswers.includes(opt);
                        return (
                          <View key={opt} style={[styles.qOpt, isCorrect && styles.qOptCorrect]}>
                            <Text style={[styles.qOptLabel, isCorrect && styles.qOptLabelCorrect]}>{opt}</Text>
                            <Text style={[styles.qOptText, isCorrect && styles.qOptTextCorrect]} numberOfLines={1}>{text}</Text>
                            {isCorrect && <Ionicons name="checkmark-circle" size={13} color={Colors.light.success} />}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            )}
            </>)}

            {/* Videos sub-section */}
            {contentSubTab === "videos" && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Video Lectures</Text>
                  {!!videoFilterChapterId && (
                    <Pressable style={styles.addBtnSmall} onPress={openAddVideo}>
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.addBtnText}>Add Video</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.filterRow}>
                  <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
                  <Text style={styles.filterLabel}>Select course:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                  {(allSubjects ?? []).map(s => (
                    <Pressable key={s.id} style={[styles.filterChip, videoFilterSubjectId === s.id && styles.filterChipActive]}
                      onPress={() => { setVideoFilterSubjectId(s.id); setVideoFilterChapterId(null); }}>
                      <Text style={[styles.filterChipText, videoFilterSubjectId === s.id && styles.filterChipTextActive]}>{s.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {videoFilterSubjectId && (
                  <>
                    <View style={styles.filterRow}>
                      <Ionicons name="layers-outline" size={14} color={Colors.light.textMuted} />
                      <Text style={styles.filterLabel}>Select chapter:</Text>
                    </View>
                    {videoChaptersLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginBottom: 8 }} /> : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                        {(videoChapters ?? []).map(ch => (
                          <Pressable key={ch.id} style={[styles.filterChip, videoFilterChapterId === ch.id && styles.filterChipActive]}
                            onPress={() => setVideoFilterChapterId(ch.id)}>
                            <Text style={[styles.filterChipText, videoFilterChapterId === ch.id && styles.filterChipTextActive]}>Ch {ch.orderNumber}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
                {videoFilterChapterId && (
                  chapterVideosLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} /> :
                  !chapterVideos?.length ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="play-circle-outline" size={40} color={Colors.light.textMuted} />
                      <Text style={styles.emptyText}>No videos for this chapter</Text>
                    </View>
                  ) : (
                    chapterVideos.map(v => (
                      <View key={v.id} style={styles.videoAdminRow}>
                        <View style={styles.videoAdminIcon}>
                          <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.videoAdminTitle} numberOfLines={1}>{v.title}</Text>
                          <Text style={styles.videoAdminUrl} numberOfLines={1}>{v.youtubeUrl}</Text>
                        </View>
                        <Pressable style={styles.editIconBtn} onPress={() => openEditVideo(v)}>
                          <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                        </Pressable>
                        <Pressable style={styles.deleteIconBtn} onPress={() => handleDeleteVideo(v.id)}>
                          <Ionicons name="trash" size={13} color={Colors.light.error} />
                        </Pressable>
                      </View>
                    ))
                  )
                )}
                {!videoFilterSubjectId && (
                  <View style={styles.emptyState}>
                    <Ionicons name="play-circle-outline" size={48} color={Colors.light.textMuted} />
                    <Text style={styles.emptyText}>Select a course to manage videos</Text>
                  </View>
                )}
              </>
            )}

            {/* Notes sub-section */}
            {contentSubTab === "notes" && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Study Notes</Text>
                  {!!noteFilterChapterId && (
                    <Pressable style={styles.addBtnSmall} onPress={openAddNote}>
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.addBtnText}>Add Notes</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.filterRow}>
                  <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
                  <Text style={styles.filterLabel}>Select course:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                  {(allSubjects ?? []).map(s => (
                    <Pressable key={s.id} style={[styles.filterChip, noteFilterSubjectId === s.id && styles.filterChipActive]}
                      onPress={() => { setNoteFilterSubjectId(s.id); setNoteFilterChapterId(null); }}>
                      <Text style={[styles.filterChipText, noteFilterSubjectId === s.id && styles.filterChipTextActive]}>{s.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {noteFilterSubjectId && (
                  <>
                    <View style={styles.filterRow}>
                      <Ionicons name="layers-outline" size={14} color={Colors.light.textMuted} />
                      <Text style={styles.filterLabel}>Select chapter:</Text>
                    </View>
                    {noteChaptersLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginBottom: 8 }} /> : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                        {(noteChapters ?? []).map(ch => (
                          <Pressable key={ch.id} style={[styles.filterChip, noteFilterChapterId === ch.id && styles.filterChipActive]}
                            onPress={() => setNoteFilterChapterId(ch.id)}>
                            <Text style={[styles.filterChipText, noteFilterChapterId === ch.id && styles.filterChipTextActive]}>Ch {ch.orderNumber}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
                {noteFilterChapterId && (
                  chapterNotesLoading ? <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} /> :
                  !chapterNotes?.length ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="document-text-outline" size={40} color={Colors.light.textMuted} />
                      <Text style={styles.emptyText}>No notes for this chapter</Text>
                    </View>
                  ) : (
                    chapterNotes.map(n => (
                      <View key={n.id} style={styles.videoAdminRow}>
                        <View style={[styles.videoAdminIcon, { backgroundColor: "#FEE2E2" }]}>
                          <Ionicons name="document-text" size={18} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.videoAdminTitle} numberOfLines={1}>{n.title}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Ionicons name="document-attach" size={11} color={Colors.light.textMuted} />
                            <Text style={styles.videoAdminUrl} numberOfLines={1}>
                              {n.fileUrl.startsWith("data:") ? "PDF uploaded" : n.fileUrl || "No file"}
                            </Text>
                          </View>
                        </View>
                        <Pressable style={styles.editIconBtn} onPress={() => openEditNote(n)}>
                          <Ionicons name="pencil" size={13} color={Colors.light.primary} />
                        </Pressable>
                        <Pressable style={styles.deleteIconBtn} onPress={() => handleDeleteNote(n.id)}>
                          <Ionicons name="trash" size={13} color={Colors.light.error} />
                        </Pressable>
                      </View>
                    ))
                  )
                )}
                {!noteFilterSubjectId && (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={Colors.light.textMuted} />
                    <Text style={styles.emptyText}>Select a course to manage notes</Text>
                  </View>
                )}
              </>
            )}

          </View>
        )}
      </ScrollView>

      {/* ── Add / Edit Program Modal ── */}
      <Modal visible={showProgramModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProgramModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingProgram ? "Edit Program" : "Add Program"}</Text>
            <Pressable onPress={() => setShowProgramModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">

            {/* Logo Picker */}
            <View style={styles.logoPickerSection}>
              <Pressable style={styles.logoPickerBox} onPress={pickLogo}>
                {programForm.logo ? (
                  <Image source={{ uri: programForm.logo }} style={styles.logoPreview} contentFit="cover" />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="image-outline" size={28} color={Colors.light.textMuted} />
                    <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
                  </View>
                )}
              </Pressable>
              {programForm.logo ? (
                <View style={styles.logoActions}>
                  <Pressable style={styles.logoChangeBtn} onPress={pickLogo}>
                    <Ionicons name="camera-outline" size={14} color={Colors.light.primary} />
                    <Text style={styles.logoChangeBtnText}>Change</Text>
                  </Pressable>
                  <Pressable style={styles.logoRemoveBtn} onPress={() => setProgramForm(f => ({ ...f, logo: "" }))}>
                    <Ionicons name="trash-outline" size={14} color={Colors.light.error} />
                    <Text style={styles.logoRemoveBtnText}>Remove</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Program Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={programForm.name}
                onChangeText={v => setProgramForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Association of Chartered Certified Accountants"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Code <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={programForm.code}
                onChangeText={v => setProgramForm(f => ({ ...f, code: v.toUpperCase() }))}
                placeholder="e.g. ACCA"
                placeholderTextColor={Colors.light.textMuted}
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={programForm.description}
                onChangeText={v => setProgramForm(f => ({ ...f, description: v }))}
                placeholder="Brief description of the program..."
                placeholderTextColor={Colors.light.textMuted}
                multiline
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (!programForm.name.trim() || !programForm.code.trim()) && styles.saveBtnDisabled,
                { opacity: pressed || savingProgram ? 0.85 : 1 }
              ]}
              onPress={handleSaveProgram}
              disabled={savingProgram || !programForm.name.trim() || !programForm.code.trim()}
            >
              {savingProgram
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.saveBtnText}>{editingProgram ? "Save Changes" : "Create Program"}</Text>
              }
            </Pressable>
          </ScrollView>
        </View>
      </Modal>


      {/* ── Assign Course Modal ── */}
      <Modal visible={showEnrollModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowEnrollModal(false); setSelectedStudent(null); }}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Assign Course Access</Text>
            <Pressable onPress={() => { setShowEnrollModal(false); setSelectedStudent(null); }}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          {selectedStudent && (
            <View style={styles.selectedStudentBanner}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{selectedStudent.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.studentName}>{selectedStudent.name}</Text>
                <Text style={styles.studentEmail}>{selectedStudent.email}</Text>
              </View>
            </View>
          )}
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 6, paddingBottom: Math.max(insets.bottom + 20, 40) }}>
            {!allSubjects ? <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} /> : (
              Object.entries(groupedSubjects).map(([group, subjects]) => (
                <View key={group}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  {subjects.map(subject => {
                    const assigned = selectedStudent?.purchasedSubjects.some(p => p.subjectId === subject.id);
                    return (
                      <Pressable
                        key={subject.id}
                        style={[styles.subjectPickItem, assigned && styles.subjectPickItemDisabled]}
                        onPress={() => !assigned && handleAssignPaper(subject.id)}
                        disabled={assigned || savingEnroll}
                      >
                        <View style={[styles.pickCodeTag, { backgroundColor: assigned ? "#F3F4F6" : Colors.light.primary + "14" }]}>
                          <Text style={[styles.pickCodeText, { color: assigned ? Colors.light.textMuted : Colors.light.primary }]}>{subject.code}</Text>
                        </View>
                        <Text style={[styles.pickSubjectName, assigned && { color: Colors.light.textMuted }]} numberOfLines={1}>{subject.name}</Text>
                        {assigned ? (
                          <View style={styles.alreadyChip}><Ionicons name="checkmark-circle" size={13} color="#059669" /><Text style={styles.alreadyText}>Assigned</Text></View>
                        ) : (
                          <View style={styles.addChip}><Ionicons name="add" size={13} color={Colors.light.primary} /><Text style={styles.addText}>Assign</Text></View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>


      {/* ── Add / Edit Paper Modal ── */}
      <Modal visible={showPaperModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPaperModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingPaper ? "Edit Course" : "Add Course"}</Text>
            <Pressable onPress={() => setShowPaperModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Course Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={paperForm.name}
                onChangeText={v => setPaperForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Financial Accounting"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Code <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={paperForm.code}
                onChangeText={v => setPaperForm(f => ({ ...f, code: v.toUpperCase() }))}
                placeholder="e.g. F3"
                placeholderTextColor={Colors.light.textMuted}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={paperForm.description}
                onChangeText={v => setPaperForm(f => ({ ...f, description: v }))}
                placeholder="Brief description..."
                placeholderTextColor={Colors.light.textMuted}
                multiline
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (!paperForm.name.trim() || !paperForm.code.trim()) && styles.saveBtnDisabled,
                { opacity: pressed || savingPaper ? 0.85 : 1 }
              ]}
              onPress={handleSavePaper}
              disabled={savingPaper || !paperForm.name.trim() || !paperForm.code.trim()}
            >
              {savingPaper ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingPaper ? "Save Changes" : "Add Course"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Student Modal ── */}
      {/* ── Reset Password Modal ── */}
      <Modal visible={!!resetPwdStudent} transparent animationType="fade" onRequestClose={() => setResetPwdStudent(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text }}>Reset Password</Text>
              <Pressable onPress={() => setResetPwdStudent(null)}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary }}>
              Set a new password for <Text style={{ fontFamily: "Inter_600SemiBold", color: Colors.light.text }}>{resetPwdStudent?.name}</Text>.
            </Text>
            {!!resetPwdError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.error + "12", borderRadius: 10, padding: 10 }}>
                <Ionicons name="alert-circle" size={15} color={Colors.light.error} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.error, flex: 1 }}>{resetPwdError}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, paddingHorizontal: 12, height: 48 }}>
              <Ionicons name="lock-closed-outline" size={17} color={Colors.light.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text }}
                value={resetPwdValue}
                onChangeText={setResetPwdValue}
                placeholder="New password (min 6 chars)"
                placeholderTextColor={Colors.light.textMuted}
                secureTextEntry={!resetPwdShow}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setResetPwdShow(v => !v)} style={{ padding: 4 }}>
                <Ionicons name={resetPwdShow ? "eye" : "eye-off"} size={17} color={Colors.light.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" }}
                onPress={() => setResetPwdStudent(null)}
              >
                <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[{ flex: 1, height: 46, borderRadius: 12, backgroundColor: "#D97706", alignItems: "center", justifyContent: "center" }, (resetPwdSaving || resetPwdValue.length < 6) && { opacity: 0.6 }]}
                onPress={handleResetPassword}
                disabled={resetPwdSaving || resetPwdValue.length < 6}
              >
                {resetPwdSaving ? <ActivityIndicator color="#FFF" /> : <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" }}>Reset Password</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Staff Reset Password Modal ── */}
      <Modal visible={!!resetStaffPwd} transparent animationType="fade" onRequestClose={() => setResetStaffPwd(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text }}>Reset Staff Password</Text>
              <Pressable onPress={() => setResetStaffPwd(null)}><Ionicons name="close" size={22} color={Colors.light.text} /></Pressable>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary }}>
              Set a new password for <Text style={{ fontFamily: "Inter_600SemiBold", color: Colors.light.text }}>{resetStaffPwd?.name}</Text>.
            </Text>
            {!!resetStaffPwdError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.error + "12", borderRadius: 10, padding: 10 }}>
                <Ionicons name="alert-circle" size={15} color={Colors.light.error} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.error, flex: 1 }}>{resetStaffPwdError}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, paddingHorizontal: 12, height: 48 }}>
              <Ionicons name="lock-closed-outline" size={17} color={Colors.light.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text }}
                value={resetStaffPwdValue}
                onChangeText={setResetStaffPwdValue}
                placeholder="New password (min 6 chars)"
                placeholderTextColor={Colors.light.textMuted}
                secureTextEntry={!resetStaffPwdShow}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setResetStaffPwdShow(v => !v)} style={{ padding: 4 }}>
                <Ionicons name={resetStaffPwdShow ? "eye" : "eye-off"} size={17} color={Colors.light.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" }} onPress={() => setResetStaffPwd(null)}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[{ flex: 1, height: 46, borderRadius: 12, backgroundColor: "#D97706", alignItems: "center", justifyContent: "center" }, (resetStaffPwdSaving || resetStaffPwdValue.length < 6) && { opacity: 0.6 }]}
                onPress={handleResetStaffPassword}
                disabled={resetStaffPwdSaving || resetStaffPwdValue.length < 6}
              >
                {resetStaffPwdSaving ? <ActivityIndicator color="#FFF" /> : <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" }}>Reset Password</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Staff Modal ── */}
      <Modal visible={showStaffModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStaffModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</Text>
            <Pressable onPress={() => setShowStaffModal(false)}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            {!!staffFormError && (
              <View style={[styles.formField, { backgroundColor: Colors.light.error + "10", borderRadius: 8, padding: 10 }]}>
                <Text style={{ fontSize: 13, color: Colors.light.error, fontFamily: "Inter_400Regular" }}>{staffFormError}</Text>
              </View>
            )}
            {/* Role selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Role <Text style={styles.required}>*</Text></Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["teacher", "teacher_assistant"] as StaffRole[]).map(r => (
                  <Pressable
                    key={r}
                    style={[{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
                      staffForm.role === r ? { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + "12" } : { borderColor: Colors.light.border, backgroundColor: Colors.light.backgroundSecondary }
                    ]}
                    onPress={() => setStaffForm(f => ({ ...f, role: r }))}
                  >
                    <Ionicons name={r === "teacher" ? "school-outline" : "people-outline"} size={15} color={staffForm.role === r ? Colors.light.primary : Colors.light.textMuted} />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: staffForm.role === r ? Colors.light.primary : Colors.light.textMuted }}>
                      {r === "teacher" ? "Teacher" : "TA"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.formInputRow}>
                <Ionicons name="person-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                  value={staffForm.name}
                  onChangeText={v => setStaffForm(f => ({ ...f, name: v }))}
                  placeholder="Full name"
                  placeholderTextColor={Colors.light.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.formInputRow}>
                <Ionicons name="mail-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                  value={staffForm.email}
                  onChangeText={v => setStaffForm(f => ({ ...f, email: v }))}
                  placeholder="email@example.com"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            {!editingStaff && (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Password <Text style={styles.required}>*</Text></Text>
                <View style={styles.formInputRow}>
                  <Ionicons name="lock-closed-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                  <TextInput
                    style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                    value={staffForm.password}
                    onChangeText={v => setStaffForm(f => ({ ...f, password: v }))}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={Colors.light.textMuted}
                    secureTextEntry={!staffForm.showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setStaffForm(f => ({ ...f, showPassword: !f.showPassword }))} style={styles.formEyeBtn}>
                    <Ionicons name={staffForm.showPassword ? "eye" : "eye-off"} size={17} color={Colors.light.textMuted} />
                  </Pressable>
                </View>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || savingStaff ? 0.85 : 1 }]}
              onPress={handleSaveStaff}
              disabled={savingStaff}
            >
              {savingStaff ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingStaff ? "Save Changes" : "Create Staff Member"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showStudentModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStudentModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingStudent ? "Edit Student" : "Add Student"}</Text>
            <Pressable onPress={() => setShowStudentModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            {!!studentFormError && (
              <View style={[styles.formField, { backgroundColor: Colors.light.error + "10", borderRadius: 8, padding: 10 }]}>
                <Text style={{ fontSize: 13, color: Colors.light.error, fontFamily: "Inter_400Regular" }}>{studentFormError}</Text>
              </View>
            )}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.formInputRow}>
                <Ionicons name="person-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                  value={studentForm.name}
                  onChangeText={v => setStudentForm(f => ({ ...f, name: v }))}
                  placeholder="Student's full name"
                  placeholderTextColor={Colors.light.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.formInputRow}>
                <Ionicons name="mail-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                  value={studentForm.email}
                  onChangeText={v => setStudentForm(f => ({ ...f, email: v }))}
                  placeholder="student@example.com"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            {!editingStudent && (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Password <Text style={styles.required}>*</Text></Text>
                <View style={styles.formInputRow}>
                  <Ionicons name="lock-closed-outline" size={17} color={Colors.light.textMuted} style={styles.formInputIcon} />
                  <TextInput
                    style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                    value={studentForm.password}
                    onChangeText={v => setStudentForm(f => ({ ...f, password: v }))}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={Colors.light.textMuted}
                    secureTextEntry={!studentForm.showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setStudentForm(f => ({ ...f, showPassword: !f.showPassword }))} style={styles.formEyeBtn}>
                    <Ionicons name={studentForm.showPassword ? "eye" : "eye-off"} size={17} color={Colors.light.textMuted} />
                  </Pressable>
                </View>
              </View>
            )}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>WhatsApp Number</Text>
              <View style={styles.formInputRow}>
                <CountryCodePicker
                  selected={studentCountry}
                  onSelect={c => setStudentCountry(c)}
                />
                <TextInput
                  style={[styles.formInput, styles.formInputFlex, { borderWidth: 0, backgroundColor: "transparent" }]}
                  value={studentLocalNumber}
                  onChangeText={setStudentLocalNumber}
                  placeholder="3001234567"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || savingStudent ? 0.85 : 1 }]}
              onPress={handleSaveStudent}
              disabled={savingStudent}
            >
              {savingStudent ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingStudent ? "Save Changes" : "Create Student"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Import MCQs Modal ── */}
      <Modal visible={showImportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowImportModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Import MCQs</Text>
            <Pressable onPress={() => setShowImportModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 16, paddingBottom: Math.max(insets.bottom + 20, 40), paddingHorizontal: 20 }}>

            {importState === "idle" && (
              <>
                <View style={styles.importInfoBox}>
                  <Ionicons name="information-circle" size={20} color={Colors.light.primary} />
                  <Text style={styles.importInfoText}>Upload a <Text style={{ fontFamily: "Inter_700Bold" }}>JSON</Text> or <Text style={{ fontFamily: "Inter_700Bold" }}>CSV</Text> file to bulk-import questions.</Text>
                </View>

                <Text style={styles.formLabel}>JSON format (array of objects):</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{`[\n  {\n    "topicId": 1,\n    "questionText": "...",\n    "optionA": "...",\n    "optionB": "...",\n    "optionC": "...",\n    "optionD": "...",\n    "correctAnswers": ["A"],\n    "explanation": "...",\n    "difficulty": "medium"\n  }\n]`}</Text>
                </View>

                <Text style={styles.formLabel}>CSV columns (header row required):</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>topicId, questionText, optionA, optionB, optionC, optionD, correctAnswers, explanation, difficulty</Text>
                </View>
                <Text style={[styles.importInfoText, { color: Colors.light.textMuted, fontSize: 11 }]}>difficulty: easy / medium / hard (default: medium)</Text>

                {!!importError && <Text style={styles.importError}>{importError}</Text>}

                <Pressable style={styles.importPickBtn} onPress={pickImportFile}>
                  <Ionicons name="document-outline" size={20} color="#FFF" />
                  <Text style={styles.importPickBtnText}>Choose File (JSON / CSV)</Text>
                </Pressable>
              </>
            )}

            {importState === "preview" && (
              <>
                <View style={[styles.importInfoBox, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  <Text style={[styles.importInfoText, { color: "#166534" }]}>
                    <Text style={{ fontFamily: "Inter_700Bold" }}>{importData.length} question{importData.length !== 1 ? "s" : ""}</Text> ready to import.
                  </Text>
                </View>
                {/* Preview first 3 */}
                {importData.slice(0, 3).map((q, i) => (
                  <View key={i} style={styles.importPreviewCard}>
                    <Text style={styles.importPreviewNum}>#{i + 1} · Topic {q.topicId} · {q.difficulty ?? "medium"}</Text>
                    <Text style={styles.importPreviewQ} numberOfLines={2}>{q.questionText}</Text>
                    <Text style={styles.importPreviewAns}>Answer: {q.correctAnswers?.join(", ")}</Text>
                  </View>
                ))}
                {importData.length > 3 && <Text style={styles.importMoreText}>+{importData.length - 3} more questions…</Text>}
                {!!importError && <Text style={styles.importError}>{importError}</Text>}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable style={[styles.cancelBtn2, { flex: 1 }]} onPress={() => { setImportState("idle"); setImportData([]); }}>
                    <Text style={styles.cancelBtn2Text}>Back</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { flex: 2 }]} onPress={handleConfirmImport}>
                    <Text style={styles.saveBtnText}>Import {importData.length} Questions</Text>
                  </Pressable>
                </View>
              </>
            )}

            {importState === "importing" && (
              <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.importInfoText}>Importing questions…</Text>
              </View>
            )}

            {importState === "done" && (
              <>
                <View style={[styles.importInfoBox, { backgroundColor: "#DCFCE7", flexDirection: "column", alignItems: "center", padding: 24 }]}>
                  <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                  <Text style={[styles.sheetTitle, { color: "#166534", marginTop: 8 }]}>Import Complete!</Text>
                  <Text style={[styles.importInfoText, { color: "#166534" }]}>{importResult} question{importResult !== 1 ? "s" : ""} added successfully.</Text>
                </View>
                <Pressable style={styles.saveBtn} onPress={() => setShowImportModal(false)}>
                  <Text style={styles.saveBtnText}>Done</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Question Modal ── */}
      <Modal visible={showAddQuestion} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddQuestion(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingQuestion ? "Edit Question" : "Add MCQ Question"}</Text>
            <Pressable onPress={() => setShowAddQuestion(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 12, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">

            {/* ── Topic Picker ── */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Course (Subject)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(allSubjects ?? []).map((s: any) => (
                    <Pressable
                      key={s.id}
                      style={[styles.pickerChip, qFormSubjectId === s.id && styles.pickerChipActive]}
                      onPress={() => {
                        setQFormSubjectId(s.id);
                        setQFormChapterId(null);
                        setQForm(f => ({ ...f, topicId: "" }));
                      }}
                    >
                      <Text style={[styles.pickerChipText, qFormSubjectId === s.id && styles.pickerChipTextActive]} numberOfLines={1}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {qFormSubjectId && (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Chapter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(qFormChapters ?? []).map((ch: any) => (
                      <Pressable
                        key={ch.id}
                        style={[styles.pickerChip, qFormChapterId === ch.id && styles.pickerChipActive]}
                        onPress={() => {
                          setQFormChapterId(ch.id);
                          setQForm(f => ({ ...f, topicId: "" }));
                        }}
                      >
                        <Text style={[styles.pickerChipText, qFormChapterId === ch.id && styles.pickerChipTextActive]} numberOfLines={1}>{ch.name}</Text>
                      </Pressable>
                    ))}
                    {!qFormChapters?.length && <Text style={styles.pickerEmptyText}>No chapters yet</Text>}
                  </View>
                </ScrollView>
              </View>
            )}

            {qFormChapterId && (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Topic <Text style={{ color: Colors.light.error }}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(qFormTopics ?? []).map((t: any) => (
                      <Pressable
                        key={t.id}
                        style={[styles.pickerChip, qForm.topicId === String(t.id) && styles.pickerChipActive]}
                        onPress={() => setQForm(f => ({ ...f, topicId: String(t.id) }))}
                      >
                        <Text style={[styles.pickerChipText, qForm.topicId === String(t.id) && styles.pickerChipTextActive]} numberOfLines={1}>{t.name}</Text>
                      </Pressable>
                    ))}
                    {!qFormTopics?.length && <Text style={styles.pickerEmptyText}>No topics yet</Text>}
                  </View>
                </ScrollView>
                {qForm.topicId ? (
                  <Text style={styles.pickerSelectedHint}>Topic ID: {qForm.topicId}</Text>
                ) : null}
              </View>
            )}

            {[
              { label: "Question", key: "questionText", placeholder: "Enter the question...", multiline: true },
              { label: "Option A", key: "optionA", placeholder: "Option A" },
              { label: "Option B", key: "optionB", placeholder: "Option B" },
              { label: "Option C", key: "optionC", placeholder: "Option C" },
              { label: "Option D", key: "optionD", placeholder: "Option D" },
              { label: "Correct Answer(s)", key: "correctAnswers", placeholder: "A  or  A,B  for multiple" },
              { label: "Explanation", key: "explanation", placeholder: "Explain the correct answer...", multiline: true },
            ].map(field => (
              <View key={field.key} style={styles.formField}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, field.multiline && styles.formInputMultiline]}
                  value={qForm[field.key as keyof typeof qForm]}
                  onChangeText={v => setQForm(f => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.light.textMuted}
                  multiline={field.multiline}
                />
              </View>
            ))}

            {/* Difficulty Picker */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Difficulty Level</Text>
              <View style={styles.diffPicker}>
                {(["easy","medium","hard"] as const).map(d => (
                  <Pressable
                    key={d}
                    style={[styles.diffPickerBtn,
                      d === "easy" && styles.diffPickerEasy,
                      d === "medium" && styles.diffPickerMedium,
                      d === "hard" && styles.diffPickerHard,
                      qForm.difficulty === d
                        ? { backgroundColor: d === "easy" ? "#16A34A" : d === "medium" ? "#D97706" : "#DC2626" }
                        : styles.diffPickerUnselected,
                    ]}
                    onPress={() => setQForm(f => ({ ...f, difficulty: d }))}
                  >
                    <Ionicons
                      name={d === "easy" ? "leaf" : d === "medium" ? "flash" : "flame"}
                      size={14}
                      color={qForm.difficulty === d ? "#FFF" : d === "easy" ? "#16A34A" : d === "medium" ? "#D97706" : "#DC2626"}
                    />
                    <Text style={[styles.diffPickerText, qForm.difficulty === d && { color: "#FFF" }]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={[styles.saveBtn, { opacity: savingQ ? 0.85 : 1 }]} onPress={handleSaveQuestion} disabled={savingQ}>
              {savingQ ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Question</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Video Modal ── */}
      <Modal visible={showVideoModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVideoModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingVideo ? "Edit Video" : "Add Video"}</Text>
            <Pressable onPress={() => setShowVideoModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} value={videoForm.title} onChangeText={v => setVideoForm(f => ({ ...f, title: v }))} placeholder="e.g. Introduction to Financial Accounting" placeholderTextColor={Colors.light.textMuted} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>YouTube URL <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} value={videoForm.youtubeUrl} onChangeText={v => setVideoForm(f => ({ ...f, youtubeUrl: v }))} placeholder="https://youtube.com/watch?v=..." placeholderTextColor={Colors.light.textMuted} autoCapitalize="none" keyboardType="url" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, styles.formInputMultiline]} value={videoForm.description} onChangeText={v => setVideoForm(f => ({ ...f, description: v }))} placeholder="Optional description..." placeholderTextColor={Colors.light.textMuted} multiline />
            </View>
            <Pressable
              style={[styles.saveBtn, (!videoForm.title.trim() || !videoForm.youtubeUrl.trim()) && styles.saveBtnDisabled, { opacity: savingVideo ? 0.85 : 1 }]}
              onPress={handleSaveVideo}
              disabled={savingVideo || !videoForm.title.trim() || !videoForm.youtubeUrl.trim()}
            >
              {savingVideo ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingVideo ? "Save Changes" : "Add Video"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Notes Modal ── */}
      <Modal visible={showNoteModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNoteModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingNote ? "Edit Notes" : "Add Notes"}</Text>
            <Pressable onPress={() => setShowNoteModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} value={noteForm.title} onChangeText={v => setNoteForm(f => ({ ...f, title: v }))} placeholder="e.g. Chapter 1 Lecture Notes" placeholderTextColor={Colors.light.textMuted} />
            </View>

            {/* PDF Upload */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>PDF File <Text style={styles.required}>*</Text></Text>
              {noteFileName ? (
                <View style={styles.noteFileSelected}>
                  <View style={styles.noteFileIcon}>
                    <Ionicons name="document-text" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.noteFileName} numberOfLines={1}>{noteFileName}</Text>
                  <Pressable style={styles.noteFileChangeBtn} onPress={pickNoteFile} disabled={pickingNote}>
                    {pickingNote ? <ActivityIndicator size="small" color={Colors.light.primary} /> : <Text style={styles.noteFileChangeBtnText}>Change</Text>}
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.noteFilePicker} onPress={pickNoteFile} disabled={pickingNote}>
                  {pickingNote ? (
                    <ActivityIndicator color={Colors.light.primary} />
                  ) : (
                    <>
                      <View style={styles.noteFilePickerIcon}>
                        <Ionicons name="cloud-upload-outline" size={28} color={Colors.light.primary} />
                      </View>
                      <Text style={styles.noteFilePickerTitle}>Tap to upload PDF</Text>
                      <Text style={styles.noteFilePickerSub}>PDF files supported</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, styles.formInputMultiline]} value={noteForm.description} onChangeText={v => setNoteForm(f => ({ ...f, description: v }))} placeholder="Optional description..." placeholderTextColor={Colors.light.textMuted} multiline />
            </View>
            <Pressable
              style={[styles.saveBtn, (!noteForm.title.trim() || !noteForm.fileUrl.trim()) && styles.saveBtnDisabled, { opacity: savingNote ? 0.85 : 1 }]}
              onPress={handleSaveNote}
              disabled={savingNote || !noteForm.title.trim() || !noteForm.fileUrl.trim()}
            >
              {savingNote ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingNote ? "Save Changes" : "Add Notes"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Chapter Modal ── */}
      <Modal visible={showChapterModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowChapterModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingChapter ? "Edit Chapter" : "Add Chapter"}</Text>
            <Pressable onPress={() => setShowChapterModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Chapter Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={chapterForm.name}
                onChangeText={v => setChapterForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Introduction to Financial Accounting"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Order Number</Text>
              <TextInput
                style={styles.formInput}
                value={chapterForm.orderNumber}
                onChangeText={v => setChapterForm(f => ({ ...f, orderNumber: v }))}
                placeholder="1"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="numeric"
              />
            </View>
            <Pressable
              style={[styles.saveBtn, !chapterForm.name.trim() && styles.saveBtnDisabled, { opacity: savingChapter ? 0.85 : 1 }]}
              onPress={handleSaveChapter}
              disabled={savingChapter || !chapterForm.name.trim()}
            >
              {savingChapter ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingChapter ? "Save Changes" : "Create Chapter"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add / Edit Topic Modal ── */}
      <Modal visible={showTopicModal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTopicModal(false)}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editingTopic ? "Edit Topic" : "Add Topic"}</Text>
            <Pressable onPress={() => setShowTopicModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={{ gap: 14, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Topic Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={topicForm.name}
                onChangeText={v => setTopicForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Material Cost and Labour Cost"
                placeholderTextColor={Colors.light.textMuted}
                autoFocus
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Order Number</Text>
              <TextInput
                style={styles.formInput}
                value={topicForm.orderNumber}
                onChangeText={v => setTopicForm(f => ({ ...f, orderNumber: v }))}
                placeholder="1"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="numeric"
              />
            </View>
            <Pressable
              style={[styles.saveBtn, !topicForm.name.trim() && styles.saveBtnDisabled, { opacity: savingTopic ? 0.85 : 1 }]}
              onPress={handleSaveTopic}
              disabled={savingTopic || !topicForm.name.trim()}
            >
              {savingTopic ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingTopic ? "Save Changes" : "Create Topic"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="warning-outline" size={32} color={Colors.light.error} />
            </View>
            <Text style={styles.confirmTitle}>{confirmModal?.title}</Text>
            <Text style={styles.confirmMsg}>{confirmModal?.message}</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.cancelBtn2} onPress={() => setConfirmModal(null)}>
                <Text style={styles.cancelBtn2Text}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => confirmModal?.onConfirm()}>
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Undo Snackbar ── */}
      {snackbar && (
        <View style={styles.snackbar} pointerEvents="box-none">
          <View style={styles.snackbarInner}>
            <View style={styles.snackbarLeft}>
              <View style={styles.snackCountdown}>
                <Text style={styles.snackCountdownText}>{snackbar.countdown}</Text>
              </View>
              <Text style={styles.snackMessage}>{snackbar.message}</Text>
            </View>
            <Pressable style={styles.snackUndoBtn} onPress={handleUndo}>
              <Ionicons name="arrow-undo" size={14} color={Colors.light.primary} />
              <Text style={styles.snackUndoText}>Undo</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tabBar: { backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tabBarScroll: { paddingHorizontal: 8 },
  tab: { flexDirection: "column", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, gap: 4, minWidth: 80, position: "relative" },
  tabIndicator: { position: "absolute", bottom: 0, left: 12, right: 12, height: 2.5, backgroundColor: Colors.light.primary, borderRadius: 2 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, letterSpacing: 0.2 },
  tabLabelActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 },
  sectionSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 14, marginTop: -8 },
  addBtnSmall: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  tabSummaryCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.card, borderRadius: 14, padding: 16,
    marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  tabSummaryItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  tabSummaryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabSummaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tabSummaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, marginTop: 1 },
  tabSummaryDivider: { width: 1, height: 36, backgroundColor: Colors.light.border, marginHorizontal: 12 },
  progMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  reorderBtns: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, marginRight: 6 },
  programRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card,
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  progCodeBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.light.primary + "14", alignItems: "center", justifyContent: "center" },
  progCode: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  progLogoThumb: { width: 46, height: 46, borderRadius: 12 },
  logoPickerSection: { alignItems: "center", gap: 10 },
  logoPickerBox: {
    width: 100, height: 100, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.light.border, borderStyle: "dashed",
    overflow: "hidden",
  },
  logoPreview: { width: "100%", height: "100%" },
  logoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  logoPlaceholderText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },
  logoActions: { flexDirection: "row", gap: 8 },
  logoChangeBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.light.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  logoChangeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  logoRemoveBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.light.error + "60", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  logoRemoveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.error },
  progName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  progDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  progMeta: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, marginTop: 4 },
  rowActions: { flexDirection: "row", gap: 6 },
  editIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.light.primary + "12", alignItems: "center", justifyContent: "center" },
  deleteIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.light.error + "12", alignItems: "center", justifyContent: "center" },
  toggleIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  paperVisRow: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card,
    borderRadius: 12, padding: 12, marginBottom: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  actionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, textAlign: "center" },
  comingSoon: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6, marginTop: 4 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  filterChips: { gap: 6, paddingBottom: 10, flexDirection: "row" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted },
  filterChipTextActive: { color: "#FFF" },
  qCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, marginBottom: 8 },
  qCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 12, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  qCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  qNumBadge: { backgroundColor: Colors.light.primary + "1A", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  qNumText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  qTopicTag: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  qTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  qTypeSingle: { backgroundColor: "#DCFCE7" },
  qTypeMultiple: { backgroundColor: "#FEF3C7" },
  qTypeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  editIconBtn: { padding: 6, backgroundColor: Colors.light.primary + "14", borderRadius: 8 },
  deleteIconBtn: { padding: 6, backgroundColor: Colors.light.error + "14", borderRadius: 8 },
  qText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, marginBottom: 8, lineHeight: 18 },
  qOptions: { gap: 4 },
  qOpt: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.light.background },
  qOptCorrect: { backgroundColor: "#DCFCE7" },
  qOptLabel: { width: 18, fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  qOptLabelCorrect: { color: Colors.light.success },
  qOptText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.text },
  qOptTextCorrect: { fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  diffEasy: { backgroundColor: "#DCFCE7" },
  diffMedium: { backgroundColor: "#FEF3C7" },
  diffHard: { backgroundColor: "#FEE2E2" },
  diffText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.text, textTransform: "capitalize" },
  pickerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.light.border, backgroundColor: Colors.light.card,
  },
  pickerChipActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + "18" },
  pickerChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  pickerChipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  pickerEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, paddingVertical: 8 },
  pickerSelectedHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 4 },
  diffPicker: { flexDirection: "row", gap: 10 },
  diffPickerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  diffPickerEasy: { borderColor: "#16A34A" },
  diffPickerMedium: { borderColor: "#D97706" },
  diffPickerHard: { borderColor: "#DC2626" },
  diffPickerSelected: { opacity: 1 },
  diffPickerUnselected: { opacity: 0.6, backgroundColor: "transparent" },
  diffPickerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  importInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.light.primary + "14", padding: 14, borderRadius: 12 },
  importInfoText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 20 },
  codeBox: { backgroundColor: "#1E293B", borderRadius: 10, padding: 12 },
  codeText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", lineHeight: 18 },
  importPickBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#7C3AED", paddingVertical: 14, borderRadius: 14 },
  importPickBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  importError: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.error, backgroundColor: Colors.light.error + "14", padding: 12, borderRadius: 10 },
  importPreviewCard: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, padding: 12, gap: 4 },
  importPreviewNum: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  importPreviewQ: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 18 },
  importPreviewAns: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.success },
  importMoreText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", fontStyle: "italic" },
  studentCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  studentHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  studentEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  assignBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  assignBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  noPapers: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, fontStyle: "italic" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  paperChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DBEAFE", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  paperChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1D4ED8" },
  emptyState: { paddingTop: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  formInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border, overflow: "hidden" },
  formInputIcon: { marginLeft: 12, marginRight: 2 },
  formInputFlex: { flex: 1, borderRadius: 0 },
  formEyeBtn: { paddingHorizontal: 12 },
  sheetContainer: { flex: 1, backgroundColor: Colors.light.background },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  sheetScroll: { flex: 1, paddingHorizontal: 20 },
  selectedStudentBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.light.backgroundSecondary, padding: 12, borderRadius: 12 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  required: { color: Colors.light.error },
  formInput: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  formInputMultiline: { height: 90, textAlignVertical: "top" },
  saveBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveBtnDisabled: { backgroundColor: Colors.light.textMuted },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 8 },
  subjectPickItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 4 },
  subjectPickItemDisabled: { opacity: 0.7 },
  pickCodeTag: { width: 42, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pickCodeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  pickSubjectName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  alreadyChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#DCFCE7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  alreadyText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#059669" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EFF6FF", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  addText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 32 },
  confirmCard: { width: "100%", maxWidth: 320, backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, alignItems: "center", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  confirmIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.light.error + "14", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  confirmMsg: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  cancelBtn2: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" },
  cancelBtn2Text: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  deleteBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: Colors.light.error, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  noAccessText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  retryBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  snackbar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 28, zIndex: 999 },
  snackbarInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  snackbarLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  snackCountdown: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  snackCountdownText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" },
  snackMessage: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#F8FAFC", flex: 1 },
  snackUndoBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  snackUndoText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  // Papers section inside program row
  papersSection: { marginLeft: 12, marginTop: 0, backgroundColor: Colors.light.backgroundSecondary, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 10, borderWidth: 1, borderTopWidth: 0, borderColor: Colors.light.border },
  papersSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  papersSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.7 },
  addPaperBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addPaperBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  papersEmpty: { paddingVertical: 12, alignItems: "center" },
  papersEmptyText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, fontStyle: "italic" },
  paperRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.light.border },
  paperCodeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  paperCode: { fontSize: 11, fontFamily: "Inter_700Bold" },
  paperName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  inactiveBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  inactiveBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.light.error },
  paperActions: { flexDirection: "row", gap: 4 },

  // Student badges
  blockedBadge: { backgroundColor: Colors.light.error + "18", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  blockedBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.light.error },
  studentPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  studentPapersRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  studentPapersLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },

  courseGroupHeader: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  paperRowFull: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.card, borderRadius: 12, padding: 12, marginBottom: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  courseCodeLarge: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  courseNameSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },

  contentSubTabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  contentSubTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1, borderColor: Colors.light.border },
  contentSubTabActive: { backgroundColor: Colors.light.primary + "12", borderColor: Colors.light.primary },
  contentSubTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted },
  contentSubTabTextActive: { color: Colors.light.primary },

  videoAdminRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  videoAdminIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  videoAdminTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  videoAdminUrl: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },

  // Chapter admin row
  chapterAdminRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.light.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.light.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  chapterAdminRowInactive: { backgroundColor: Colors.light.backgroundSecondary, borderStyle: "dashed" },
  chapterAdminLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: 8 },
  chapterOrderBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.light.primary + "18", alignItems: "center", justifyContent: "center" },
  chapterOrderText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  chapterAdminName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, flexShrink: 1 },
  chapterAdminMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 1 },
  chapterAdminActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  hiddenBadge: { backgroundColor: "#FEF9C3", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  hiddenBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#92400E" },
  previewIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#7C3AED18", alignItems: "center", justifyContent: "center" },

  // Topic management
  topicPanel: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, marginBottom: 8, marginTop: -4, padding: 12, borderWidth: 1, borderColor: Colors.light.border + "80", borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  topicPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topicPanelTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, flex: 1 },
  addTopicBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addTopicBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  topicEmptyState: { alignItems: "center", paddingVertical: 16, gap: 6 },
  topicEmptyText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center" },
  topicRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.light.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.light.border },
  topicRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  topicOrderDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topicOrderDotText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  topicRowName: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, flex: 1 },
  topicRowActions: { flexDirection: "row", gap: 4, flexShrink: 0 },

  // Note file picker styles
  noteFilePicker: { borderWidth: 1.5, borderColor: Colors.light.primary, borderStyle: "dashed", borderRadius: 14, paddingVertical: 24, alignItems: "center", gap: 6, backgroundColor: Colors.light.primary + "06" },
  noteFilePickerIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.light.primary + "14", alignItems: "center", justifyContent: "center" },
  noteFilePickerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  noteFilePickerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  noteFileSelected: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#DCFCE7", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#86EFAC" },
  noteFileIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  noteFileName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  noteFileChangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.light.primary },
  noteFileChangeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});

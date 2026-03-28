import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
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
import { api, Student, AdminSubject, Course } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

interface StatCardProps { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }
function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type TabType = "overview" | "students" | "programs" | "content";

interface ProgramForm { name: string; code: string; description: string; logo: string }
const EMPTY_FORM: ProgramForm = { name: "", code: "", description: "", logo: "" };

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Programs state
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<(Course & { subjectCount: number }) | null>(null);
  const [programForm, setProgramForm] = useState<ProgramForm>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  // Students state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [savingEnroll, setSavingEnroll] = useState(false);

  // Content state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [deletingQId, setDeletingQId] = useState<number | null>(null);
  const [showDeleteQConfirm, setShowDeleteQConfirm] = useState(false);
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
  const [savingQ, setSavingQ] = useState(false);
  const EMPTY_Q = { topicId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswers: "", explanation: "", difficulty: "medium" };
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importState, setImportState] = useState<"idle"|"preview"|"importing"|"done">("idle");
  const [importData, setImportData] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(0);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"], queryFn: api.getAdminStats,
  });
  const { data: programs, isLoading: programsLoading, refetch: refetchPrograms } = useQuery({
    queryKey: ["adminCourses"], queryFn: api.getAdminCourses, enabled: activeTab === "programs",
  });
  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["adminStudents"], queryFn: api.getStudents, enabled: activeTab === "students",
  });
  const { data: allSubjects } = useQuery({
    queryKey: ["adminSubjects"], queryFn: api.getAllSubjects,
    enabled: showEnrollModal || activeTab === "content",
  });
  const { data: adminQuestions, isLoading: questionsLoading, refetch: refetchQuestions } = useQuery({
    queryKey: ["adminQuestions", filterSubjectId],
    queryFn: () => api.getAdminQuestions(filterSubjectId ? { subjectId: filterSubjectId } : {}),
    enabled: activeTab === "content",
  });

  if (user?.role !== "admin") {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <Text style={styles.noAccessText}>Admin access required</Text>
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
    try {
      const payload = {
        name: programForm.name.trim(),
        code: programForm.code.trim(),
        description: programForm.description.trim() || undefined,
        logo: programForm.logo || undefined,
      };
      if (editingProgram) {
        await api.updateCourse(editingProgram.id, payload);
      } else {
        await api.createCourse(payload);
      }
      qc.invalidateQueries({ queryKey: ["adminCourses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      refetchPrograms();
      refetchStats();
      setShowProgramModal(false);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingProgram(false);
    }
  };
  const confirmDelete = (id: number) => { setDeletingId(id); setShowDeleteConfirm(true); };
  const handleDeleteProgram = async () => {
    if (!deletingId) return;
    setSavingProgram(true);
    try {
      await api.deleteCourse(deletingId);
      qc.invalidateQueries({ queryKey: ["adminCourses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      refetchPrograms();
      refetchStats();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingProgram(false);
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
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
  const handleRevokePaper = async (student: Student, subjectId: number) => {
    try {
      await api.revokeSubject(student.id, subjectId);
      qc.invalidateQueries({ queryKey: ["adminStudents"] });
      refetchStudents();
    } catch (e) { console.error(e); }
  };

  // --- Add / Edit Question ---
  const openAddQuestion = () => { setEditingQuestion(null); setQForm(EMPTY_Q); setShowAddQuestion(true); };
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
    setShowAddQuestion(true);
  };
  const handleSaveQuestion = async () => {
    if (!qForm.topicId || !qForm.questionText || !qForm.optionA || !qForm.optionB || !qForm.optionC || !qForm.optionD || !qForm.correctAnswers || !qForm.explanation) return;
    const answers = qForm.correctAnswers.toUpperCase().split(",").map(a => a.trim()).filter(a => ["A","B","C","D"].includes(a));
    if (!answers.length) return;
    setSavingQ(true);
    try {
      const payload = {
        topicId: parseInt(qForm.topicId),
        questionText: qForm.questionText,
        optionA: qForm.optionA, optionB: qForm.optionB, optionC: qForm.optionC, optionD: qForm.optionD,
        correctAnswers: answers, explanation: qForm.explanation,
        questionType: answers.length > 1 ? "multiple" as const : "single" as const,
        difficulty: qForm.difficulty,
      };
      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, payload);
      } else {
        await api.createQuestion(payload);
      }
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      refetchStats();
      refetchQuestions();
      setShowAddQuestion(false);
      setQForm(EMPTY_Q);
      setEditingQuestion(null);
    } catch (e) { console.error(e); }
    finally { setSavingQ(false); }
  };
  const confirmDeleteQ = (id: number) => { setDeletingQId(id); setShowDeleteQConfirm(true); };
  const handleDeleteQuestion = async () => {
    if (!deletingQId) return;
    setSavingQ(true);
    try {
      await api.deleteQuestion(deletingQId);
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      refetchStats();
      refetchQuestions();
    } catch (e) { console.error(e); }
    finally { setSavingQ(false); setShowDeleteQConfirm(false); setDeletingQId(null); }
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

  const groupedSubjects = (allSubjects ?? []).reduce<Record<string, AdminSubject[]>>((acc, s) => {
    const key = `${s.courseCode} — ${s.courseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "overview",  label: "Dashboard",  icon: "grid-outline" },
    { key: "programs",  label: "Programs",  icon: "school-outline" },
    { key: "students",  label: "Students",  icon: "people-outline" },
    { key: "content",   label: "Content",   icon: "document-text-outline" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
        {tabs.map(tab => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? Colors.light.primary : Colors.light.textMuted} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dashboard</Text>
            {statsLoading ? <ActivityIndicator color={Colors.light.primary} /> : (
              <View style={styles.statsGrid}>
                <StatCard label="Users"    value={stats?.totalUsers ?? 0}     icon="people"         color="#3B82F6" />
                <StatCard label="Programs" value={stats?.totalCourses ?? 0}   icon="school"         color="#059669" />
                <StatCard label="Papers"   value={stats?.totalSubjects ?? 0}  icon="book"           color="#7C3AED" />
                <StatCard label="Chapters" value={stats?.totalChapters ?? 0}  icon="layers"         color="#D97706" />
                <StatCard label="Topics"   value={stats?.totalTopics ?? 0}    icon="bookmark"       color="#DC2626" />
                <StatCard label="MCQs"     value={stats?.totalQuestions ?? 0} icon="help-circle"    color="#0891B2" />
              </View>
            )}
            {stats && (
              <View style={styles.avgCard}>
                <Text style={styles.avgLabel}>Average Score Across All Students</Text>
                <Text style={styles.avgValue}>{Number(stats.averageScore).toFixed(1)}%</Text>
              </View>
            )}
          </View>
        )}

        {/* PROGRAMS TAB */}
        {activeTab === "programs" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Programs</Text>
              <Pressable style={styles.addBtnSmall} onPress={openAddProgram}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addBtnText}>Add Program</Text>
              </Pressable>
            </View>

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
              programs.map(prog => (
                <View key={prog.id} style={styles.programRow}>
                  {prog.logo ? (
                    <Image source={{ uri: prog.logo }} style={styles.progLogoThumb} contentFit="cover" />
                  ) : (
                    <View style={styles.progCodeBox}>
                      <Text style={styles.progCode}>{prog.code}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progName} numberOfLines={1}>{prog.name}</Text>
                    {prog.description ? <Text style={styles.progDesc} numberOfLines={1}>{prog.description}</Text> : null}
                    <Text style={styles.progMeta}>{prog.subjectCount} papers</Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable style={styles.editIconBtn} onPress={() => openEditProgram(prog)}>
                      <Ionicons name="pencil" size={15} color={Colors.light.primary} />
                    </Pressable>
                    <Pressable style={styles.deleteIconBtn} onPress={() => confirmDelete(prog.id)}>
                      <Ionicons name="trash" size={15} color={Colors.light.error} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Paper Access</Text>
            <Text style={styles.sectionSubtitle}>Assign or revoke paper access per student</Text>
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
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>
                    <Pressable style={styles.assignBtn} onPress={() => { setSelectedStudent(student); setShowEnrollModal(true); }}>
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.assignBtnText}>Add Paper</Text>
                    </Pressable>
                  </View>
                  {student.purchasedSubjects.length === 0 ? (
                    <Text style={styles.noPapers}>No papers assigned</Text>
                  ) : (
                    <View style={styles.chipsWrap}>
                      {student.purchasedSubjects.map(p => (
                        <View key={p.subjectId} style={styles.paperChip}>
                          <Text style={styles.paperChipText}>{p.subjectCode}</Text>
                          <Pressable onPress={() => handleRevokePaper(student, p.subjectId)} hitSlop={8}>
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

        {/* CONTENT TAB */}
        {activeTab === "content" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>MCQ Questions</Text>
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
            </View>

            {/* Subject filter */}
            <View style={styles.filterRow}>
              <Ionicons name="funnel-outline" size={14} color={Colors.light.textMuted} />
              <Text style={styles.filterLabel}>Filter by paper:</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              <Pressable
                style={[styles.filterChip, !filterSubjectId && styles.filterChipActive]}
                onPress={() => setFilterSubjectId(null)}
              >
                <Text style={[styles.filterChipText, !filterSubjectId && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {(allSubjects ?? []).map(s => (
                <Pressable
                  key={s.id}
                  style={[styles.filterChip, filterSubjectId === s.id && styles.filterChipActive]}
                  onPress={() => setFilterSubjectId(s.id)}
                >
                  <Text style={[styles.filterChipText, filterSubjectId === s.id && styles.filterChipTextActive]}>{s.code}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {questionsLoading ? (
              <View style={{ paddingTop: 30, alignItems: "center" }}>
                <ActivityIndicator color={Colors.light.primary} />
              </View>
            ) : !adminQuestions?.length ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>
                  {filterSubjectId ? "No questions for this paper" : "No questions yet"}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.qCount}>{adminQuestions.length} question{adminQuestions.length !== 1 ? "s" : ""}</Text>
                {adminQuestions.map((q, idx) => (
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

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="trash-outline" size={30} color={Colors.light.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete Program?</Text>
            <Text style={styles.confirmMsg}>This will permanently delete the program and cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.cancelBtn2} onPress={() => setShowDeleteConfirm(false)} disabled={savingProgram}>
                <Text style={styles.cancelBtn2Text}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.deleteBtn, { opacity: savingProgram ? 0.7 : 1 }]} onPress={handleDeleteProgram} disabled={savingProgram}>
                {savingProgram ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.deleteBtnText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Assign Paper Modal ── */}
      <Modal visible={showEnrollModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowEnrollModal(false); setSelectedStudent(null); }}>
        <View style={[styles.sheetContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Assign Paper Access</Text>
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

      {/* ── Delete Question Confirm ── */}
      <Modal visible={showDeleteQConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteQConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="trash-outline" size={30} color={Colors.light.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete Question?</Text>
            <Text style={styles.confirmMsg}>This will permanently remove the question and cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.cancelBtn2} onPress={() => setShowDeleteQConfirm(false)} disabled={savingQ}>
                <Text style={styles.cancelBtn2Text}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.deleteBtn, { opacity: savingQ ? 0.7 : 1 }]} onPress={handleDeleteQuestion} disabled={savingQ}>
                {savingQ ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.deleteBtnText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
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
            {[
              { label: "Topic ID", key: "topicId", placeholder: "e.g. 1", keyboard: "numeric" as const },
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
                  keyboardType={field.keyboard}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tabBarScroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.light.backgroundSecondary },
  tabActive: { backgroundColor: Colors.light.primary },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabLabelActive: { color: "#FFF", fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 },
  sectionSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 14, marginTop: -8 },
  addBtnSmall: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%", backgroundColor: Colors.light.card, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  avgCard: { backgroundColor: Colors.light.primary, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  avgLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", flex: 1, lineHeight: 18 },
  avgValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF" },
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
  deleteBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: Colors.light.error, alignItems: "center", justifyContent: "center" },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  noAccessText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  retryBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

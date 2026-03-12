import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api, Student, AdminSubject } from "@/hooks/useApi";
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

type TabType = "overview" | "students" | "content";

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    topicId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "",
    correctAnswers: "", explanation: "", questionType: "single" as "single" | "multiple",
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: api.getAdminStats,
  });

  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["adminStudents"],
    queryFn: api.getStudents,
    enabled: activeTab === "students",
  });

  const { data: allSubjects } = useQuery({
    queryKey: ["adminSubjects"],
    queryFn: api.getAllSubjects,
    enabled: showEnrollModal,
  });

  if (user?.role !== "admin") {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="lock-closed" size={48} color={Colors.light.error} />
        <Text style={styles.noAccessText}>Admin access required</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleSaveQuestion = async () => {
    if (!form.topicId || !form.questionText || !form.optionA || !form.optionB || !form.optionC || !form.optionD || !form.correctAnswers || !form.explanation) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    const answers = form.correctAnswers.toUpperCase().split(",").map(a => a.trim()).filter(a => ["A","B","C","D"].includes(a));
    if (answers.length === 0) {
      Alert.alert("Invalid Answers", "Enter correct answers as A, B, C, or D.");
      return;
    }
    setSaving(true);
    try {
      await api.createQuestion({
        topicId: parseInt(form.topicId),
        questionText: form.questionText,
        optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD,
        correctAnswers: answers, explanation: form.explanation,
        questionType: answers.length > 1 ? "multiple" : "single",
      });
      Alert.alert("Success", "Question added successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setShowAddQuestion(false);
      setForm({ topicId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswers: "", explanation: "", questionType: "single" });
      refetchStats();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPaper = async (subjectId: number) => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await api.assignSubject(selectedStudent.id, subjectId, user.id);
      Alert.alert("Success", "Paper access granted!");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      refetchStudents();
      setShowEnrollModal(false);
      setSelectedStudent(null);
    } catch (e: any) {
      Alert.alert("Already Assigned", e.message || "Failed to assign paper");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokePaper = (student: Student, subjectId: number, subjectName: string) => {
    Alert.alert("Revoke Access", `Remove ${student.name}'s access to ${subjectName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke", style: "destructive",
        onPress: async () => {
          try {
            await api.revokeSubject(student.id, subjectId);
            queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
            refetchStudents();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to revoke");
          }
        },
      },
    ]);
  };

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "overview", label: "Overview", icon: "grid-outline" },
    { key: "students", label: "Students", icon: "people-outline" },
    { key: "content", label: "Content", icon: "document-text-outline" },
  ];

  const groupedSubjects = (allSubjects ?? []).reduce<Record<string, AdminSubject[]>>((acc, s) => {
    const key = `${s.courseCode} — ${s.courseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn2} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? Colors.light.primary : Colors.light.textMuted} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>

        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Overview</Text>
            {statsLoading ? <ActivityIndicator color={Colors.light.primary} /> : (
              <View style={styles.statsGrid}>
                <StatCard label="Users" value={stats?.totalUsers ?? 0} icon="people" color="#3B82F6" />
                <StatCard label="Programs" value={stats?.totalCourses ?? 0} icon="school" color="#059669" />
                <StatCard label="Papers" value={stats?.totalSubjects ?? 0} icon="book" color="#7C3AED" />
                <StatCard label="Chapters" value={stats?.totalChapters ?? 0} icon="layers" color="#D97706" />
                <StatCard label="Topics" value={stats?.totalTopics ?? 0} icon="bookmark" color="#DC2626" />
                <StatCard label="MCQs" value={stats?.totalQuestions ?? 0} icon="help-circle" color="#0891B2" />
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

        {activeTab === "students" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Paper Access</Text>
            <Text style={styles.sectionSubtitle}>Assign or revoke paper access for each student</Text>
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
                          <Pressable onPress={() => handleRevokePaper(student, p.subjectId, p.subjectName)} hitSlop={8}>
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

        {activeTab === "content" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Management</Text>
            <View style={styles.actionGrid}>
              <Pressable style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]} onPress={() => setShowAddQuestion(true)}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.light.primary + "14" }]}>
                  <Ionicons name="add-circle" size={28} color={Colors.light.primary} />
                </View>
                <Text style={styles.actionLabel}>Add Question</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]} onPress={() => Alert.alert("Coming Soon", "Analytics coming soon.")}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.light.warning + "14" }]}>
                  <Ionicons name="analytics" size={28} color={Colors.light.warning} />
                </View>
                <Text style={styles.actionLabel}>Analytics</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]} onPress={() => Alert.alert("Coming Soon", "Bulk import coming soon.")}>
                <View style={[styles.actionIcon, { backgroundColor: "#7C3AED14" }]}>
                  <Ionicons name="cloud-upload" size={28} color="#7C3AED" />
                </View>
                <Text style={styles.actionLabel}>Import MCQs</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]} onPress={() => Alert.alert("Coming Soon", "Manage programs coming soon.")}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.light.success + "14" }]}>
                  <Ionicons name="school" size={28} color={Colors.light.success} />
                </View>
                <Text style={styles.actionLabel}>Programs</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Question Modal */}
      <Modal visible={showAddQuestion} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddQuestion(false)}>
        <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add MCQ Question</Text>
            <Pressable onPress={() => setShowAddQuestion(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: 12, paddingBottom: Math.max(insets.bottom + 20, 40) }} keyboardShouldPersistTaps="handled">
            {[
              { label: "Topic ID", key: "topicId", placeholder: "Enter topic ID (e.g. 1)", keyboard: "numeric" as const },
              { label: "Question Text", key: "questionText", placeholder: "Enter the question...", multiline: true },
              { label: "Option A", key: "optionA", placeholder: "Option A" },
              { label: "Option B", key: "optionB", placeholder: "Option B" },
              { label: "Option C", key: "optionC", placeholder: "Option C" },
              { label: "Option D", key: "optionD", placeholder: "Option D" },
              { label: "Correct Answer(s)", key: "correctAnswers", placeholder: "A or A,B for multiple" },
              { label: "Explanation", key: "explanation", placeholder: "Explain the correct answer...", multiline: true },
            ].map(field => (
              <View key={field.key} style={styles.formField}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, field.multiline && styles.formInputMultiline]}
                  value={form[field.key as keyof typeof form] as string}
                  onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.light.textMuted}
                  multiline={field.multiline}
                  keyboardType={field.keyboard}
                />
              </View>
            ))}
            <Pressable style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.85 : 1 }]} onPress={handleSaveQuestion} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Question</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Assign Paper Modal */}
      <Modal visible={showEnrollModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowEnrollModal(false); setSelectedStudent(null); }}>
        <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Paper Access</Text>
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
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: 8, paddingBottom: Math.max(insets.bottom + 20, 40) }}>
            {!allSubjects ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 20 }} />
            ) : (
              Object.entries(groupedSubjects).map(([group, subjects]) => (
                <View key={group}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  {subjects.map(subject => {
                    const alreadyAssigned = selectedStudent?.purchasedSubjects.some(p => p.subjectId === subject.id);
                    return (
                      <Pressable
                        key={subject.id}
                        style={[styles.subjectPickItem, alreadyAssigned && styles.subjectPickItemDisabled]}
                        onPress={() => !alreadyAssigned && handleAssignPaper(subject.id)}
                        disabled={alreadyAssigned || saving}
                      >
                        <View style={[styles.pickCodeTag, { backgroundColor: alreadyAssigned ? "#F3F4F6" : Colors.light.primary + "14" }]}>
                          <Text style={[styles.pickCodeText, { color: alreadyAssigned ? Colors.light.textMuted : Colors.light.primary }]}>{subject.code}</Text>
                        </View>
                        <Text style={[styles.pickSubjectName, alreadyAssigned && { color: Colors.light.textMuted }]} numberOfLines={1}>{subject.name}</Text>
                        {alreadyAssigned ? (
                          <View style={styles.alreadyChip}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.alreadyText}>Assigned</Text>
                          </View>
                        ) : (
                          <View style={styles.addChip}>
                            <Ionicons name="add" size={13} color={Colors.light.primary} />
                            <Text style={styles.addText}>Assign</Text>
                          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  backBtn2: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 9 },
  tabActive: { backgroundColor: Colors.light.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabLabelActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  statCard: {
    width: "47%", backgroundColor: Colors.light.card, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, alignItems: "flex-start", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  avgCard: { backgroundColor: Colors.light.primary, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  avgLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", flex: 1, lineHeight: 18 },
  avgValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  actionCard: { width: "47%", backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  actionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, textAlign: "center" },
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
  modalContainer: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalScroll: { flex: 1, paddingHorizontal: 20 },
  selectedStudentBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.light.backgroundSecondary, padding: 12, borderRadius: 12 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, marginBottom: 4 },
  formInput: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  formInputMultiline: { height: 100, textAlignVertical: "top" },
  saveBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 8 },
  subjectPickItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 4 },
  subjectPickItemDisabled: { opacity: 0.7 },
  pickCodeTag: { width: 42, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pickCodeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  pickSubjectName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  alreadyChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#DCFCE7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  alreadyText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#059669" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EFF6FF", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  addText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  noAccessText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

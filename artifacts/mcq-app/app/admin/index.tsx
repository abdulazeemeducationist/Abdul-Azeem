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
import { api } from "@/hooks/useApi";
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

type FormType = "question";

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    topicId: "",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswers: "",
    explanation: "",
    questionType: "single" as "single" | "multiple",
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: api.getAdminStats,
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
      Alert.alert("Invalid Answers", "Enter correct answers as A, B, C, or D (comma-separated for multiple).");
      return;
    }
    setSaving(true);
    try {
      await api.createQuestion({
        topicId: parseInt(form.topicId),
        questionText: form.questionText,
        optionA: form.optionA,
        optionB: form.optionB,
        optionC: form.optionC,
        optionD: form.optionD,
        correctAnswers: answers,
        explanation: form.explanation,
        questionType: answers.length > 1 ? "multiple" : "single",
      });
      Alert.alert("Success", "Question added successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setShowModal(false);
      setForm({ topicId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswers: "", explanation: "", questionType: "single" });
      refetchStats();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn2} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          {statsLoading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Users" value={stats?.totalUsers ?? 0} icon="people" color="#3B82F6" />
              <StatCard label="Courses" value={stats?.totalCourses ?? 0} icon="school" color="#059669" />
              <StatCard label="Subjects" value={stats?.totalSubjects ?? 0} icon="book" color="#7C3AED" />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management</Text>
          <View style={styles.actionGrid}>
            <Pressable
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowModal(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.light.primary + "14" }]}>
                <Ionicons name="add-circle" size={28} color={Colors.light.primary} />
              </View>
              <Text style={styles.actionLabel}>Add Question</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => Alert.alert("Coming Soon", "Course management coming in the next version.")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.light.success + "14" }]}>
                <Ionicons name="school" size={28} color={Colors.light.success} />
              </View>
              <Text style={styles.actionLabel}>Manage Courses</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => Alert.alert("Coming Soon", "Student analytics coming in the next version.")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.light.warning + "14" }]}>
                <Ionicons name="analytics" size={28} color={Colors.light.warning} />
              </View>
              <Text style={styles.actionLabel}>Analytics</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => Alert.alert("Coming Soon", "Bulk import coming in the next version.")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#7C3AED14" }]}>
                <Ionicons name="cloud-upload" size={28} color="#7C3AED" />
              </View>
              <Text style={styles.actionLabel}>Import MCQs</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add MCQ Question</Text>
            <Pressable onPress={() => setShowModal(false)}>
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
              { label: "Correct Answer(s)", key: "correctAnswers", placeholder: "A or A,B for multiple correct" },
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
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.85 : 1 }]}
              onPress={handleSaveQuestion}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Question</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  backBtn2: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%", backgroundColor: Colors.light.card, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, alignItems: "flex-start", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  avgCard: {
    backgroundColor: Colors.light.primary, borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10,
  },
  avgLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", flex: 1, lineHeight: 18 },
  avgValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "47%", backgroundColor: Colors.light.card, borderRadius: 14, padding: 16,
    alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  actionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, textAlign: "center" },
  modalContainer: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalScroll: { flex: 1, paddingHorizontal: 20 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  formInput: {
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, padding: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  formInputMultiline: { height: 100, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  noAccessText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  backBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

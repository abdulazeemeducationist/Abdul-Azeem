import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
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
import { api, Chapter } from "@/hooks/useApi";

type Difficulty = "mixed" | "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; icon: string; color: string }[] = [
  { key: "mixed",  label: "Mixed",  icon: "shuffle-outline",       color: Colors.light.primary },
  { key: "easy",   label: "Easy",   icon: "happy-outline",         color: "#16A34A" },
  { key: "medium", label: "Medium", icon: "remove-circle-outline", color: "#D97706" },
  { key: "hard",   label: "Hard",   icon: "flame-outline",         color: "#DC2626" },
];

export default function CustomTestBuilderScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{ subjectId: string; subjectName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [questionCount, setQuestionCount] = useState("");

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: () => api.getChapters(Number(subjectId)),
    enabled: !!subjectId,
  });

  const chapterIdsString = useMemo(
    () => Array.from(selectedChapterIds).join(","),
    [selectedChapterIds]
  );

  const { data: availableTotal = 0, isFetching: countFetching } = useQuery({
    queryKey: ["custom-questions-count", chapterIdsString, difficulty],
    queryFn: () => api.getCustomQuestionsCount(chapterIdsString, difficulty),
    enabled: selectedChapterIds.size > 0 && chapterIdsString.length > 0,
  });

  const parsedCount = parseInt(questionCount);
  const validCount = !isNaN(parsedCount) && parsedCount > 0 && parsedCount <= availableTotal;
  const canStart = selectedChapterIds.size > 0 && availableTotal > 0 && validCount;

  const toggleChapter = (ch: Chapter) => {
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(ch.id)) next.delete(ch.id);
      else next.add(ch.id);
      return next;
    });
    setQuestionCount("");
  };

  const selectAll = () => {
    if (!chapters) return;
    if (selectedChapterIds.size === chapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(chapters.map(ch => ch.id)));
    }
    setQuestionCount("");
  };

  const handleStart = () => {
    router.push({
      pathname: "/custom-practice",
      params: {
        chapterIds: chapterIdsString,
        limit: String(parsedCount),
        difficulty,
        testName: subjectName ?? "Custom Test",
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.parentLabel} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.screenTitle}>Custom Test</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : !chapters?.length ? (
        <View style={styles.center}>
          <Ionicons name="layers-outline" size={64} color={Colors.light.textMuted} />
          <Text style={styles.emptyText}>No chapters available</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 120, 140) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1 — Select Chapters */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
              <Text style={styles.sectionTitle}>Select Chapters</Text>
              <Pressable onPress={selectAll} style={styles.selectAllBtn}>
                <Text style={styles.selectAllText}>
                  {selectedChapterIds.size === chapters.length ? "Deselect All" : "Select All"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.chapterList}>
              {chapters.map(ch => {
                const selected = selectedChapterIds.has(ch.id);
                const noQuestions = (ch.questionCount ?? 0) === 0;
                return (
                  <Pressable
                    key={ch.id}
                    style={({ pressed }) => [
                      styles.chapterRow,
                      selected && styles.chapterRowSelected,
                      noQuestions && styles.chapterRowDisabled,
                      { opacity: pressed && !noQuestions ? 0.85 : 1 },
                    ]}
                    onPress={() => { if (!noQuestions) toggleChapter(ch); }}
                    disabled={noQuestions}
                  >
                    <View style={[styles.chapterCheck, selected && styles.chapterCheckSelected]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <View style={[styles.orderBadge, { backgroundColor: selected ? Colors.light.primary + "18" : Colors.light.backgroundSecondary }]}>
                      <Text style={[styles.orderText, selected && { color: Colors.light.primary }]}>{ch.orderNumber}</Text>
                    </View>
                    <View style={styles.chapterInfo}>
                      <Text style={[styles.chapterName, noQuestions && styles.textMuted]} numberOfLines={2}>{ch.name}</Text>
                      <Text style={[styles.qCount, noQuestions && styles.textMuted]}>
                        {noQuestions ? "No questions" : `${ch.questionCount} OTQs total`}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />}
                    {noQuestions && <Ionicons name="lock-closed-outline" size={16} color={Colors.light.textMuted} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Step 2 — Difficulty */}
          {selectedChapterIds.size > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.sectionTitle}>Difficulty Level</Text>
              </View>

              <View style={styles.difficultyGrid}>
                {DIFFICULTY_OPTIONS.map(opt => {
                  const active = difficulty === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={({ pressed }) => [
                        styles.difficultyCard,
                        active && { borderColor: opt.color, backgroundColor: opt.color + "10" },
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                      onPress={() => { setDifficulty(opt.key); setQuestionCount(""); }}
                    >
                      <Ionicons name={opt.icon as any} size={22} color={active ? opt.color : Colors.light.textMuted} />
                      <Text style={[styles.difficultyLabel, active && { color: opt.color, fontFamily: "Inter_700Bold" }]}>
                        {opt.label}
                      </Text>
                      {active && (
                        <View style={[styles.difficultyCheckmark, { backgroundColor: opt.color }]}>
                          <Ionicons name="checkmark" size={10} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 3 — Question Count */}
          {selectedChapterIds.size > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.sectionTitle}>Number of Questions</Text>
              </View>

              <View style={styles.availableRow}>
                {countFetching ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : (
                  <Ionicons name="help-circle-outline" size={16} color={availableTotal > 0 ? Colors.light.primary : Colors.light.textMuted} />
                )}
                <Text style={[styles.availableText, availableTotal === 0 && styles.textMuted]}>
                  {countFetching
                    ? "Counting available questions…"
                    : availableTotal === 0
                    ? `No ${difficulty !== "mixed" ? difficulty + " " : ""}questions in selected chapters`
                    : `${availableTotal} ${difficulty !== "mixed" ? difficulty + " " : ""}question${availableTotal !== 1 ? "s" : ""} available`}
                </Text>
              </View>

              {!countFetching && availableTotal > 0 && (
                <>
                  <TextInput
                    style={[styles.countInput, validCount && styles.countInputValid]}
                    value={questionCount}
                    onChangeText={text => setQuestionCount(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder={`Enter 1 – ${availableTotal}`}
                    placeholderTextColor={Colors.light.textMuted}
                    maxLength={4}
                  />
                  {questionCount !== "" && !validCount && (
                    <Text style={styles.errorText}>
                      Enter a number between 1 and {availableTotal}
                    </Text>
                  )}

                  <View style={styles.quickPills}>
                    {[10, 20, 30, 50].filter(n => n <= availableTotal).map(n => (
                      <Pressable
                        key={n}
                        style={[styles.pill, questionCount === String(n) && styles.pillActive]}
                        onPress={() => setQuestionCount(String(n))}
                      >
                        <Text style={[styles.pillText, questionCount === String(n) && styles.pillTextActive]}>{n} Qs</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      style={[styles.pill, questionCount === String(availableTotal) && styles.pillActive]}
                      onPress={() => setQuestionCount(String(availableTotal))}
                    >
                      <Text style={[styles.pillText, questionCount === String(availableTotal) && styles.pillTextActive]}>
                        All ({availableTotal})
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Start button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            !canStart && styles.startBtnDisabled,
            { opacity: pressed && canStart ? 0.85 : 1 },
          ]}
          onPress={handleStart}
          disabled={!canStart}
        >
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={styles.startBtnText}>
            {canStart
              ? `Start Test · ${parsedCount} Question${parsedCount !== 1 ? "s" : ""}`
              : "Configure test above"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitles: { flex: 1 },
  parentLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 24 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  sectionTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  selectAllBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8 },
  selectAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  chapterList: { gap: 8 },
  chapterRow: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card,
    borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: "transparent",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  chapterRowSelected: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + "08" },
  chapterRowDisabled: { opacity: 0.5 },
  chapterCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.light.border, alignItems: "center", justifyContent: "center" },
  chapterCheckSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  orderBadge: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  orderText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  chapterInfo: { flex: 1 },
  chapterName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, lineHeight: 18 },
  qCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.primary, marginTop: 2 },
  textMuted: { color: Colors.light.textMuted },

  difficultyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  difficultyCard: {
    flex: 1, minWidth: "45%", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 16, paddingHorizontal: 12,
    backgroundColor: Colors.light.card, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.light.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    position: "relative",
  },
  difficultyLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted },
  difficultyCheckmark: {
    position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },

  availableRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.primary + "10", borderRadius: 10, padding: 10 },
  availableText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  countInput: {
    backgroundColor: Colors.light.card, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.light.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.light.text,
  },
  countInputValid: { borderColor: Colors.light.primary },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.error },

  quickPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.light.backgroundSecondary, borderWidth: 1.5, borderColor: "transparent" },
  pillActive: { backgroundColor: Colors.light.primary + "14", borderColor: Colors.light.primary },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted },
  pillTextActive: { color: Colors.light.primary },

  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.light.background, borderTopWidth: 1, borderTopColor: Colors.light.border },
  startBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  startBtnDisabled: { backgroundColor: Colors.light.textMuted },
  startBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});

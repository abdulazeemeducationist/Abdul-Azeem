import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Question } from "@/hooks/useApi";

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = typeof OPTIONS[number];

function OptionButton({
  option,
  text,
  selected,
  submitted,
  isCorrect,
  onPress,
}: {
  option: Option;
  text: string;
  selected: boolean;
  submitted: boolean;
  isCorrect: boolean;
  onPress: () => void;
}) {
  let bg = Colors.light.card;
  let borderColor = Colors.light.border;
  let textColor = Colors.light.text;
  let iconName: keyof typeof Ionicons.glyphMap = "radio-button-off-outline";

  if (submitted) {
    if (isCorrect) {
      bg = Colors.light.success + "14";
      borderColor = Colors.light.success;
      textColor = Colors.light.success;
      iconName = selected ? "checkmark-circle" : "checkmark-circle-outline";
    } else if (selected && !isCorrect) {
      bg = Colors.light.error + "14";
      borderColor = Colors.light.error;
      textColor = Colors.light.error;
      iconName = "close-circle";
    } else {
      textColor = Colors.light.textMuted;
    }
  } else if (selected) {
    bg = Colors.light.primary + "12";
    borderColor = Colors.light.primary;
    textColor = Colors.light.primary;
    iconName = "radio-button-on";
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionBtn,
        { backgroundColor: bg, borderColor },
        !submitted && pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
      disabled={submitted}
    >
      <View style={[styles.optionLabel, { backgroundColor: submitted && isCorrect ? Colors.light.success : selected ? Colors.light.primary : Colors.light.backgroundSecondary }]}>
        <Text style={[styles.optionLabelText, { color: submitted && isCorrect ? "#FFF" : selected && !submitted ? "#FFF" : Colors.light.textMuted }]}>{option}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]} numberOfLines={4}>{text}</Text>
      {submitted && (isCorrect || selected) && (
        <Ionicons name={iconName} size={20} color={isCorrect ? Colors.light.success : Colors.light.error} style={styles.optionIcon} />
      )}
    </Pressable>
  );
}

export default function PracticeScreen() {
  const { topicId, topicName } = useLocalSearchParams<{ topicId: string; topicName: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Option[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", topicId],
    queryFn: () => api.getQuestions(Number(topicId)),
    enabled: !!topicId,
  });

  const currentQuestion: Question | undefined = questions?.[currentIndex];
  const totalQuestions = questions?.length ?? 0;
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;

  const optionTexts: Record<Option, string> = {
    A: currentQuestion?.optionA ?? "",
    B: currentQuestion?.optionB ?? "",
    C: currentQuestion?.optionC ?? "",
    D: currentQuestion?.optionD ?? "",
  };

  const toggleOption = (option: Option) => {
    if (submitted) return;
    if (currentQuestion?.questionType === "single") {
      setSelectedAnswers([option]);
    } else {
      setSelectedAnswers(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0) {
      Alert.alert("No Answer", "Please select at least one answer.");
      return;
    }
    setSubmitted(true);
    setShowExplanation(false);
    const correctSet = new Set(currentQuestion?.correctAnswers ?? []);
    const selectedSet = new Set(selectedAnswers);
    const isCorrect =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every(a => correctSet.has(a));
    if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      const finalScore = score + (isCurrentCorrect() ? 0 : 0);
      const pct = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
      if (user?.id) {
        try {
          await api.saveProgress({
            userId: user.id,
            topicId: Number(topicId),
            totalQuestions,
            correctAnswers: score,
            scorePercentage: pct,
            completed: true,
          });
        } catch (e) {
          console.error("Failed to save progress", e);
        }
      }
      router.replace({
        pathname: "/results/[topicId]",
        params: { topicId, topicName, score: String(score), total: String(totalQuestions) }
      });
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswers([]);
      setSubmitted(false);
      setShowExplanation(false);
    }
  };

  const isCurrentCorrect = useCallback(() => {
    if (!currentQuestion) return false;
    const correctSet = new Set(currentQuestion.correctAnswers);
    const selectedSet = new Set(selectedAnswers);
    return selectedSet.size === correctSet.size && [...selectedSet].every(a => correctSet.has(a));
  }, [currentQuestion, selectedAnswers]);

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (!questions?.length) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="help-circle-outline" size={64} color={Colors.light.textMuted} />
        <Text style={styles.emptyTitle}>No Questions</Text>
        <Text style={styles.emptyDesc}>No questions available for this topic yet.</Text>
        <Pressable style={styles.backBtn2} onPress={() => router.back()}>
          <Text style={styles.backBtn2Text}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => {
          Alert.alert("Exit Practice", "Your progress will not be saved. Exit anyway?", [
            { text: "Stay", style: "cancel" },
            { text: "Exit", style: "destructive", onPress: () => router.back() },
          ]);
        }}>
          <Ionicons name="close" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.progressText}>Question {currentIndex + 1} of {totalQuestions}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreBoxText}>{score}</Text>
          <Ionicons name="checkmark" size={12} color={Colors.light.success} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion?.questionType === "multiple" && (
          <View style={styles.multipleHint}>
            <Ionicons name="information-circle" size={14} color={Colors.light.accent} />
            <Text style={styles.multipleHintText}>Select all correct answers</Text>
          </View>
        )}

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion?.questionText}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {OPTIONS.map(option => (
            <OptionButton
              key={option}
              option={option}
              text={optionTexts[option]}
              selected={selectedAnswers.includes(option)}
              submitted={submitted}
              isCorrect={(currentQuestion?.correctAnswers ?? []).includes(option)}
              onPress={() => toggleOption(option)}
            />
          ))}
        </View>

        {submitted && (
          <View style={[styles.feedbackCard, {
            backgroundColor: isCurrentCorrect() ? Colors.light.success + "12" : Colors.light.error + "12",
            borderColor: isCurrentCorrect() ? Colors.light.success : Colors.light.error,
          }]}>
            <View style={styles.feedbackHeader}>
              <Ionicons
                name={isCurrentCorrect() ? "checkmark-circle" : "close-circle"}
                size={22}
                color={isCurrentCorrect() ? Colors.light.success : Colors.light.error}
              />
              <Text style={[styles.feedbackTitle, { color: isCurrentCorrect() ? Colors.light.success : Colors.light.error }]}>
                {isCurrentCorrect() ? "Correct!" : "Incorrect"}
              </Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setShowExplanation(!showExplanation)} style={styles.explainToggle}>
                <Text style={styles.explainToggleText}>{showExplanation ? "Hide" : "Explain"}</Text>
              </Pressable>
            </View>
            {showExplanation && (
              <Text style={styles.explanationText}>{currentQuestion?.explanation}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        {!submitted ? (
          <Pressable
            style={({ pressed }) => [styles.submitBtn, selectedAnswers.length === 0 && styles.submitBtnDisabled, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSubmit}
            disabled={selectedAnswers.length === 0}
          >
            <Text style={styles.submitBtnText}>Submit Answer</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 >= totalQuestions ? "View Results" : "Next Question"}
            </Text>
            <Ionicons name={currentIndex + 1 >= totalQuestions ? "trophy" : "arrow-forward"} size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, gap: 12 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, gap: 6 },
  progressText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  progressBarBg: { height: 6, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: Colors.light.primary, borderRadius: 3 },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.light.success + "18", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  scoreBoxText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.success },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  multipleHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.accent + "14", borderRadius: 8, padding: 10 },
  multipleHintText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  questionCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  questionText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 26 },
  optionsContainer: { gap: 10 },
  optionBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  optionLabel: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionLabelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  optionIcon: { marginLeft: 4 },
  feedbackCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  explainToggle: { backgroundColor: "rgba(0,0,0,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  explainToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  explanationText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },
  footer: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: Colors.light.background },
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  submitBtnDisabled: { backgroundColor: Colors.light.textMuted },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  nextBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn2: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtn2Text: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

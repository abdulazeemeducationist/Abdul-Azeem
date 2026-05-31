import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { api, Question, QuizState } from "@/hooks/useApi";
import QuestionBody, { isImageQuestion } from "@/components/QuestionBody";

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = typeof OPTIONS[number];

const CURRENCY_SYMBOLS = ['$', '£', '€', '¥', '₹', '₦', '₱', '₲', '₴', '₵', '₸', '₼', '₾', '¢', '฿'];
function isCurrencyUnit(unit: string): boolean {
  return CURRENCY_SYMBOLS.some(sym => unit.startsWith(sym));
}

function OptionButton({
  option, text, selected, submitted, isCorrect, onPress, questionType,
}: {
  option: Option; text: string; selected: boolean;
  submitted: boolean; isCorrect: boolean; onPress: () => void;
  questionType?: string;
}) {
  const isMultiple = questionType === "multiple";
  let bg = Colors.light.card;
  let borderColor = Colors.light.border;
  let textColor = Colors.light.text;
  let iconName: keyof typeof Ionicons.glyphMap;
  let iconColor: string;

  if (submitted) {
    if (isCorrect) {
      bg = Colors.light.success + "14"; borderColor = Colors.light.success; textColor = Colors.light.success;
      iconName = "checkmark-circle";
      iconColor = Colors.light.success;
    } else if (selected) {
      bg = Colors.light.error + "14"; borderColor = Colors.light.error; textColor = Colors.light.error;
      iconName = "close-circle";
      iconColor = Colors.light.error;
    } else {
      textColor = Colors.light.textMuted;
      iconName = isMultiple ? "square-outline" : "radio-button-off-outline";
      iconColor = Colors.light.border;
    }
  } else if (selected) {
    bg = Colors.light.primary + "12"; borderColor = Colors.light.primary; textColor = Colors.light.primary;
    iconName = isMultiple ? "checkbox" : "radio-button-on";
    iconColor = Colors.light.primary;
  } else {
    iconName = isMultiple ? "square-outline" : "radio-button-off-outline";
    iconColor = Colors.light.border;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.optionBtn, { backgroundColor: bg, borderColor }, !submitted && pressed && { opacity: 0.8 }]}
      onPress={onPress}
      disabled={submitted}
    >
      <View style={[styles.optionLabel, { backgroundColor: submitted && isCorrect ? Colors.light.success : selected ? Colors.light.primary : Colors.light.backgroundSecondary }]}>
        <Text style={[styles.optionLabelText, { color: submitted && isCorrect ? "#FFF" : selected && !submitted ? "#FFF" : Colors.light.textMuted }]}>{option}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]} numberOfLines={4}>{text}</Text>
      <Ionicons name={iconName} size={20} color={iconColor} style={styles.optionIcon} />
    </Pressable>
  );
}

type StartMode = "ask" | "resume" | "fresh";

export default function PracticeScreen() {
  const { topicId, topicName } = useLocalSearchParams<{ topicId: string; topicName: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [startMode, setStartMode] = useState<StartMode>("ask");
  const [savedState, setSavedState] = useState<QuizState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allSelectedAnswers, setAllSelectedAnswers] = useState<Option[][]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Option[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [numericInput, setNumericInput] = useState("");
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [dropdownInput, setDropdownInput] = useState("");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", topicId],
    queryFn: () => api.getQuestions(Number(topicId)),
    enabled: !!topicId,
  });

  const { data: quizState, isLoading: stateLoading } = useQuery({
    queryKey: ["quiz-state", topicId, user?.id],
    queryFn: () => api.getQuizState(user!.id, Number(topicId)),
    enabled: !!topicId && !!user?.id,
  });

  useEffect(() => {
    if (!stateLoading && quizState !== undefined) {
      if (quizState && quizState.lastQuestionIndex > 0) {
        setSavedState(quizState);
        setStartMode("ask");
      } else {
        setStartMode("fresh");
      }
    }
  }, [quizState, stateLoading]);

  const handleResume = () => {
    if (!savedState) return;
    const restored = (savedState.savedAnswers ?? []).map(arr => arr as Option[]);
    setAllSelectedAnswers(restored);
    setCurrentIndex(savedState.lastQuestionIndex);
    setScore(savedState.correctAnswers);
    setStartMode("resume");
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAllSelectedAnswers([]);
    setSelectedAnswers([]);
    setSubmitted(false);
    setScore(0);
    setShowExplanation(false);
    setStartMode("fresh");
  };

  const currentQuestion: Question | undefined = questions?.[currentIndex];
  const totalQuestions = questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((currentIndex + (submitted ? 1 : 0)) / totalQuestions) * 100 : 0;

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
    const qType = currentQuestion?.questionType ?? "single";
    if (qType === "single" || qType === "multiple") {
      if (selectedAnswers.length === 0) { Alert.alert("No Answer", "Please select at least one answer."); return; }
    } else if (qType === "fill_blank") {
      if (!numericInput.trim()) { Alert.alert("No Answer", "Please enter a number."); return; }
    } else if (qType === "dropdown") {
      if (!dropdownInput) { Alert.alert("No Answer", "Please select an option."); return; }
    }
    setSubmitted(true);
    setShowExplanation(false);
    if (qType === "single" || qType === "multiple") {
      const correctSet = new Set(currentQuestion?.correctAnswers ?? []);
      const selectedSet = new Set(selectedAnswers);
      if (selectedSet.size === correctSet.size && [...selectedSet].every(a => correctSet.has(a))) setScore(prev => prev + 1);
    } else if (qType === "fill_blank") {
      const userVal = parseFloat(numericInput);
      const correct = parseFloat(String(currentQuestion?.numericAnswer ?? "0"));
      const tol = parseFloat(String(currentQuestion?.tolerance ?? "0"));
      if (!isNaN(userVal) && Math.abs(userVal - correct) <= tol) setScore(prev => prev + 1);
    } else if (qType === "matching") {
      const rows = (() => { try { return JSON.parse(currentQuestion?.matchingGridRows ?? "[]") as {id: string}[]; } catch { return []; } })();
      const correctMap = (() => { try { return JSON.parse(currentQuestion?.matchingGridAnswers ?? "{}") as Record<string, string>; } catch { return {}; } })();
      const correct = rows.filter(r => matchingSelections[r.id] === correctMap[r.id]).length;
      if (rows.length > 0 && correct === rows.length) setScore(prev => prev + 1);
    } else if (qType === "dropdown") {
      if (dropdownInput === currentQuestion?.dropdownCorrectAnswer) setScore(prev => prev + 1);
    }
    setAllSelectedAnswers(prev => { const updated = [...prev]; updated[currentIndex] = selectedAnswers; return updated; });
  };

  const isCurrentCorrect = useCallback(() => {
    if (!currentQuestion) return false;
    const qType = currentQuestion.questionType;
    if (qType === "single" || qType === "multiple") {
      const correctSet = new Set(currentQuestion.correctAnswers);
      const selectedSet = new Set(selectedAnswers);
      return selectedSet.size === correctSet.size && [...selectedSet].every(a => correctSet.has(a));
    } else if (qType === "fill_blank") {
      const userVal = parseFloat(numericInput);
      const correct = parseFloat(String(currentQuestion.numericAnswer ?? "0"));
      const tol = parseFloat(String(currentQuestion.tolerance ?? "0"));
      return !isNaN(userVal) && Math.abs(userVal - correct) <= tol;
    } else if (qType === "matching") {
      const rows = (() => { try { return JSON.parse(currentQuestion.matchingGridRows ?? "[]") as {id: string}[]; } catch { return []; } })();
      const correctMap = (() => { try { return JSON.parse(currentQuestion.matchingGridAnswers ?? "{}") as Record<string, string>; } catch { return {}; } })();
      return rows.length > 0 && rows.every(r => matchingSelections[r.id] === correctMap[r.id]);
    } else if (qType === "dropdown") {
      return dropdownInput === currentQuestion.dropdownCorrectAnswer;
    }
    return false;
  }, [currentQuestion, selectedAnswers, numericInput, matchingSelections, dropdownInput]);

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      const pct = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
      if (user?.id) {
        try {
          await api.saveProgress({
            userId: user.id, topicId: Number(topicId),
            totalQuestions, correctAnswers: score, scorePercentage: pct, completed: true,
          });
        } catch (e) { console.error("Failed to save progress", e); }
      }
      router.replace({ pathname: "/results/[topicId]", params: { topicId, topicName, score: String(score), total: String(totalQuestions) } });
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswers([]);
      setSubmitted(false);
      setShowExplanation(false);
      setNumericInput("");
      setMatchingSelections({});
      setDropdownInput("");
    }
  };

  const handleExitQuiz = () => {
    Alert.alert(
      "Exit Quiz",
      "Your progress will be saved. You can resume from where you left off.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit & Save",
          onPress: async () => {
            if (user?.id) {
              setSaving(true);
              try {
                const answersToSave = [...allSelectedAnswers];
                if (submitted) answersToSave[currentIndex] = selectedAnswers;
                await api.saveQuizState({
                  userId: user.id, topicId: Number(topicId),
                  lastQuestionIndex: submitted ? currentIndex : Math.max(0, currentIndex),
                  savedAnswers: answersToSave,
                  correctAnswers: score,
                  totalQuestions,
                });
              } catch (e) { console.error("Failed to save quiz state", e); }
              finally { setSaving(false); }
            }
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || stateLoading) {
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

  if (startMode === "ask" && savedState) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerTopicName} numberOfLines={1}>{topicName}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.resumeScreen}>
          <View style={styles.resumeCard}>
            <View style={styles.resumeIcon}>
              <Ionicons name="save-outline" size={40} color={Colors.light.primary} />
            </View>
            <Text style={styles.resumeTitle}>Quiz in Progress</Text>
            <Text style={styles.resumeDesc}>
              You have a saved session for this topic.{"\n"}
              Question {savedState.lastQuestionIndex + 1} of {totalQuestions} · Score: {savedState.correctAnswers}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.resumeBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleResume}
            >
              <Ionicons name="play" size={18} color="#FFF" />
              <Text style={styles.resumeBtnText}>Resume Quiz</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.restartBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleRestart}
            >
              <Ionicons name="refresh" size={16} color={Colors.light.primary} />
              <Text style={styles.restartBtnText}>Start Over</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const qType = currentQuestion?.questionType ?? "single";
  const isMCQMode = qType === "single" || qType === "multiple";
  const canSubmit = (() => {
    switch (qType) {
      case "single": case "multiple": return selectedAnswers.length > 0;
      case "fill_blank": return numericInput.trim().length > 0;
      case "matching": {
        try {
          const rows = JSON.parse(currentQuestion?.matchingGridRows ?? "[]") as {id: string}[];
          return rows.length > 0 && Object.keys(matchingSelections).length >= rows.length;
        } catch { return false; }
      }
      case "dropdown": return dropdownInput.length > 0;
      default: return selectedAnswers.length > 0;
    }
  })();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={handleExitQuiz} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={Colors.light.text} /> : <Ionicons name="exit-outline" size={22} color={Colors.light.text} />}
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
        {qType === "multiple" && (
          <View style={styles.multipleHint}>
            <Ionicons name="information-circle" size={14} color={Colors.light.accent} />
            <Text style={styles.multipleHintText}>Select all correct answers</Text>
          </View>
        )}

        <View style={[
          styles.questionCard,
          isImageQuestion(currentQuestion ?? {}) && styles.questionCardImage,
        ]}>
          <QuestionBody
            questionText={currentQuestion?.questionText}
            questionHtml={currentQuestion?.questionHtml}
            questionImageUrl={currentQuestion?.questionImageUrl}
          />
        </View>

        {/* MCQ / MRQ options */}
        {isMCQMode && (
          <View style={styles.optionsContainer}>
            {OPTIONS.map(option => (
              <OptionButton
                key={option} option={option} text={optionTexts[option]}
                selected={selectedAnswers.includes(option)} submitted={submitted}
                isCorrect={(currentQuestion?.correctAnswers ?? []).includes(option)}
                onPress={() => toggleOption(option)}
                questionType={qType}
              />
            ))}
          </View>
        )}

        {/* Fill in Blank */}
        {qType === "fill_blank" && (
          <View style={styles.fillBlankContainer}>
            <View style={styles.fillBlankRow}>
              {currentQuestion?.numericUnit && isCurrencyUnit(currentQuestion.numericUnit) ? (
                <View style={styles.fillBlankUnit}>
                  <Text style={styles.fillBlankUnitText}>{currentQuestion.numericUnit}</Text>
                </View>
              ) : null}
              <TextInput
                style={[styles.fillBlankInput, submitted && { borderColor: isCurrentCorrect() ? Colors.light.success : Colors.light.error }]}
                value={numericInput}
                onChangeText={t => { if (!submitted) setNumericInput(t.replace(/[^0-9.\-]/g, "")); }}
                keyboardType="decimal-pad"
                placeholder="Enter number…"
                placeholderTextColor={Colors.light.textMuted}
                editable={!submitted}
              />
              {currentQuestion?.numericUnit && !isCurrencyUnit(currentQuestion.numericUnit) ? (
                <View style={styles.fillBlankUnit}>
                  <Text style={styles.fillBlankUnitText}>{currentQuestion.numericUnit}</Text>
                </View>
              ) : null}
            </View>
            {currentQuestion?.allowedDecimalPrecision != null && (
              <Text style={styles.fillBlankHint}>Round to {currentQuestion.allowedDecimalPrecision} decimal place{currentQuestion.allowedDecimalPrecision !== 1 ? "s" : ""}</Text>
            )}
            {submitted && (
              <View style={[styles.fillBlankResult, { backgroundColor: isCurrentCorrect() ? Colors.light.success + "14" : Colors.light.error + "14", borderColor: isCurrentCorrect() ? Colors.light.success : Colors.light.error }]}>
                <Ionicons name={isCurrentCorrect() ? "checkmark-circle" : "close-circle"} size={16} color={isCurrentCorrect() ? Colors.light.success : Colors.light.error} />
                <Text style={[styles.fillBlankResultText, { color: isCurrentCorrect() ? Colors.light.success : Colors.light.error }]}>
                  {isCurrentCorrect() ? "Correct!" : `Correct answer: ${currentQuestion?.numericAnswer}${currentQuestion?.numericUnit ?? ""}${currentQuestion?.tolerance ? ` ±${currentQuestion.tolerance}` : ""}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Matching Grid */}
        {qType === "matching" && (() => {
          const rows = (() => { try { return JSON.parse(currentQuestion?.matchingGridRows ?? "[]") as {id: string; label: string}[]; } catch { return []; } })();
          const cols = (() => { try { return JSON.parse(currentQuestion?.matchingGridColumns ?? "[]") as {id: string; label: string}[]; } catch { return []; } })();
          const correctMap = (() => { try { return JSON.parse(currentQuestion?.matchingGridAnswers ?? "{}") as Record<string, string>; } catch { return {}; } })();
          return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matchingScroll}>
              <View>
                <View style={styles.matchingHeaderRow}>
                  <View style={styles.matchingItemCell}>
                    <Text style={styles.matchingHeaderText}>Item</Text>
                  </View>
                  {cols.map(col => (
                    <View key={col.id} style={styles.matchingColCell}>
                      <Text style={styles.matchingHeaderText} numberOfLines={2}>{col.label}</Text>
                    </View>
                  ))}
                </View>
                {rows.map((row, ri) => (
                  <View key={row.id} style={[styles.matchingRow, ri % 2 === 0 && { backgroundColor: Colors.light.backgroundSecondary + "80" }]}>
                    <View style={styles.matchingItemCell}>
                      <Text style={styles.matchingItemText}>{row.label}</Text>
                    </View>
                    {cols.map(col => {
                      const isSelected = matchingSelections[row.id] === col.id;
                      const isCorrect = correctMap[row.id] === col.id;
                      const radioColor = submitted
                        ? (isCorrect ? Colors.light.success : isSelected ? Colors.light.error : Colors.light.border)
                        : (isSelected ? Colors.light.primary : Colors.light.border);
                      return (
                        <Pressable
                          key={col.id}
                          style={[styles.matchingColCell, submitted && isCorrect && { backgroundColor: Colors.light.success + "14" }, submitted && isSelected && !isCorrect && { backgroundColor: Colors.light.error + "14" }]}
                          onPress={() => { if (!submitted) setMatchingSelections(prev => ({ ...prev, [row.id]: col.id })); }}
                        >
                          <View style={[styles.matchingRadio, { borderColor: radioColor }]}>
                            {isSelected && <View style={[styles.matchingRadioDot, { backgroundColor: submitted ? (isCorrect ? Colors.light.success : Colors.light.error) : Colors.light.primary }]} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        })()}

        {/* Dropdown */}
        {qType === "dropdown" && (() => {
          const opts = (() => { try { return JSON.parse(currentQuestion?.dropdownOptions ?? "[]") as string[]; } catch { return []; } })();
          return (
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Select your answer:</Text>
              {opts.map((opt, i) => {
                const isSelected = dropdownInput === opt;
                const isCorrect = opt === currentQuestion?.dropdownCorrectAnswer;
                let bg = Colors.light.card;
                let borderColor = Colors.light.border;
                let textColor = Colors.light.text;
                let iconName: keyof typeof Ionicons.glyphMap = "radio-button-off-outline";
                if (submitted) {
                  if (isCorrect) { bg = Colors.light.success + "14"; borderColor = Colors.light.success; textColor = Colors.light.success; iconName = "checkmark-circle-outline"; }
                  else if (isSelected) { bg = Colors.light.error + "14"; borderColor = Colors.light.error; textColor = Colors.light.error; iconName = "close-circle-outline"; }
                  else { textColor = Colors.light.textMuted; }
                } else if (isSelected) {
                  bg = Colors.light.primary + "12"; borderColor = Colors.light.primary; textColor = Colors.light.primary; iconName = "radio-button-on";
                }
                return (
                  <Pressable
                    key={i}
                    style={[styles.dropdownOption, { backgroundColor: bg, borderColor }]}
                    onPress={() => { if (!submitted) setDropdownInput(opt); }}
                    disabled={submitted}
                  >
                    <Ionicons name={iconName} size={18} color={submitted ? (isCorrect ? Colors.light.success : isSelected ? Colors.light.error : Colors.light.border) : (isSelected ? Colors.light.primary : Colors.light.border)} />
                    <Text style={[styles.dropdownOptionText, { color: textColor }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })()}

        {submitted && (
          <View style={[styles.feedbackCard, {
            backgroundColor: isCurrentCorrect() ? Colors.light.success + "12" : Colors.light.error + "12",
            borderColor: isCurrentCorrect() ? Colors.light.success : Colors.light.error,
          }]}>
            <View style={styles.feedbackHeader}>
              <Ionicons name={isCurrentCorrect() ? "checkmark-circle" : "close-circle"} size={22}
                color={isCurrentCorrect() ? Colors.light.success : Colors.light.error} />
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
            style={({ pressed }) => [styles.submitBtn, !canSubmit && styles.submitBtnDisabled, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSubmit} disabled={!canSubmit}
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
  headerTopicName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text, textAlign: "center" },
  headerCenter: { flex: 1, gap: 6 },
  progressText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  progressBarBg: { height: 6, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: Colors.light.primary, borderRadius: 3 },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.light.success + "18", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  scoreBoxText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.success },
  fillBlankContainer: { gap: 10 },
  fillBlankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fillBlankInput: { flex: 1, height: 52, borderWidth: 1.5, borderColor: Colors.light.border, borderRadius: 14, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_500Medium", color: Colors.light.text, backgroundColor: Colors.light.card },
  fillBlankUnit: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  fillBlankUnitText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  fillBlankHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, paddingLeft: 4 },
  fillBlankResult: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  fillBlankResultText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  matchingScroll: { borderRadius: 14, borderWidth: 1, borderColor: Colors.light.border, overflow: "hidden" },
  matchingHeaderRow: { flexDirection: "row", backgroundColor: Colors.light.backgroundSecondary },
  matchingRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.light.border },
  matchingItemCell: { width: 150, padding: 12, justifyContent: "center" },
  matchingColCell: { width: 90, padding: 12, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: Colors.light.border },
  matchingHeaderText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, textAlign: "center" },
  matchingItemText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text },
  matchingRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  matchingRadioDot: { width: 10, height: 10, borderRadius: 5 },
  dropdownContainer: { gap: 10 },
  dropdownLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  dropdownOption: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  dropdownOptionText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  resumeScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  resumeCard: {
    width: "100%", backgroundColor: Colors.light.card, borderRadius: 20, padding: 28,
    alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  resumeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.primary + "14", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  resumeTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  resumeDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", lineHeight: 21 },
  resumeBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, paddingHorizontal: 32, marginTop: 8 },
  resumeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  restartBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: Colors.light.primary, borderRadius: 14, height: 48, paddingHorizontal: 28 },
  restartBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  multipleHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.accent + "14", borderRadius: 8, padding: 10 },
  multipleHintText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  questionCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  questionCardImage: {
    padding: 0,
    overflow: "hidden",
  },
  questionText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 26 },
  optionsContainer: { gap: 10 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
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
  submitBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  submitBtnDisabled: { backgroundColor: Colors.light.textMuted },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  nextBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  backBtn2: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtn2Text: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});

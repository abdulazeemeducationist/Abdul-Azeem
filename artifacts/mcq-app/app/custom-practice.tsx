import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api, Question } from "@/hooks/useApi";
import QuestionBody, { isImageQuestion } from "@/components/QuestionBody";

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = typeof OPTIONS[number];

type Screen = "quiz" | "review";

function OptionButton({
  option, text, selected, submitted, isCorrect, onPress,
}: {
  option: Option; text: string; selected: boolean;
  submitted: boolean; isCorrect: boolean; onPress: () => void;
}) {
  let bg = Colors.light.card;
  let borderColor = Colors.light.border;
  let textColor = Colors.light.text;
  let iconName: keyof typeof Ionicons.glyphMap = "radio-button-off-outline";

  if (submitted) {
    if (isCorrect) {
      bg = Colors.light.success + "14"; borderColor = Colors.light.success; textColor = Colors.light.success;
      iconName = selected ? "checkmark-circle" : "checkmark-circle-outline";
    } else if (selected && !isCorrect) {
      bg = Colors.light.error + "14"; borderColor = Colors.light.error; textColor = Colors.light.error;
      iconName = "close-circle";
    } else { textColor = Colors.light.textMuted; }
  } else if (selected) {
    bg = Colors.light.primary + "12"; borderColor = Colors.light.primary; textColor = Colors.light.primary;
    iconName = "radio-button-on";
  }

  return (
    <Pressable
      style={[styles.optionBtn, { backgroundColor: bg, borderColor }]}
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

// ── Review card (shown at end) ─────────────────────────────────────────────
function ReviewCard({ question, userAnswers, index }: { question: Question; userAnswers: Option[]; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const correctSet = new Set(question.correctAnswers);
  const userSet = new Set(userAnswers);
  const isCorrect = userSet.size === correctSet.size && [...userSet].every(a => correctSet.has(a));
  const skipped = userAnswers.length === 0;

  const optionTexts: Record<Option, string> = {
    A: question.optionA, B: question.optionB, C: question.optionC, D: question.optionD,
  };

  return (
    <View style={[styles.reviewCard, isCorrect ? styles.reviewCardCorrect : skipped ? styles.reviewCardSkipped : styles.reviewCardWrong]}>
      <View style={styles.reviewCardHeader}>
        <View style={[styles.reviewNum, { backgroundColor: isCorrect ? Colors.light.success : skipped ? Colors.light.textMuted : Colors.light.error }]}>
          <Text style={styles.reviewNumText}>{index + 1}</Text>
        </View>
        <Ionicons
          name={isCorrect ? "checkmark-circle" : skipped ? "remove-circle-outline" : "close-circle"}
          size={20}
          color={isCorrect ? Colors.light.success : skipped ? Colors.light.textMuted : Colors.light.error}
        />
        <Text style={[styles.reviewStatus, { color: isCorrect ? Colors.light.success : skipped ? Colors.light.textMuted : Colors.light.error }]}>
          {isCorrect ? "Correct" : skipped ? "Skipped" : "Incorrect"}
        </Text>
        {question.topicName ? <Text style={styles.reviewTopic} numberOfLines={1}>{question.topicName}</Text> : null}
      </View>

      <Text style={styles.reviewQuestion}>{question.questionText}</Text>

      <View style={styles.reviewOptions}>
        {OPTIONS.map(opt => {
          const isC = correctSet.has(opt);
          const isU = userSet.has(opt);
          let bg = Colors.light.backgroundSecondary;
          let border = "transparent";
          let tc = Colors.light.textSecondary;
          if (isC) { bg = Colors.light.success + "14"; border = Colors.light.success; tc = Colors.light.success; }
          else if (isU && !isC) { bg = Colors.light.error + "14"; border = Colors.light.error; tc = Colors.light.error; }
          return (
            <View key={opt} style={[styles.reviewOption, { backgroundColor: bg, borderColor: border, borderWidth: isC || isU ? 1.5 : 0 }]}>
              <View style={[styles.reviewOptLabel, { backgroundColor: isC ? Colors.light.success : isU ? Colors.light.error : Colors.light.border }]}>
                <Text style={[styles.reviewOptLabelText, { color: (isC || isU) ? "#FFF" : Colors.light.textMuted }]}>{opt}</Text>
              </View>
              <Text style={[styles.reviewOptText, { color: tc }]} numberOfLines={3}>{optionTexts[opt]}</Text>
              {isC && <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />}
              {isU && !isC && <Ionicons name="close-circle" size={16} color={Colors.light.error} />}
            </View>
          );
        })}
      </View>

      {question.explanation ? (
        <Pressable style={styles.explainToggle} onPress={() => setShowExplanation(v => !v)}>
          <Ionicons name={showExplanation ? "chevron-up" : "chevron-down"} size={14} color={Colors.light.primary} />
          <Text style={styles.explainToggleText}>{showExplanation ? "Hide explanation" : "Show explanation"}</Text>
        </Pressable>
      ) : null}
      {showExplanation && question.explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function CustomPracticeScreen() {
  const { chapterIds, limit, testName, difficulty } = useLocalSearchParams<{ chapterIds: string; limit: string; testName: string; difficulty: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [screen, setScreen] = useState<Screen>("quiz");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Option[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Option[][]>([]);
  const [numericInput, setNumericInput] = useState("");
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [dropdownInput, setDropdownInput] = useState("");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["custom-questions", chapterIds, limit, difficulty],
    queryFn: () => api.getCustomQuestions(chapterIds ?? "", limit ? parseInt(limit) : undefined, difficulty ?? "mixed"),
    enabled: !!chapterIds,
  });

  const totalQuestions = questions?.length ?? 0;
  const currentQuestion: Question | undefined = questions?.[currentIndex];
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
      if (rows.length > 0 && rows.every(r => matchingSelections[r.id] === correctMap[r.id])) setScore(prev => prev + 1);
    } else if (qType === "dropdown") {
      if (dropdownInput === currentQuestion?.dropdownCorrectAnswer) setScore(prev => prev + 1);
    }
    setAllAnswers(prev => { const updated = [...prev]; updated[currentIndex] = selectedAnswers; return updated; });
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

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      setScreen("review");
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

  const handleExit = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Exit test? Your progress will be lost.")) {
        router.back();
      }
    } else {
      Alert.alert("Exit Test", "Your progress will be lost.", [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => router.back() },
      ]);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────
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
        <Text style={styles.emptyTitle}>No Questions Found</Text>
        <Text style={styles.emptyDesc}>No questions are available for the selected chapters.</Text>
        <Pressable style={styles.backBtn2} onPress={() => router.back()}>
          <Text style={styles.backBtn2Text}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Review screen ──────────────────────────────────────────────────────
  if (screen === "review") {
    const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const excellent = pct >= 80;
    const passing = pct >= 50;

    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerTopicName} numberOfLines={1}>{testName ?? "Custom Test"}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.reviewScroll, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Score summary */}
          <View style={[styles.scoreSummary, { borderColor: excellent ? Colors.light.success : passing ? Colors.light.accent : Colors.light.error }]}>
            <Text style={styles.scoreEmoji}>{excellent ? "🏆" : passing ? "👍" : "📚"}</Text>
            <Text style={styles.scoreMain}>{score}/{totalQuestions}</Text>
            <Text style={[styles.scorePct, { color: excellent ? Colors.light.success : passing ? Colors.light.accent : Colors.light.error }]}>
              {pct}%
            </Text>
            <Text style={styles.scoreLabel}>{excellent ? "Excellent!" : passing ? "Good job!" : "Keep practicing!"}</Text>

            <View style={styles.scoreStats}>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.light.success }]}>{score}</Text>
                <Text style={styles.scoreStatLbl}>Correct</Text>
              </View>
              <View style={styles.scoreStatDivider} />
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.light.error }]}>{totalQuestions - score}</Text>
                <Text style={styles.scoreStatLbl}>Incorrect</Text>
              </View>
              <View style={styles.scoreStatDivider} />
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatVal, { color: Colors.light.textMuted }]}>{totalQuestions}</Text>
                <Text style={styles.scoreStatLbl}>Total</Text>
              </View>
            </View>
          </View>

          <Text style={styles.reviewHeading}>Answer Review</Text>

          {questions.map((q, i) => (
            <ReviewCard
              key={q.id}
              question={q}
              userAnswers={allAnswers[i] ?? []}
              index={i}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────────────
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
        <Pressable style={styles.closeBtn} onPress={handleExit}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
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

        {currentQuestion?.topicName ? (
          <View style={styles.topicChip}>
            <Ionicons name="bookmark-outline" size={12} color={Colors.light.textMuted} />
            <Text style={styles.topicChipText} numberOfLines={1}>{currentQuestion.topicName}</Text>
          </View>
        ) : null}

        <View style={[styles.questionCard, isImageQuestion(currentQuestion ?? {}) && styles.questionCardImage]}>
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
              />
            ))}
          </View>
        )}

        {/* Fill in Blank */}
        {qType === "fill_blank" && (
          <View style={styles.fillBlankContainer}>
            <View style={styles.fillBlankRow}>
              <TextInput
                style={[styles.fillBlankInput, submitted && { borderColor: isCurrentCorrect() ? Colors.light.success : Colors.light.error }]}
                value={numericInput}
                onChangeText={t => { if (!submitted) setNumericInput(t.replace(/[^0-9.\-]/g, "")); }}
                keyboardType="decimal-pad"
                placeholder="Enter number…"
                placeholderTextColor={Colors.light.textMuted}
                editable={!submitted}
              />
              {currentQuestion?.numericUnit ? (
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
                  {isCurrentCorrect() ? "Correct!" : `Correct: ${currentQuestion?.numericAnswer}${currentQuestion?.numericUnit ?? ""}${currentQuestion?.tolerance ? ` ±${currentQuestion.tolerance}` : ""}`}
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
              {currentQuestion?.explanation ? (
                <Pressable onPress={() => setShowExplanation(!showExplanation)} style={styles.explainToggle}>
                  <Text style={styles.explainToggleText}>{showExplanation ? "Hide" : "Explain"}</Text>
                </Pressable>
              ) : null}
            </View>
            {showExplanation && currentQuestion?.explanation ? (
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        {!submitted ? (
          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitBtnText}>Submit Answer</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 >= totalQuestions ? "View Results & Review" : "Next Question"}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.light.background },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 32 },
  backBtn2: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtn2Text: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },

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

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  multipleHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.accent + "14", borderRadius: 8, padding: 10 },
  multipleHintText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  topicChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  topicChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  questionCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  questionCardImage: { padding: 0, overflow: "hidden" },
  optionsContainer: { gap: 10 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  optionLabel: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionLabelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  optionIcon: { marginLeft: 4 },
  feedbackCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  explainToggle: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  explainToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  explanationText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },

  footer: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: Colors.light.background },
  submitBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  submitBtnDisabled: { backgroundColor: Colors.light.textMuted },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  nextBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  // Review styles
  reviewScroll: { padding: 16, gap: 14 },
  scoreSummary: {
    backgroundColor: Colors.light.card, borderRadius: 20, padding: 24,
    alignItems: "center", gap: 6, borderWidth: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  scoreEmoji: { fontSize: 40 },
  scoreMain: { fontSize: 40, fontFamily: "Inter_700Bold", color: Colors.light.text, lineHeight: 48 },
  scorePct: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, marginBottom: 8 },
  scoreStats: { flexDirection: "row", alignItems: "center", gap: 0, marginTop: 4 },
  scoreStat: { alignItems: "center", paddingHorizontal: 20 },
  scoreStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreStatLbl: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, marginTop: 2 },
  scoreStatDivider: { width: 1, height: 36, backgroundColor: Colors.light.border },

  reviewHeading: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text, marginTop: 4 },

  reviewCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: Colors.light.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  reviewCardCorrect: { borderColor: Colors.light.success + "50" },
  reviewCardWrong: { borderColor: Colors.light.error + "50" },
  reviewCardSkipped: { borderColor: Colors.light.border },
  reviewCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  reviewNumText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },
  reviewStatus: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewTopic: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "right" },
  reviewQuestion: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 21 },
  reviewOptions: { gap: 6 },
  reviewOption: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10 },
  reviewOptLabel: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  reviewOptLabelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  reviewOptText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  explanationBox: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, padding: 12 },
});

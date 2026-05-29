import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
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
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";
import { api } from "@/hooks/useApi";

type InputMode = "type" | "image" | "word";
type Difficulty = "easy" | "medium" | "hard";

const WORD_EDITOR_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #fff; }
  #toolbar {
    position: sticky; top: 0; background: #f8f8f8; border-bottom: 1px solid #e0e0e0;
    padding: 8px 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  }
  #toolbar button {
    background: #fff; border: 1px solid #d0d0d0; border-radius: 6px;
    padding: 4px 10px; font-size: 13px; cursor: pointer; color: #333;
  }
  #toolbar button:active { background: #e0e0e0; }
  #hint {
    color: #aaa; font-size: 14px; position: absolute;
    top: 56px; left: 16px; pointer-events: none;
  }
  #editor {
    min-height: 180px; padding: 12px 16px; outline: none;
    font-size: 15px; line-height: 1.6; color: #111;
  }
  #editor table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  #editor td, #editor th { border: 1px solid #bbb; padding: 6px 8px; }
  #editor th { background: #f0f0f0; font-weight: bold; }
  #editor img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div id="toolbar">
  <button onclick="document.execCommand('bold')"><b>B</b></button>
  <button onclick="document.execCommand('italic')"><i>I</i></button>
  <button onclick="document.execCommand('underline')"><u>U</u></button>
  <button onclick="document.execCommand('subscript')">X₂</button>
  <button onclick="document.execCommand('superscript')">X²</button>
  <button onclick="sendContent()">✓ Done</button>
</div>
<span id="hint">Paste your Word content here…</span>
<div id="editor" contenteditable="true" onInput="onEdit()" onPaste="onPaste()"></div>
<script>
function onEdit() {
  var el = document.getElementById('editor');
  document.getElementById('hint').style.display = el.innerHTML.replace(/<br>/gi,'').trim() ? 'none' : 'block';
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html: el.innerHTML }));
}
function onPaste() {
  setTimeout(function() { onEdit(); }, 50);
}
function sendContent() {
  var el = document.getElementById('editor');
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'done', html: el.innerHTML }));
}
</script>
</body>
</html>
`;

export default function AddMcqScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ subjectId?: string; chapterId?: string }>();

  const [inputMode, setInputMode] = useState<InputMode>("type");

  const [qFormSubjectId, setQFormSubjectId] = useState<number | null>(
    params.subjectId ? parseInt(params.subjectId) : null
  );
  const [qFormChapterId, setQFormChapterId] = useState<number | null>(
    params.chapterId ? parseInt(params.chapterId) : null
  );
  const [topicId, setTopicId] = useState<number | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [questionHtml, setQuestionHtml] = useState("");
  const [questionImageUri, setQuestionImageUri] = useState<string | null>(null);

  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: allSubjects } = useQuery({
    queryKey: ["adminSubjects"],
    queryFn: api.getAllSubjects,
  });

  const { data: qFormChapters } = useQuery({
    queryKey: ["chapters", qFormSubjectId],
    queryFn: () => api.getChapters(qFormSubjectId!),
    enabled: !!qFormSubjectId,
  });

  const { data: qFormTopics } = useQuery({
    queryKey: ["topics", qFormChapterId],
    queryFn: () => api.getTopics(qFormChapterId!),
    enabled: !!qFormChapterId,
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to import images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpeg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        setQuestionImageUri(`data:${mime};base64,${asset.base64}`);
      } else {
        setQuestionImageUri(asset.uri);
      }
    }
  };

  const toggleAnswer = (letter: string) => {
    setCorrectAnswers(prev =>
      prev.includes(letter) ? prev.filter(a => a !== letter) : [...prev, letter]
    );
  };

  const getBody = (): { questionText?: string; questionHtml?: string; questionImageUrl?: string } => {
    if (inputMode === "type") return { questionText };
    if (inputMode === "image") return { questionImageUrl: questionImageUri ?? undefined };
    if (inputMode === "word") return { questionHtml };
    return {};
  };

  const validate = (): string | null => {
    if (!topicId) return "Please select a topic.";
    if (inputMode === "type" && !questionText.trim()) return "Please type the question body.";
    if (inputMode === "image" && !questionImageUri) return "Please select an image.";
    if (inputMode === "word" && !questionHtml.replace(/<[^>]*>/g, "").trim()) return "Please paste your Word content.";
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) return "All four options (A–D) are required.";
    if (!correctAnswers.length) return "Please select at least one correct answer.";
    if (!explanation.trim()) return "An explanation is required.";
    return null;
  };

  const handleSave = async () => {
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      const body = getBody();
      const answers = correctAnswers.sort();
      await api.createQuestion({
        topicId: topicId!,
        ...body,
        optionA, optionB, optionC, optionD,
        correctAnswers: answers,
        explanation,
        questionType: answers.length > 1 ? "multiple" : "single",
        difficulty,
      });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save question.");
      setSaving(false);
    }
  };

  const inputModes: { key: InputMode; label: string; icon: string }[] = [
    { key: "type", label: "Type", icon: "create-outline" },
    { key: "image", label: "Image", icon: "image-outline" },
    { key: "word", label: "Word", icon: "document-text-outline" },
  ];

  const answerOptions = ["A", "B", "C", "D"];
  const difficultyOptions: { key: Difficulty; label: string; color: string }[] = [
    { key: "easy", label: "Easy", color: "#16A34A" },
    { key: "medium", label: "Medium", color: "#D97706" },
    { key: "hard", label: "Hard", color: "#DC2626" },
  ];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={s.headerTitle}>Add MCQ</Text>
        <Pressable
          style={[s.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveHeaderBtnText}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40), gap: 20, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── SECTION 1: LOCATION ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>LOCATION</Text>

          <Text style={s.fieldLabel}>Course</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {(allSubjects ?? []).map((sub: any) => (
              <Pressable
                key={sub.id}
                style={[s.chip, qFormSubjectId === sub.id && s.chipActive]}
                onPress={() => {
                  setQFormSubjectId(sub.id);
                  setQFormChapterId(null);
                  setTopicId(null);
                }}
              >
                <Text style={[s.chipText, qFormSubjectId === sub.id && s.chipTextActive]} numberOfLines={1}>
                  {sub.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {qFormSubjectId && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Chapter</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                {(qFormChapters ?? []).map((ch: any) => (
                  <Pressable
                    key={ch.id}
                    style={[s.chip, qFormChapterId === ch.id && s.chipActive]}
                    onPress={() => { setQFormChapterId(ch.id); setTopicId(null); }}
                  >
                    <Text style={[s.chipText, qFormChapterId === ch.id && s.chipTextActive]} numberOfLines={1}>
                      {ch.name}
                    </Text>
                  </Pressable>
                ))}
                {!qFormChapters?.length && <Text style={s.emptyChip}>No chapters yet</Text>}
              </ScrollView>
            </>
          )}

          {qFormChapterId && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>
                Topic <Text style={{ color: Colors.light.error }}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                {(qFormTopics ?? []).map((t: any) => (
                  <Pressable
                    key={t.id}
                    style={[s.chip, topicId === t.id && s.chipActive]}
                    onPress={() => setTopicId(t.id)}
                  >
                    <Text style={[s.chipText, topicId === t.id && s.chipTextActive]} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
                {!qFormTopics?.length && <Text style={s.emptyChip}>No topics yet</Text>}
              </ScrollView>
            </>
          )}
        </View>

        {/* ── SECTION 2: QUESTION BODY ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUESTION BODY</Text>

          {/* Mode Selector */}
          <View style={s.modeTabs}>
            {inputModes.map(m => (
              <Pressable
                key={m.key}
                style={[s.modeTab, inputMode === m.key && s.modeTabActive]}
                onPress={() => setInputMode(m.key)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={18}
                  color={inputMode === m.key ? Colors.light.primary : Colors.light.textMuted}
                />
                <Text style={[s.modeTabText, inputMode === m.key && s.modeTabTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* TYPE MODE */}
          {inputMode === "type" && (
            <TextInput
              style={s.bodyInput}
              value={questionText}
              onChangeText={setQuestionText}
              placeholder="Type the question body here…"
              placeholderTextColor={Colors.light.textMuted}
              multiline
              textAlignVertical="top"
              numberOfLines={6}
            />
          )}

          {/* IMAGE MODE */}
          {inputMode === "image" && (
            <View style={s.imageZone}>
              {questionImageUri ? (
                <>
                  <Image
                    source={{ uri: questionImageUri }}
                    style={s.imagePreview}
                    contentFit="contain"
                  />
                  <Pressable style={s.changeImageBtn} onPress={pickImage}>
                    <Ionicons name="refresh-outline" size={16} color={Colors.light.primary} />
                    <Text style={s.changeImageBtnText}>Change Image</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={s.imagePickBtn} onPress={pickImage}>
                  <Ionicons name="image-outline" size={40} color={Colors.light.textMuted} />
                  <Text style={s.imagePickLabel}>Tap to select an image</Text>
                  <Text style={s.imagePickSub}>JPG, PNG from photo library</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* WORD MODE */}
          {inputMode === "word" && (
            <View style={s.wordZone}>
              <View style={s.wordInfoRow}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.light.textMuted} />
                <Text style={s.wordInfoText}>
                  Paste from Microsoft Word below — formatting and tables are preserved.
                </Text>
              </View>
              <View style={s.webviewWrapper}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: WORD_EDITOR_HTML }}
                  style={{ flex: 1, minHeight: 260 }}
                  scrollEnabled={false}
                  onMessage={event => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.type === "change" || data.type === "done") {
                        setQuestionHtml(data.html ?? "");
                      }
                    } catch {}
                  }}
                  keyboardDisplayRequiresUserAction={false}
                />
              </View>
              {!!questionHtml && questionHtml.replace(/<[^>]*>/g, "").trim() && (
                <View style={s.wordPreviewBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={s.wordPreviewBadgeText}>Content received — ready to save</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── SECTION 3: OPTIONS ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>OPTIONS</Text>
          {[
            { letter: "A", value: optionA, setter: setOptionA },
            { letter: "B", value: optionB, setter: setOptionB },
            { letter: "C", value: optionC, setter: setOptionC },
            { letter: "D", value: optionD, setter: setOptionD },
          ].map(({ letter, value, setter }) => (
            <View key={letter} style={s.optionRow}>
              <View style={[s.optionBadge, correctAnswers.includes(letter) && s.optionBadgeCorrect]}>
                <Text style={[s.optionBadgeText, correctAnswers.includes(letter) && s.optionBadgeTextCorrect]}>
                  {letter}
                </Text>
              </View>
              <TextInput
                style={s.optionInput}
                value={value}
                onChangeText={setter}
                placeholder={`Option ${letter}`}
                placeholderTextColor={Colors.light.textMuted}
                multiline
              />
            </View>
          ))}
        </View>

        {/* ── SECTION 4: CORRECT ANSWER ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CORRECT ANSWER(S)</Text>
          <Text style={s.fieldLabelSub}>Tap one or more letters</Text>
          <View style={s.answerRow}>
            {answerOptions.map(letter => (
              <Pressable
                key={letter}
                style={[s.answerBtn, correctAnswers.includes(letter) && s.answerBtnActive]}
                onPress={() => toggleAnswer(letter)}
              >
                {correctAnswers.includes(letter) && (
                  <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text style={[s.answerBtnText, correctAnswers.includes(letter) && s.answerBtnTextActive]}>
                  {letter}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── SECTION 5: DIFFICULTY ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DIFFICULTY</Text>
          <View style={s.diffRow}>
            {difficultyOptions.map(d => (
              <Pressable
                key={d.key}
                style={[s.diffBtn, difficulty === d.key && { backgroundColor: d.color + "18", borderColor: d.color }]}
                onPress={() => setDifficulty(d.key)}
              >
                <Text style={[s.diffBtnText, difficulty === d.key && { color: d.color, fontFamily: "Inter_700Bold" }]}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── SECTION 6: EXPLANATION ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            EXPLANATION <Text style={{ color: Colors.light.error }}>*</Text>
          </Text>
          <TextInput
            style={[s.bodyInput, { minHeight: 80 }]}
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Why is the answer correct?"
            placeholderTextColor={Colors.light.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.light.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Save Button */}
        <Pressable
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Save Question</Text>
              </>
          }
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  saveHeaderBtn: {
    backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, minWidth: 60, alignItems: "center",
  },
  saveHeaderBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  section: {
    backgroundColor: Colors.light.surface,
    marginHorizontal: 16, borderRadius: 14,
    padding: 16, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted,
    letterSpacing: 1.1, marginBottom: 4,
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  fieldLabelSub: { fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", marginTop: -4 },

  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.light.border, borderWidth: 1.5, borderColor: "transparent",
  },
  chipActive: { backgroundColor: Colors.light.primary + "14", borderColor: Colors.light.primary },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  chipTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },
  emptyChip: { fontSize: 13, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 7 },

  modeTabs: {
    flexDirection: "row", gap: 8, marginBottom: 8,
  },
  modeTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.light.background,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  modeTabActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + "0D",
  },
  modeTabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  modeTabTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  bodyInput: {
    backgroundColor: Colors.light.background,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 10, padding: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text,
    minHeight: 120,
  },

  imageZone: { alignItems: "center", gap: 10 },
  imagePickBtn: {
    width: "100%", minHeight: 160,
    borderWidth: 2, borderColor: Colors.light.border, borderStyle: "dashed",
    borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.light.background, padding: 20,
  },
  imagePickLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted },
  imagePickSub: { fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular" },
  imagePreview: { width: "100%", height: 200, borderRadius: 10 },
  changeImageBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.light.primary + "14",
  },
  changeImageBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

  wordZone: { gap: 8 },
  wordInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  wordInfoText: { flex: 1, fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", lineHeight: 17 },
  webviewWrapper: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    overflow: "hidden", minHeight: 260,
    backgroundColor: "#fff",
  },
  wordPreviewBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#DCFCE7", padding: 8, borderRadius: 8,
  },
  wordPreviewBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#166534" },

  optionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  optionBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.light.border, alignItems: "center", justifyContent: "center",
    marginTop: 8, flexShrink: 0,
  },
  optionBadgeCorrect: { backgroundColor: "#16A34A" },
  optionBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  optionBadgeTextCorrect: { color: "#fff" },
  optionInput: {
    flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: Colors.light.background,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text,
  },

  answerRow: { flexDirection: "row", gap: 10 },
  answerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  answerBtnActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  answerBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  answerBtnTextActive: { color: "#fff" },

  diffRow: { flexDirection: "row", gap: 10 },
  diffBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center", borderWidth: 1.5, borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  diffBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },

  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.light.error + "14",
    marginHorizontal: 16, padding: 12, borderRadius: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.error },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.light.primary, marginHorizontal: 16,
    paddingVertical: 15, borderRadius: 14,
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});

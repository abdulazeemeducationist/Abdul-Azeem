import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
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
import WebView from "react-native-webview";
import Colors from "@/constants/colors";
import { api } from "@/hooks/useApi";

type InputMode = "type" | "image";
type Difficulty = "easy" | "medium" | "hard";

const CKEDITOR_HTML = (placeholder: string, initialHtml?: string) =>
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.ckeditor.com/ckeditor5/43.3.1/ckeditor5.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #fff; overflow: hidden; }
    .ck-editor { display: flex; flex-direction: column; height: 100%; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
    .ck.ck-toolbar { flex-wrap: wrap !important; border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #f9fafb !important; padding: 4px 6px !important; border-radius: 0 !important; }
    .ck.ck-toolbar .ck-toolbar__separator { background: #d1d5db !important; }
    .ck-editor__main { flex: 1; overflow: hidden; }
    .ck-editor__editable_inline { height: 100% !important; min-height: unset !important; overflow-y: auto !important; padding: 12px 16px !important; font-size: 15px !important; line-height: 1.75 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
    .ck-editor__editable.ck-focused { outline: none !important; box-shadow: none !important; border: none !important; }
    .ck-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    .ck-content table td, .ck-content table th { border: 1px solid #d1d5db; padding: 6px 10px; vertical-align: top; }
    .ck-content table th { background: #f3f4f6; font-weight: 600; }
    .ck-content p { margin-bottom: 4px; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script src="https://cdn.ckeditor.com/ckeditor5/43.3.1/ckeditor5.umd.js"></script>
  <script>
    var placeholder = ${JSON.stringify(placeholder)};
    var initialHtml = ${JSON.stringify(initialHtml ?? "")};
    var {
      ClassicEditor, Essentials, Bold, Italic, Underline, Strikethrough,
      Subscript, Superscript, FontFamily, FontSize,
      Heading, List, Paragraph,
      Table, TableToolbar, TableProperties, TableCellProperties,
      PasteFromOffice
    } = CKEDITOR5;

    ClassicEditor.create(document.getElementById('editor'), {
      plugins: [
        Essentials, Bold, Italic, Underline, Strikethrough,
        Subscript, Superscript, FontFamily, FontSize,
        Heading, List, Paragraph,
        Table, TableToolbar, TableProperties, TableCellProperties,
        PasteFromOffice
      ],
      toolbar: {
        items: [
          'heading', '|',
          'fontFamily', 'fontSize', '|',
          'bold', 'italic', 'underline', 'strikethrough', '|',
          'subscript', 'superscript', '|',
          'bulletedList', 'numberedList', '|',
          'insertTable', '|',
          'undo', 'redo'
        ],
        shouldNotGroupWhenFull: true
      },
      table: {
        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
      },
      fontFamily: {
        options: ['default', 'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana']
      },
      fontSize: {
        options: [10, 12, 'default', 16, 18, 20, 24, 28, 36]
      },
      placeholder: placeholder
    }).then(function(editor) {
      window.ckEditor = editor;
      if (initialHtml) {
        editor.setData(initialHtml);
      }
      editor.model.document.on('change:data', function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'change', html: editor.getData() })
        );
      });
    }).catch(function(err) {
      document.getElementById('editor').innerHTML =
        '<div style="padding:16px;color:#dc2626;font-family:Arial;font-size:14px">CKEditor failed to load. Check your internet connection.<br><small style="color:#9ca3af">' + err.message + '</small></div>';
    });
  </script>
</body>
</html>`;

export default function EditMcqScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const questionId = id ? parseInt(id) : null;

  const { data: question, isLoading, error: fetchError } = useQuery({
    queryKey: ["adminQuestion", questionId],
    queryFn: () => api.getAdminQuestion(questionId!),
    enabled: !!questionId,
  });

  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [questionHtml, setQuestionHtml] = useState("");
  const [questionImageUri, setQuestionImageUri] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);

  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [marks, setMarks] = useState("1");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const { data: allSubjects } = useQuery({
    queryKey: ["adminSubjects"],
    queryFn: api.getAllSubjects,
  });

  const [qFormSubjectId, setQFormSubjectId] = useState<number | null>(null);
  const [qFormChapterId, setQFormChapterId] = useState<number | null>(null);

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

  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!question || prefilled) return;
    setTopicId(question.topicId);
    setOptionA(question.optionA);
    setOptionB(question.optionB);
    setOptionC(question.optionC);
    setOptionD(question.optionD);
    setCorrectAnswers(question.correctAnswers as string[]);
    setExplanation(question.explanation);
    setDifficulty((question.difficulty as Difficulty) ?? "medium");
    setMarks(String(question.marks ?? 1));

    if (question.questionImageUrl) {
      setInputMode("image");
      setQuestionImageUri(question.questionImageUrl);
    } else {
      setInputMode("type");
      setQuestionHtml(question.questionHtml ?? question.questionText ?? "");
    }
    setPrefilled(true);
    setEditorKey(k => k + 1);
  }, [question]);

  useEffect(() => {
    if (!question || !allSubjects) return;
    const findSubject = async () => {
      const topics = await api.getTopics ? null : null;
      for (const sub of (allSubjects as any[])) {
        try {
          const chapters = await api.getChapters(sub.id);
          for (const ch of chapters) {
            try {
              const tps = await api.getTopics(ch.id);
              if (tps.some((t: any) => t.id === question.topicId)) {
                setQFormSubjectId(sub.id);
                setQFormChapterId(ch.id);
                return;
              }
            } catch {}
          }
        } catch {}
      }
    };
    findSubject();
  }, [question, allSubjects]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to import images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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

  const validate = (): string | null => {
    if (!topicId) return "Please select a topic.";
    if (inputMode === "type" && !questionHtml.replace(/<[^>]*>/g, "").trim())
      return "Please enter the question body.";
    if (inputMode === "image" && !questionImageUri) return "Please select an image.";
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim())
      return "All four options (A–D) are required.";
    if (!correctAnswers.length) return "Please select at least one correct answer.";
    if (!explanation.trim()) return "An explanation is required.";
    const m = parseInt(marks);
    if (isNaN(m) || m < 1) return "Marks must be a positive number.";
    return null;
  };

  const handleSave = async () => {
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      const answers = correctAnswers.sort();
      const body = inputMode === "image"
        ? { questionImageUrl: questionImageUri ?? undefined }
        : { questionHtml };

      await api.updateQuestion(questionId!, {
        topicId: topicId!,
        ...body,
        optionA, optionB, optionC, optionD,
        correctAnswers: answers,
        explanation,
        questionType: answers.length > 1 ? "multiple" : "single",
        difficulty,
        marks: parseInt(marks) || 1,
      });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      qc.invalidateQueries({ queryKey: ["adminQuestion", questionId] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update question.");
      setSaving(false);
    }
  };

  const answerOptions = ["A", "B", "C", "D"];
  const difficultyOptions: { key: Difficulty; label: string; color: string }[] = [
    { key: "easy", label: "Easy", color: "#16A34A" },
    { key: "medium", label: "Medium", color: "#D97706" },
    { key: "hard", label: "Hard", color: "#DC2626" },
  ];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={{ marginTop: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular" }}>
          Loading question…
        </Text>
      </View>
    );
  }

  if (fetchError || !question) {
    return (
      <View style={[s.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
        <Text style={{ color: Colors.light.error, fontFamily: "Inter_500Medium" }}>
          Failed to load question.
        </Text>
        <Pressable onPress={() => router.back()} style={s.saveHeaderBtn}>
          <Text style={s.saveHeaderBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const initialHtml = inputMode === "type"
    ? (question.questionHtml ?? question.questionText ?? "")
    : undefined;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={s.headerTitle}>Edit Question</Text>
        <Pressable
          style={[s.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveHeaderBtnText}>Update</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40), gap: 20, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
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

          {topicId && question.topicName && (
            <View style={s.topicConfirm}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.light.success} />
              <Text style={s.topicConfirmText}>Topic: {question.topicName}</Text>
            </View>
          )}
        </View>

        {/* ── SECTION 2: QUESTION BODY ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUESTION BODY</Text>

          <View style={s.modeTabs}>
            {(["type", "image"] as InputMode[]).map(m => (
              <Pressable
                key={m}
                style={[s.modeTab, inputMode === m && s.modeTabActive]}
                onPress={() => setInputMode(m)}
              >
                <Ionicons
                  name={m === "type" ? "create-outline" : "image-outline"}
                  size={16}
                  color={inputMode === m ? Colors.light.primary : Colors.light.textMuted}
                />
                <Text style={[s.modeTabText, inputMode === m && s.modeTabTextActive]}>
                  {m === "type" ? "Rich Text" : "Image"}
                </Text>
              </Pressable>
            ))}
          </View>

          {inputMode === "type" && (
            <View style={s.webviewWrapper}>
              <WebView
                key={editorKey}
                originWhitelist={["*"]}
                source={{
                  html: CKEDITOR_HTML(
                    "Edit the question body here…",
                    initialHtml
                  ),
                  baseUrl: "https://cdn.ckeditor.com",
                }}
                style={{ flex: 1 }}
                scrollEnabled
                nestedScrollEnabled
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                allowUniversalAccessFromFileURLs
                onMessage={event => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === "change") setQuestionHtml(data.html ?? "");
                  } catch {}
                }}
                keyboardDisplayRequiresUserAction={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

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

        {/* ── SECTION 5: DIFFICULTY & MARKS ── */}
        <View style={s.section}>
          <View style={s.diffMarksRow}>
            <View style={{ flex: 1 }}>
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
            <View style={s.marksBox}>
              <Text style={s.sectionLabel}>MARKS</Text>
              <View style={s.marksInputRow}>
                <Pressable
                  style={s.marksBtn}
                  onPress={() => setMarks(m => String(Math.max(1, parseInt(m || "1") - 1)))}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={18} color={Colors.light.primary} />
                </Pressable>
                <TextInput
                  style={s.marksInput}
                  value={marks}
                  onChangeText={v => setMarks(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  textAlign="center"
                  placeholderTextColor={Colors.light.textMuted}
                />
                <Pressable
                  style={s.marksBtn}
                  onPress={() => setMarks(m => String(Math.min(100, parseInt(m || "1") + 1)))}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={18} color={Colors.light.primary} />
                </Pressable>
              </View>
              <Text style={s.marksLabel}>{parseInt(marks) === 1 ? "1 mark" : `${marks} marks`}</Text>
            </View>
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

        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.light.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Update Question</Text>
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
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  saveHeaderBtn: {
    backgroundColor: Colors.light.primary, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, minWidth: 70, alignItems: "center",
  },
  saveHeaderBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  section: {
    backgroundColor: Colors.light.card,
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

  topicConfirm: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4,
    backgroundColor: Colors.light.success + "10", borderRadius: 8, padding: 8,
  },
  topicConfirmText: { fontSize: 12, color: Colors.light.success, fontFamily: "Inter_500Medium" },

  modeTabs: { flexDirection: "row", gap: 8, marginBottom: 4 },
  modeTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.light.background,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  modeTabActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + "0D",
  },
  modeTabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  modeTabTextActive: { color: Colors.light.primary, fontFamily: "Inter_600SemiBold" },

  webviewWrapper: {
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 10, overflow: "hidden",
    height: 420,
    backgroundColor: "#fff",
  },

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
  imagePickLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  imagePickSub: { fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular" },
  imagePreview: { width: "100%", height: 200, borderRadius: 10 },
  changeImageBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.light.primary + "12", borderWidth: 1, borderColor: Colors.light.primary,
  },
  changeImageBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.primary },

  optionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  optionBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.light.background, borderWidth: 1.5, borderColor: Colors.light.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  optionBadgeCorrect: { backgroundColor: Colors.light.primary + "18", borderColor: Colors.light.primary },
  optionBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  optionBadgeTextCorrect: { color: Colors.light.primary },
  optionInput: {
    flex: 1, backgroundColor: Colors.light.background,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text,
    minHeight: 40,
  },

  answerRow: { flexDirection: "row", gap: 10 },
  answerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.light.background, borderWidth: 1.5, borderColor: Colors.light.border,
  },
  answerBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  answerBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  answerBtnTextActive: { color: "#fff" },

  diffMarksRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  diffRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  diffBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center", borderWidth: 1.5, borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  diffBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },

  marksBox: { alignItems: "center", minWidth: 90 },
  marksInputRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    backgroundColor: Colors.light.background, paddingHorizontal: 4, paddingVertical: 4,
    marginTop: 4,
  },
  marksBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.light.primary + "14",
    alignItems: "center", justifyContent: "center",
  },
  marksInput: {
    width: 38, height: 30,
    fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.text,
  },
  marksLabel: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, marginTop: 4,
  },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.error + "10", borderRadius: 10,
    padding: 12, marginHorizontal: 16,
    borderWidth: 1, borderColor: Colors.light.error + "30",
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.error },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    marginHorizontal: 16,
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

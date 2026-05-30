import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";
import { api } from "@/hooks/useApi";

type Difficulty = "easy" | "medium" | "hard";

const CKEDITOR_HTML = (placeholder: string) => `<!DOCTYPE html>
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
    var {
      ClassicEditor, Essentials, Bold, Italic, Underline, Strikethrough,
      Subscript, Superscript, FontFamily, FontSize,
      Heading, List, Paragraph,
      Table, TableToolbar, TableProperties, TableCellProperties
    } = CKEDITOR5;

    ClassicEditor.create(document.getElementById('editor'), {
      plugins: [
        Essentials, Bold, Italic, Underline, Strikethrough,
        Subscript, Superscript, FontFamily, FontSize,
        Heading, List, Paragraph,
        Table, TableToolbar, TableProperties, TableCellProperties
      ],
      toolbar: {
        items: [
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

interface DropdownOption { id: number; name: string }

function DropdownSelect({
  placeholder,
  options,
  selectedId,
  onSelect,
  disabled,
}: {
  placeholder: string;
  options: DropdownOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === selectedId);

  return (
    <>
      <Pressable
        style={[s.dropdownBtn, disabled && s.dropdownBtnDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text
          style={[s.dropdownBtnText, !selected && s.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {selected ? selected.name : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? Colors.light.textMuted : Colors.light.textSecondary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{placeholder}</Text>
                  <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={Colors.light.textSecondary} />
                  </Pressable>
                </View>
                {options.length === 0 ? (
                  <View style={s.modalEmpty}>
                    <Text style={s.modalEmptyText}>No options available</Text>
                  </View>
                ) : (
                  <FlatList
                    data={options}
                    keyExtractor={item => String(item.id)}
                    style={{ maxHeight: 320 }}
                    renderItem={({ item }) => (
                      <Pressable
                        style={[s.modalItem, item.id === selectedId && s.modalItemActive]}
                        onPress={() => { onSelect(item.id); setOpen(false); }}
                      >
                        <Text
                          style={[s.modalItemText, item.id === selectedId && s.modalItemTextActive]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        {item.id === selectedId && (
                          <Ionicons name="checkmark" size={16} color={Colors.light.primary} />
                        )}
                      </Pressable>
                    )}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

export default function AddMcqScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ subjectId?: string; chapterId?: string }>();

  const [qFormSubjectId, setQFormSubjectId] = useState<number | null>(
    params.subjectId ? parseInt(params.subjectId) : null
  );
  const [qFormChapterId, setQFormChapterId] = useState<number | null>(
    params.chapterId ? parseInt(params.chapterId) : null
  );
  const [topicId, setTopicId] = useState<number | null>(null);

  const [questionHtml, setQuestionHtml] = useState("");

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

  const toggleAnswer = (letter: string) => {
    setCorrectAnswers(prev =>
      prev.includes(letter) ? prev.filter(a => a !== letter) : [...prev, letter]
    );
  };

  const validate = (): string | null => {
    if (!topicId) return "Please select a topic.";
    if (!questionHtml.replace(/<[^>]*>/g, "").trim())
      return "Please type the question body.";
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
      await api.createQuestion({
        topicId: topicId!,
        questionHtml,
        optionA, optionB, optionC, optionD,
        correctAnswers: answers,
        explanation,
        questionType: answers.length > 1 ? "multiple" : "single",
        difficulty,
        marks: parseInt(marks) || 1,
      });
      qc.invalidateQueries({ queryKey: ["adminQuestions"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save question.");
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

  const chapterOptions: DropdownOption[] = (qFormChapters ?? []).map((ch: any) => ({ id: ch.id, name: ch.name }));
  const topicOptions: DropdownOption[] = (qFormTopics ?? []).map((t: any) => ({ id: t.id, name: t.name }));

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
              <Text style={[s.fieldLabel, { marginTop: 6 }]}>Chapter</Text>
              <DropdownSelect
                placeholder="Select a chapter…"
                options={chapterOptions}
                selectedId={qFormChapterId}
                onSelect={(id) => { setQFormChapterId(id); setTopicId(null); }}
                disabled={!chapterOptions.length}
              />
            </>
          )}

          {qFormChapterId && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 6 }]}>
                Topic <Text style={{ color: Colors.light.error }}>*</Text>
              </Text>
              <DropdownSelect
                placeholder="Select a topic…"
                options={topicOptions}
                selectedId={topicId}
                onSelect={setTopicId}
                disabled={!topicOptions.length}
              />
            </>
          )}
        </View>

        {/* ── SECTION 2: QUESTION BODY ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUESTION BODY</Text>
          <Text style={s.fieldLabelSub}>
            Use the toolbar to format text, change font/size, or insert and edit tables.
          </Text>
          <View style={s.webviewWrapper}>
            <WebView
              originWhitelist={["*"]}
              source={{ html: CKEDITOR_HTML("Type the question body here — use bold, italic, tables, font size and style…"), baseUrl: "https://cdn.ckeditor.com" }}
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
    backgroundColor: Colors.light.card,
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

  dropdownBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: Colors.light.background,
  },
  dropdownBtnDisabled: { opacity: 0.5 },
  dropdownBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text, marginRight: 8 },
  dropdownPlaceholder: { color: Colors.light.textMuted, fontFamily: "Inter_400Regular" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalSheet: {
    backgroundColor: Colors.light.card, borderRadius: 16, width: "100%", maxWidth: 420,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20,
    elevation: 10, overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  modalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  modalEmpty: { padding: 24, alignItems: "center" },
  modalEmptyText: { fontSize: 14, color: Colors.light.textMuted, fontFamily: "Inter_400Regular" },
  modalItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border + "80",
  },
  modalItemActive: { backgroundColor: Colors.light.primary + "0D" },
  modalItemText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, marginRight: 8 },
  modalItemTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.light.primary },

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

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
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

const RICH_EDITOR_HTML = (placeholder: string) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; -webkit-text-size-adjust: 100%; }
  #toolbar {
    position: sticky; top: 0; z-index: 10;
    background: #f5f5f5; border-bottom: 1px solid #e0e0e0;
    padding: 6px 8px; display: flex; gap: 5px; align-items: center; flex-wrap: wrap;
  }
  .tb-btn {
    background: #fff; border: 1px solid #ccc; border-radius: 5px;
    padding: 0 8px; font-size: 13px; cursor: pointer; color: #222;
    min-width: 30px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .tb-btn:active { background: #dde8ff; border-color: #4a7cdc; }
  .tb-sep { width: 1px; height: 22px; background: #ddd; margin: 0 2px; flex-shrink: 0; }
  .tb-select {
    border: 1px solid #ccc; border-radius: 5px; padding: 0 4px;
    font-size: 12px; background: #fff; color: #222; height: 28px; max-width: 110px;
  }
  #editor-wrap { position: relative; min-height: 160px; }
  #hint {
    color: #bbb; font-size: 14px; position: absolute;
    top: 12px; left: 14px; pointer-events: none; user-select: none;
  }
  #editor {
    min-height: 160px; padding: 10px 14px; outline: none;
    font-size: 15px; line-height: 1.7; color: #111; word-break: break-word;
  }
  #editor:empty:not(:focus)::before { content: ''; }
  #editor table {
    border-collapse: collapse; width: 100%; margin: 8px 0;
    table-layout: fixed; word-break: break-word;
  }
  #editor td, #editor th {
    border: 1px solid #bbb; padding: 6px 8px; min-width: 30px;
    vertical-align: top;
  }
  #editor th { background: #f0f0f0; font-weight: bold; }
</style>
</head>
<body>
<div id="toolbar">
  <select class="tb-select" id="fontSel" onchange="applyFont(this.value)" title="Font">
    <option value="Arial">Arial</option>
    <option value="Times New Roman">Times NR</option>
    <option value="Courier New">Courier</option>
    <option value="Georgia">Georgia</option>
    <option value="Verdana">Verdana</option>
  </select>
  <select class="tb-select" id="sizeSel" onchange="applySize(this.value)" title="Size">
    <option value="1">8</option>
    <option value="2">10</option>
    <option value="3" selected>12</option>
    <option value="4">14</option>
    <option value="5">18</option>
    <option value="6">24</option>
    <option value="7">36</option>
  </select>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="btnB" onmousedown="event.preventDefault();cmd('bold')" title="Bold"><b>B</b></button>
  <button class="tb-btn" id="btnI" onmousedown="event.preventDefault();cmd('italic')" title="Italic"><i>I</i></button>
  <button class="tb-btn" id="btnU" onmousedown="event.preventDefault();cmd('underline')" title="Underline"><u>U</u></button>
  <button class="tb-btn" onmousedown="event.preventDefault();cmd('subscript')" title="Subscript" style="font-size:11px">X₂</button>
  <button class="tb-btn" onmousedown="event.preventDefault();cmd('superscript')" title="Superscript" style="font-size:11px">X²</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onmousedown="event.preventDefault();insertTable()" title="Insert table" style="font-size:16px">⊞</button>
  <button class="tb-btn" onmousedown="event.preventDefault();addRow()" title="Add row" style="font-size:12px">+Row</button>
  <button class="tb-btn" onmousedown="event.preventDefault();addCol()" title="Add column" style="font-size:12px">+Col</button>
  <button class="tb-btn" onmousedown="event.preventDefault();deleteTable()" title="Delete table" style="font-size:16px">⊟</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onmousedown="event.preventDefault();cmd('removeFormat')" title="Clear formatting" style="font-size:11px">✖Fmt</button>
</div>
<div id="editor-wrap">
  <span id="hint">${placeholder}</span>
  <div id="editor" contenteditable="true" oninput="onEdit()" onkeyup="onEdit()" onpaste="onPaste()" onclick="updateToolbar()"></div>
</div>
<script>
function cmd(c) {
  document.getElementById('editor').focus();
  document.execCommand(c, false, null);
  onEdit();
  updateToolbar();
}
function applyFont(f) {
  document.getElementById('editor').focus();
  document.execCommand('fontName', false, f);
  onEdit();
}
function applySize(s) {
  document.getElementById('editor').focus();
  document.execCommand('fontSize', false, s);
  onEdit();
}
function insertTable() {
  var html = '<table>';
  html += '<tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr>';
  html += '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
  html += '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
  html += '</table><p><br></p>';
  document.getElementById('editor').focus();
  document.execCommand('insertHTML', false, html);
  onEdit();
}
function addRow() {
  var tbl = getActiveTable();
  if (!tbl) return;
  var cols = tbl.rows[0] ? tbl.rows[0].cells.length : 3;
  var row = tbl.insertRow();
  for (var i = 0; i < cols; i++) {
    var cell = row.insertCell();
    cell.innerHTML = '&nbsp;';
    cell.style.border = '1px solid #bbb';
    cell.style.padding = '6px 8px';
  }
  onEdit();
}
function addCol() {
  var tbl = getActiveTable();
  if (!tbl) return;
  for (var r = 0; r < tbl.rows.length; r++) {
    var cell = r === 0 ? document.createElement('th') : document.createElement('td');
    cell.innerHTML = r === 0 ? 'Header' : '&nbsp;';
    cell.style.border = '1px solid #bbb';
    cell.style.padding = '6px 8px';
    if (r === 0) cell.style.background = '#f0f0f0';
    tbl.rows[r].appendChild(cell);
  }
  onEdit();
}
function deleteTable() {
  var tbl = getActiveTable();
  if (tbl) { tbl.parentNode.removeChild(tbl); onEdit(); }
}
function getActiveTable() {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  var node = sel.getRangeAt(0).startContainer;
  while (node && node !== document.getElementById('editor')) {
    if (node.nodeName === 'TABLE') return node;
    node = node.parentNode;
  }
  return null;
}
function updateToolbar() {
  document.getElementById('btnB').style.background = document.queryCommandState('bold') ? '#dde8ff' : '';
  document.getElementById('btnI').style.background = document.queryCommandState('italic') ? '#dde8ff' : '';
  document.getElementById('btnU').style.background = document.queryCommandState('underline') ? '#dde8ff' : '';
}
function onEdit() {
  var el = document.getElementById('editor');
  var isEmpty = !el.innerHTML || el.innerHTML === '<br>';
  document.getElementById('hint').style.display = isEmpty ? 'block' : 'none';
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html: el.innerHTML }));
}
function onPaste() { setTimeout(onEdit, 80); }
function setContent(html) {
  var el = document.getElementById('editor');
  el.innerHTML = html || '';
  document.getElementById('hint').style.display = (html && html !== '<br>') ? 'none' : 'block';
}
</script>
</body>
</html>
`;

// ── Web-only rich editor using native contenteditable ──────────────────────
function RichEditorWeb({
  placeholder,
  minHeight,
  onHtmlChange,
}: {
  placeholder: string;
  minHeight: number;
  onHtmlChange: (html: string) => void;
}) {
  return React.createElement("div", {
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-placeholder": placeholder,
    style: {
      minHeight,
      padding: "12px 16px",
      outline: "none",
      fontSize: 15,
      lineHeight: 1.6,
      color: "#111",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      boxSizing: "border-box",
      whiteSpace: "pre-wrap",
    } as React.CSSProperties,
    onInput: (e: React.FormEvent<HTMLDivElement>) =>
      onHtmlChange((e.currentTarget as HTMLDivElement).innerHTML),
    onPaste: (e: React.ClipboardEvent<HTMLDivElement>) =>
      setTimeout(() => onHtmlChange((e.currentTarget as HTMLDivElement).innerHTML), 80),
  }) as React.ReactElement;
}

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

  const [questionHtml, setQuestionHtml] = useState("");
  const [questionImageUri, setQuestionImageUri] = useState<string | null>(null);

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

  const getBody = (): { questionText?: string; questionHtml?: string; questionImageUrl?: string } => {
    if (inputMode === "type" || inputMode === "word") return { questionHtml };
    if (inputMode === "image") return { questionImageUrl: questionImageUri ?? undefined };
    return {};
  };

  const validate = (): string | null => {
    if (!topicId) return "Please select a topic.";
    if ((inputMode === "type" || inputMode === "word") && !questionHtml.replace(/<[^>]*>/g, "").trim())
      return "Please type the question body.";
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

  const inputModes: { key: InputMode; label: string; icon: string }[] = [
    { key: "type", label: "Rich Type", icon: "create-outline" },
    { key: "image", label: "Image", icon: "image-outline" },
    { key: "word", label: "Word Paste", icon: "document-text-outline" },
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
                  size={16}
                  color={inputMode === m.key ? Colors.light.primary : Colors.light.textMuted}
                />
                <Text style={[s.modeTabText, inputMode === m.key && s.modeTabTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* RICH TYPE MODE */}
          {inputMode === "type" && (
            <View style={s.webviewWrapper}>
              {Platform.OS === "web" ? (
                <RichEditorWeb
                  placeholder="Type the question body here — bold, italic, tables all supported…"
                  minHeight={300}
                  onHtmlChange={setQuestionHtml}
                />
              ) : (
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: RICH_EDITOR_HTML("Type the question body here — use the toolbar to format…") }}
                  style={{ flex: 1, minHeight: 320 }}
                  scrollEnabled
                  nestedScrollEnabled
                  onMessage={event => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.type === "change") setQuestionHtml(data.html ?? "");
                    } catch {}
                  }}
                  keyboardDisplayRequiresUserAction={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
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

          {/* WORD PASTE MODE */}
          {inputMode === "word" && (
            <View>
              <View style={s.wordInfoRow}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.light.textMuted} />
                <Text style={s.wordInfoText}>
                  Paste from Microsoft Word below — formatting and tables are preserved.
                </Text>
              </View>
              <View style={s.webviewWrapper}>
                {Platform.OS === "web" ? (
                  <RichEditorWeb
                    placeholder="Paste your Word content here — formatting and tables are preserved…"
                    minHeight={280}
                    onHtmlChange={setQuestionHtml}
                  />
                ) : (
                  <WebView
                    originWhitelist={["*"]}
                    source={{ html: RICH_EDITOR_HTML("Paste your Word content here — formatting is preserved…") }}
                    style={{ flex: 1, minHeight: 300 }}
                    scrollEnabled
                    nestedScrollEnabled
                    onMessage={event => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === "change") setQuestionHtml(data.html ?? "");
                      } catch {}
                    }}
                    keyboardDisplayRequiresUserAction={false}
                    showsVerticalScrollIndicator={false}
                  />
                )}
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
  emptyChip: { fontSize: 13, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", paddingVertical: 7 },

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
    minHeight: 320,
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

  wordInfoRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginBottom: 6 },
  wordInfoText: { flex: 1, fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", lineHeight: 18 },
  wordPreviewBadge: {
    flexDirection: "row", gap: 6, alignItems: "center",
    backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8, marginTop: 6,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  wordPreviewBadgeText: { fontSize: 12, color: "#16A34A", fontFamily: "Inter_500Medium" },

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

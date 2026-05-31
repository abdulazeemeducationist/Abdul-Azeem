import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import {
  useCreateQuestion, useUpdateQuestion, useGetAdminQuestion,
  useGetCourses, useGetAllSubjects, useGetAdminChaptersBySubject,
  useGetAdminTopicsByChapter,
  getGetAdminQuestionsQueryKey, getGetAdminQuestionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextEditor from "@/components/RichTextEditor";
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, Info } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"];

interface OptionEntry { text: string }
interface MatchingRow { id: string; label: string }
interface MatchingCol { id: string; label: string }

type QuestionType = "single" | "multiple" | "fill_blank" | "matching" | "dropdown";

interface QForm {
  questionType: QuestionType;
  questionHtml: string;
  questionText: string;
  options: OptionEntry[];
  correctIndices: number[];
  numericAnswer: string;
  numericUnit: string;
  tolerance: string;
  allowedDecimalPrecision: string;
  matchingRows: MatchingRow[];
  matchingColumns: MatchingCol[];
  matchingAnswers: Record<string, string>;
  dropdownOptions: string[];
  dropdownCorrectAnswer: string;
  explanationHtml: string;
  explanationText: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  tags: string[];
}

const EMPTY_FORM: QForm = {
  questionType: "single",
  questionHtml: "",
  questionText: "",
  options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
  correctIndices: [],
  numericAnswer: "",
  numericUnit: "",
  tolerance: "",
  allowedDecimalPrecision: "",
  matchingRows: [
    { id: "r1", label: "" },
    { id: "r2", label: "" },
    { id: "r3", label: "" },
  ],
  matchingColumns: [
    { id: "c1", label: "" },
    { id: "c2", label: "" },
  ],
  matchingAnswers: {},
  dropdownOptions: ["", "", ""],
  dropdownCorrectAnswer: "",
  explanationHtml: "",
  explanationText: "",
  difficulty: "medium",
  marks: 1,
  tags: [],
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Multiple Choice Question (Single Correct)",
  multiple: "Multiple Response Question (Multiple Correct)",
  fill_blank: "Fill in the Blank (Number Entry)",
  matching: "Matching Question (Grid)",
  dropdown: "Dropdown List Question",
};

const ANSWER_SECTION_TITLE: Record<QuestionType, string> = {
  single: "Answer Options",
  multiple: "Answer Options",
  fill_blank: "Numeric Answer",
  matching: "Matching Grid",
  dropdown: "Dropdown Options",
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900 text-base">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function CascadeSelect({
  label, value, onChange, placeholder, disabled, children,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-slate-300"}`}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}

function inputCls(extra?: string) {
  return `w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors ${extra ?? ""}`;
}

function newId() { return Math.random().toString(36).slice(2, 9); }

export default function QuestionFormPage() {
  const { questionId } = useParams<{ questionId?: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const topicIdParam = params.get("topicId");
  const topicId = topicIdParam ? parseInt(topicIdParam) : 0;

  const isEdit = !!questionId;
  const qId = questionId ? parseInt(questionId) : 0;

  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: existing, isLoading } = useGetAdminQuestion(qId, {
    query: { enabled: isEdit && !!qId, queryKey: getGetAdminQuestionQueryKey(qId) }
  });

  const [form, setForm] = useState<QForm>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [subTopic, setSubTopic] = useState("");

  const { data: programs } = useGetCourses();
  const { data: allSubjects } = useGetAllSubjects();

  const filteredSubjects = (allSubjects ?? []).filter(
    s => !selectedProgramId || String(s.courseId) === selectedProgramId
  );

  const subjectIdNum = parseInt(selectedSubjectId) || 0;
  const chapterIdNum = parseInt(selectedChapterId) || 0;

  const { data: chapters } = useGetAdminChaptersBySubject(subjectIdNum, {
    query: { enabled: subjectIdNum > 0 }
  });
  const { data: topics } = useGetAdminTopicsByChapter(chapterIdNum, {
    query: { enabled: chapterIdNum > 0 }
  });

  useEffect(() => {
    if (existing && isEdit) {
      const qType = (existing.questionType as QuestionType) ?? "single";
      let matchingRows: MatchingRow[] = EMPTY_FORM.matchingRows;
      let matchingColumns: MatchingCol[] = EMPTY_FORM.matchingColumns;
      let matchingAnswers: Record<string, string> = {};
      let dropdownOptions: string[] = EMPTY_FORM.dropdownOptions;

      try { if (existing.matchingGridRows) matchingRows = JSON.parse(existing.matchingGridRows as string); } catch {}
      try { if (existing.matchingGridColumns) matchingColumns = JSON.parse(existing.matchingGridColumns as string); } catch {}
      try { if (existing.matchingGridAnswers) matchingAnswers = JSON.parse(existing.matchingGridAnswers as string); } catch {}
      try { if (existing.dropdownOptions) dropdownOptions = JSON.parse(existing.dropdownOptions as string); } catch {}

      setForm({
        questionType: qType,
        questionHtml: existing.questionHtml ?? existing.questionText ?? "",
        questionText: existing.questionText ?? "",
        options: [
          { text: existing.optionA ?? "" },
          { text: existing.optionB ?? "" },
          { text: existing.optionC ?? "" },
          { text: existing.optionD ?? "" },
        ],
        correctIndices: (Array.isArray(existing.correctAnswers) ? existing.correctAnswers : [])
          .map((l: string) => l.charCodeAt(0) - 65)
          .filter((i: number) => i >= 0 && i < 4),
        numericAnswer: existing.numericAnswer != null ? String(existing.numericAnswer) : "",
        numericUnit: (existing.numericUnit as string | null) ?? "",
        tolerance: existing.tolerance != null ? String(existing.tolerance) : "",
        allowedDecimalPrecision: existing.allowedDecimalPrecision != null ? String(existing.allowedDecimalPrecision) : "",
        matchingRows,
        matchingColumns,
        matchingAnswers,
        dropdownOptions,
        dropdownCorrectAnswer: (existing.dropdownCorrectAnswer as string | null) ?? "",
        explanationHtml: existing.explanation ?? "",
        explanationText: existing.explanation ?? "",
        difficulty: (existing.difficulty as "easy" | "medium" | "hard") ?? "medium",
        marks: existing.marks ?? 1,
        tags: [],
      });
    }
  }, [existing, isEdit]);

  const create = useCreateQuestion();
  const update = useUpdateQuestion();

  const effectiveTopicId = parseInt(selectedTopicId) || (isEdit ? existing?.topicId ?? 0 : topicId);

  const isMCQType = form.questionType === "single" || form.questionType === "multiple";
  const isFillBlank = form.questionType === "fill_blank";
  const isMatching = form.questionType === "matching";
  const isDropdown = form.questionType === "dropdown";

  function toggleOption(idx: number) {
    setForm(f => {
      if (f.questionType === "single") return { ...f, correctIndices: [idx] };
      const has = f.correctIndices.includes(idx);
      return { ...f, correctIndices: has ? f.correctIndices.filter(i => i !== idx) : [...f.correctIndices, idx] };
    });
  }

  function updateOptionText(idx: number, text: string) {
    setForm(f => { const opts = [...f.options]; opts[idx] = { text }; return { ...f, options: opts }; });
  }

  function removeOption(idx: number) {
    setForm(f => {
      if (f.options.length <= 2) return f;
      const opts = f.options.filter((_, i) => i !== idx);
      const correct = f.correctIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i));
      return { ...f, options: opts, correctIndices: correct };
    });
  }

  function addOption() {
    setForm(f => {
      if (f.options.length >= 4) return f;
      return { ...f, options: [...f.options, { text: "" }] };
    });
  }

  function addMatchingRow() {
    setForm(f => ({ ...f, matchingRows: [...f.matchingRows, { id: newId(), label: "" }] }));
  }

  function removeMatchingRow(id: string) {
    setForm(f => {
      if (f.matchingRows.length <= 2) return f;
      const rows = f.matchingRows.filter(r => r.id !== id);
      const answers = { ...f.matchingAnswers };
      delete answers[id];
      return { ...f, matchingRows: rows, matchingAnswers: answers };
    });
  }

  function updateMatchingRowLabel(id: string, label: string) {
    setForm(f => ({ ...f, matchingRows: f.matchingRows.map(r => r.id === id ? { ...r, label } : r) }));
  }

  function addMatchingColumn() {
    setForm(f => ({ ...f, matchingColumns: [...f.matchingColumns, { id: newId(), label: "" }] }));
  }

  function removeMatchingColumn(id: string) {
    setForm(f => {
      if (f.matchingColumns.length <= 2) return f;
      const cols = f.matchingColumns.filter(c => c.id !== id);
      const answers = { ...f.matchingAnswers };
      Object.keys(answers).forEach(rowId => { if (answers[rowId] === id) delete answers[rowId]; });
      return { ...f, matchingColumns: cols, matchingAnswers: answers };
    });
  }

  function updateMatchingColumnLabel(id: string, label: string) {
    setForm(f => ({ ...f, matchingColumns: f.matchingColumns.map(c => c.id === id ? { ...c, label } : c) }));
  }

  function setMatchingAnswer(rowId: string, colId: string) {
    setForm(f => ({ ...f, matchingAnswers: { ...f.matchingAnswers, [rowId]: colId } }));
  }

  function addDropdownOption() {
    setForm(f => ({ ...f, dropdownOptions: [...f.dropdownOptions, ""] }));
  }

  function removeDropdownOption(idx: number) {
    setForm(f => {
      if (f.dropdownOptions.length <= 2) return f;
      const opts = f.dropdownOptions.filter((_, i) => i !== idx);
      const wasCorrect = f.dropdownCorrectAnswer === f.dropdownOptions[idx].trim();
      return { ...f, dropdownOptions: opts, dropdownCorrectAnswer: wasCorrect ? "" : f.dropdownCorrectAnswer };
    });
  }

  function updateDropdownOption(idx: number, value: string) {
    setForm(f => {
      const opts = [...f.dropdownOptions];
      const wasCorrect = f.dropdownCorrectAnswer === opts[idx].trim();
      opts[idx] = value;
      return {
        ...f,
        dropdownOptions: opts,
        dropdownCorrectAnswer: wasCorrect ? value.trim() : f.dropdownCorrectAnswer,
      };
    });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  }

  function removeTag(t: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));
  }

  function handleSubmit(publish = false) {
    if (!effectiveTopicId) {
      toast({ title: "Please select a topic", variant: "destructive" });
      return;
    }

    if (isMCQType) {
      const filledOptions = form.options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        toast({ title: "At least 2 options are required", variant: "destructive" });
        return;
      }
      if (!form.correctIndices.length) {
        toast({ title: "Select at least one correct answer", variant: "destructive" });
        return;
      }
    }
    if (isFillBlank) {
      if (!form.numericAnswer.trim() || isNaN(parseFloat(form.numericAnswer))) {
        toast({ title: "A valid numeric answer is required", variant: "destructive" });
        return;
      }
    }
    if (isMatching) {
      if (form.matchingRows.length < 2 || form.matchingColumns.length < 2) {
        toast({ title: "Matching needs at least 2 rows and 2 columns", variant: "destructive" });
        return;
      }
      const unanswered = form.matchingRows.filter(r => !form.matchingAnswers[r.id]);
      if (unanswered.length > 0) {
        toast({ title: "Set correct answer for every row", variant: "destructive" });
        return;
      }
    }
    if (isDropdown) {
      const filled = form.dropdownOptions.filter(o => o.trim());
      if (filled.length < 2) {
        toast({ title: "Add at least 2 dropdown options", variant: "destructive" });
        return;
      }
      if (!form.dropdownCorrectAnswer) {
        toast({ title: "Select the correct dropdown answer", variant: "destructive" });
        return;
      }
    }
    if (!form.explanationText.trim()) {
      toast({ title: "Explanation is required", variant: "destructive" });
      return;
    }

    const payload = {
      topicId: effectiveTopicId,
      questionText: form.questionText || undefined,
      questionHtml: form.questionHtml || undefined,
      questionType: form.questionType,
      explanation: form.explanationHtml || form.explanationText,
      difficulty: form.difficulty,
      marks: form.marks,
      optionA: isMCQType ? (form.options[0]?.text ?? "") : "",
      optionB: isMCQType ? (form.options[1]?.text ?? "") : "",
      optionC: isMCQType ? (form.options[2]?.text ?? "") : "",
      optionD: isMCQType ? (form.options[3]?.text ?? "") : "",
      correctAnswers: isMCQType ? form.correctIndices.map(i => OPTION_LABELS[i]).filter(Boolean) : [],
      numericAnswer: isFillBlank ? parseFloat(form.numericAnswer) : undefined,
      numericUnit: isFillBlank ? (form.numericUnit || undefined) : undefined,
      tolerance: (isFillBlank && form.tolerance) ? parseFloat(form.tolerance) : undefined,
      allowedDecimalPrecision: (isFillBlank && form.allowedDecimalPrecision) ? parseInt(form.allowedDecimalPrecision) : undefined,
      matchingGridRows: isMatching ? JSON.stringify(form.matchingRows) : undefined,
      matchingGridColumns: isMatching ? JSON.stringify(form.matchingColumns) : undefined,
      matchingGridAnswers: isMatching ? JSON.stringify(form.matchingAnswers) : undefined,
      dropdownOptions: isDropdown ? JSON.stringify(form.dropdownOptions.filter(o => o.trim())) : undefined,
      dropdownCorrectAnswer: isDropdown ? form.dropdownCorrectAnswer : undefined,
    };

    const go = () => {
      qc.invalidateQueries({ queryKey: getGetAdminQuestionsQueryKey({ topicId: effectiveTopicId }) });
      setLocation(`/topics/${effectiveTopicId}/questions`);
    };

    if (isEdit) {
      update.mutate({ questionId: qId, data: payload as Parameters<typeof update.mutate>[0]["data"] }, {
        onSuccess: () => { toast({ title: "Question updated" }); go(); },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload as Parameters<typeof create.mutate>[0]["data"] }, {
        onSuccess: () => { toast({ title: publish ? "Question published" : "Question saved" }); go(); },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      });
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="p-8 max-w-2xl space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-16">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
            <span className="hover:text-slate-600 cursor-pointer" onClick={() => window.history.back()}>Programs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">{isEdit ? "Edit Question" : "New Question"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEdit ? "Edit Question" : "New Question"}
            </h1>
          </div>
        </div>

        {/* Question Type */}
        <SectionCard title="Question Type">
          <div className="space-y-3">
            <div className="relative">
              <select
                value={form.questionType}
                onChange={e => setForm(f => ({
                  ...f,
                  questionType: e.target.value as QuestionType,
                  correctIndices: [],
                  matchingAnswers: {},
                  dropdownCorrectAnswer: "",
                }))}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors cursor-pointer"
              >
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400" />
            </div>

            {isFillBlank && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Students enter a numeric value. Valid inputs: digits, one decimal point, leading minus for negatives. No commas or letters.</span>
              </div>
            )}
            {isMatching && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Students select one column for each row. Marks are split equally across rows — partial credit is awarded.</span>
              </div>
            )}
            {isDropdown && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>A single dropdown appears below the question. Students select exactly one answer.</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Categorization */}
        <SectionCard title="Categorization">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CascadeSelect
                label="Program"
                value={selectedProgramId}
                onChange={v => { setSelectedProgramId(v); setSelectedSubjectId(""); setSelectedChapterId(""); setSelectedTopicId(""); }}
                placeholder="Pick program"
              >
                {(programs ?? []).map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </CascadeSelect>

              <CascadeSelect
                label="Course"
                value={selectedSubjectId}
                onChange={v => { setSelectedSubjectId(v); setSelectedChapterId(""); setSelectedTopicId(""); }}
                placeholder="Pick course"
                disabled={!selectedProgramId}
              >
                {filteredSubjects.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </CascadeSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CascadeSelect
                label="Chapter"
                value={selectedChapterId}
                onChange={v => { setSelectedChapterId(v); setSelectedTopicId(""); }}
                placeholder="Pick chapter"
                disabled={!selectedSubjectId}
              >
                {(chapters ?? []).map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </CascadeSelect>

              <CascadeSelect
                label="Topic"
                value={selectedTopicId}
                onChange={setSelectedTopicId}
                placeholder="Pick topic"
                disabled={!selectedChapterId}
              >
                {(topics ?? []).map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </CascadeSelect>
            </div>

            {isEdit && !selectedTopicId && existing?.topicId && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                Current topic ID: <span className="font-semibold text-slate-700">#{existing.topicId}</span> — use selects above to change
              </p>
            )}
            {!isEdit && topicId > 0 && !selectedTopicId && (
              <p className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                Topic pre-set to ID <span className="font-semibold text-blue-700">#{topicId}</span> — or select above to override
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Sub-topic <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={subTopic}
                onChange={e => setSubTopic(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
          </div>
        </SectionCard>

        {/* Question Body */}
        <SectionCard title="Question Body">
          <RichTextEditor
            content={form.questionHtml}
            onChange={(html, text) => setForm(f => ({ ...f, questionHtml: html, questionText: text }))}
            placeholder="Type or paste the question..."
            minHeight={160}
          />
        </SectionCard>

        {/* Answer Configuration — dynamic */}
        <SectionCard title={ANSWER_SECTION_TITLE[form.questionType]}>
          {/* ── MCQ / MRQ ── */}
          {isMCQType && (
            <div className="space-y-3">
              {form.questionType === "multiple" && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Select all correct answers below</span>
                </div>
              )}
              <div className="space-y-2.5">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleOption(idx)}
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${form.correctIndices.includes(idx)
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300 hover:border-slate-400"}`}
                    >
                      {form.correctIndices.includes(idx) && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => updateOptionText(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      disabled={form.options.length <= 2}
                      className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {form.options.length < 4 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add option
                </button>
              )}
            </div>
          )}

          {/* ── Fill in Blank ── */}
          {isFillBlank && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Correct Answer <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.numericAnswer}
                    onChange={e => setForm(f => ({ ...f, numericAnswer: e.target.value }))}
                    placeholder="e.g. -10234.35"
                    className={inputCls()}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Unit <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.numericUnit}
                    onChange={e => setForm(f => ({ ...f, numericUnit: e.target.value }))}
                    placeholder="e.g. $, %, kg"
                    className={inputCls()}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Tolerance (±) <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.tolerance}
                    onChange={e => setForm(f => ({ ...f, tolerance: e.target.value }))}
                    placeholder="e.g. 0.01"
                    className={inputCls()}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Decimal Precision <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={form.allowedDecimalPrecision}
                    onChange={e => setForm(f => ({ ...f, allowedDecimalPrecision: e.target.value }))}
                    placeholder="e.g. 2"
                    className={inputCls()}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Matching Grid ── */}
          {isMatching && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Column Headers</label>
                  <button
                    type="button"
                    onClick={addMatchingColumn}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Column
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.matchingColumns.map((col, ci) => (
                    <div key={col.id} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={col.label}
                        onChange={e => updateMatchingColumnLabel(col.id, e.target.value)}
                        placeholder={`Column ${ci + 1}`}
                        className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeMatchingColumn(col.id)}
                        disabled={form.matchingColumns.length <= 2}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">Item / Statement</th>
                      {form.matchingColumns.map(col => (
                        <th key={col.id} className="px-4 py-3 font-semibold text-slate-600 text-center min-w-[110px]">
                          {col.label || <span className="text-slate-400 italic font-normal">(unnamed)</span>}
                        </th>
                      ))}
                      <th className="px-2 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.matchingRows.map((row, ri) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.label}
                            onChange={e => updateMatchingRowLabel(row.id, e.target.value)}
                            placeholder={`Item ${ri + 1}`}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                          />
                        </td>
                        {form.matchingColumns.map(col => (
                          <td key={col.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setMatchingAnswer(row.id, col.id)}
                              className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors
                                ${form.matchingAnswers[row.id] === col.id
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300 hover:border-blue-400"}`}
                            >
                              {form.matchingAnswers[row.id] === col.id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </button>
                          </td>
                        ))}
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => removeMatchingRow(row.id)}
                            disabled={form.matchingRows.length <= 2}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addMatchingRow}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
              <p className="text-xs text-slate-500">
                Click a circle to mark the correct column for each row. Each row is worth equal marks — partial credit applies.
              </p>
            </div>
          )}

          {/* ── Dropdown ── */}
          {isDropdown && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Add options for the dropdown. Click the circle to mark the correct answer.</p>
              {form.dropdownOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, dropdownCorrectAnswer: opt.trim() }))}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                      ${form.dropdownCorrectAnswer && form.dropdownCorrectAnswer === opt.trim() && opt.trim()
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 hover:border-slate-400"}`}
                  >
                    {form.dropdownCorrectAnswer && form.dropdownCorrectAnswer === opt.trim() && opt.trim() && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateDropdownOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeDropdownOption(i)}
                    disabled={form.dropdownOptions.length <= 2}
                    className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDropdownOption}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            </div>
          )}
        </SectionCard>

        {/* Explanation / Solution */}
        <SectionCard title="Explanation / Solution">
          <RichTextEditor
            content={form.explanationHtml}
            onChange={(html, text) => setForm(f => ({ ...f, explanationHtml: html, explanationText: text }))}
            placeholder="Why is the answer correct?"
            minHeight={160}
          />
        </SectionCard>

        {/* Metadata */}
        <SectionCard title="Metadata">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={form.marks}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    setForm(f => ({ ...f, marks: isNaN(v) || v < 1 ? 1 : v }));
                  }}
                  className={inputCls()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Difficulty</label>
                <div className="relative">
                  <select
                    value={form.difficulty}
                    onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as "easy" | "medium" | "hard" }))}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="add a tag"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="text-slate-400 hover:text-slate-600 leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-60"
              >
                Save & Publish
              </button>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}

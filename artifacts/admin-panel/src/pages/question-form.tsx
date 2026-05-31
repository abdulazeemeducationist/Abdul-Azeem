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
import { ChevronLeft, ChevronRight, Plus, Trash2, Save } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"];

interface OptionEntry { text: string }

interface QForm {
  questionHtml: string;
  questionText: string;
  options: OptionEntry[];
  correctIndices: number[];
  multipleCorrect: boolean;
  explanationHtml: string;
  explanationText: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  tags: string[];
}

const EMPTY_FORM: QForm = {
  questionHtml: "",
  questionText: "",
  options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
  correctIndices: [],
  multipleCorrect: false,
  explanationHtml: "",
  explanationText: "",
  difficulty: "medium",
  marks: 1,
  tags: [],
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
      setForm({
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
        multipleCorrect: Array.isArray(existing.correctAnswers) && existing.correctAnswers.length > 1,
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

  function toggleOption(idx: number) {
    setForm(f => {
      if (!f.multipleCorrect) {
        return { ...f, correctIndices: [idx] };
      }
      const has = f.correctIndices.includes(idx);
      return {
        ...f,
        correctIndices: has ? f.correctIndices.filter(i => i !== idx) : [...f.correctIndices, idx],
      };
    });
  }

  function updateOptionText(idx: number, text: string) {
    setForm(f => {
      const opts = [...f.options];
      opts[idx] = { text };
      return { ...f, options: opts };
    });
  }

  function removeOption(idx: number) {
    setForm(f => {
      if (f.options.length <= 2) return f;
      const opts = f.options.filter((_, i) => i !== idx);
      const correct = f.correctIndices
        .filter(i => i !== idx)
        .map(i => (i > idx ? i - 1 : i));
      return { ...f, options: opts, correctIndices: correct };
    });
  }

  function addOption() {
    setForm(f => {
      if (f.options.length >= 4) return f;
      return { ...f, options: [...f.options, { text: "" }] };
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
    const filledOptions = form.options.filter(o => o.text.trim());
    if (filledOptions.length < 2) {
      toast({ title: "At least 2 options are required", variant: "destructive" });
      return;
    }
    if (!form.correctIndices.length) {
      toast({ title: "Select at least one correct answer", variant: "destructive" });
      return;
    }
    if (!form.explanationText.trim()) {
      toast({ title: "Explanation is required", variant: "destructive" });
      return;
    }

    const payload = {
      topicId: effectiveTopicId,
      questionText: form.questionText || undefined,
      questionHtml: form.questionHtml || undefined,
      optionA: form.options[0]?.text ?? "",
      optionB: form.options[1]?.text ?? "",
      optionC: form.options[2]?.text ?? "",
      optionD: form.options[3]?.text ?? "",
      correctAnswers: form.correctIndices.map(i => OPTION_LABELS[i]).filter(Boolean),
      explanation: form.explanationHtml || form.explanationText,
      questionType: form.multipleCorrect ? "multiple" as const : "single" as const,
      difficulty: form.difficulty,
      marks: form.marks,
    };

    const go = () => {
      qc.invalidateQueries({ queryKey: getGetAdminQuestionsQueryKey({ topicId: effectiveTopicId }) });
      setLocation(`/topics/${effectiveTopicId}/questions`);
    };

    if (isEdit) {
      update.mutate({ questionId: qId, data: payload }, {
        onSuccess: () => { toast({ title: "Question updated" }); go(); },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
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
                placeholder=""
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

        {/* Answer Options */}
        <SectionCard title="Answer Options">
          <div className="space-y-3">
            {/* Multiple correct toggle */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, multipleCorrect: !f.multipleCorrect, correctIndices: [] }))}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                  ${form.multipleCorrect ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                  {form.multipleCorrect && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                Multiple correct
              </button>
            </div>

            {/* Options list */}
            <div className="space-y-2.5">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {/* Correct answer selector */}
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

                  {/* Option text input */}
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => updateOptionText(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />

                  {/* Delete button */}
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

            {/* Add option */}
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
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

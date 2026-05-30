import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import {
  useCreateQuestion, useUpdateQuestion, useGetAdminQuestion,
  getGetAdminQuestionsQueryKey, getGetAdminQuestionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QForm {
  questionText: string;
  questionHtml: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswers: string[];
  explanation: string;
  questionType: "single" | "multiple";
  difficulty: "easy" | "medium" | "hard";
  marks: number;
}

const emptyForm: QForm = {
  questionText: "", questionHtml: "",
  optionA: "", optionB: "", optionC: "", optionD: "",
  correctAnswers: [],
  explanation: "",
  questionType: "single",
  difficulty: "medium",
  marks: 1,
};

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

  const [form, setForm] = useState<QForm>(emptyForm);
  const [topicIdInput, setTopicIdInput] = useState(String(topicId || ""));

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        questionText: existing.questionText ?? "",
        questionHtml: existing.questionHtml ?? "",
        optionA: existing.optionA,
        optionB: existing.optionB,
        optionC: existing.optionC,
        optionD: existing.optionD,
        correctAnswers: Array.isArray(existing.correctAnswers) ? existing.correctAnswers : [],
        explanation: existing.explanation,
        questionType: (existing.questionType as "single" | "multiple") ?? "single",
        difficulty: (existing.difficulty as "easy" | "medium" | "hard") ?? "medium",
        marks: existing.marks ?? 1,
      });
      setTopicIdInput(String(existing.topicId));
    }
  }, [existing, isEdit]);

  const create = useCreateQuestion();
  const update = useUpdateQuestion();

  function toggleAnswer(opt: string) {
    setForm(f => {
      if (f.questionType === "single") {
        return { ...f, correctAnswers: [opt] };
      }
      const has = f.correctAnswers.includes(opt);
      return { ...f, correctAnswers: has ? f.correctAnswers.filter(x => x !== opt) : [...f.correctAnswers, opt] };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tId = parseInt(topicIdInput);
    if (!tId || isNaN(tId)) { toast({ title: "Topic ID is required", variant: "destructive" }); return; }
    if (!form.optionA || !form.optionB || !form.optionC || !form.optionD) { toast({ title: "All options are required", variant: "destructive" }); return; }
    if (!form.correctAnswers.length) { toast({ title: "Select at least one correct answer", variant: "destructive" }); return; }
    if (!form.explanation) { toast({ title: "Explanation is required", variant: "destructive" }); return; }

    const payload = {
      topicId: tId,
      questionText: form.questionText || undefined,
      questionHtml: form.questionHtml || undefined,
      optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD,
      correctAnswers: form.correctAnswers,
      explanation: form.explanation,
      questionType: form.questionType,
      difficulty: form.difficulty,
      marks: form.marks,
    };

    const go = () => {
      qc.invalidateQueries({ queryKey: getGetAdminQuestionsQueryKey({ topicId: tId }) });
      setLocation(`/topics/${tId}/questions`);
    };

    if (isEdit) {
      update.mutate({ questionId: qId, data: payload }, { onSuccess: () => { toast({ title: "Question updated" }); go(); }, onError: () => toast({ title: "Failed to save", variant: "destructive" }) });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { toast({ title: "Question created" }); go(); }, onError: () => toast({ title: "Failed to save", variant: "destructive" }) });
    }
  }

  if (isEdit && isLoading) {
    return <div className="p-8"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <span>Topics</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{isEdit ? "Edit Question" : "New Question"}</span>
      </div>
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => window.history.back()} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Question" : "New Question"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic ID */}
        <div className="space-y-1.5">
          <Label>Topic ID *</Label>
          <Input
            data-testid="input-topic-id"
            type="number"
            value={topicIdInput}
            onChange={e => setTopicIdInput(e.target.value)}
            placeholder="Enter topic ID"
            readOnly={!!topicId}
          />
        </div>

        {/* Question text */}
        <div className="space-y-1.5">
          <Label>Question Text (plain or HTML)</Label>
          <Textarea
            data-testid="input-question-text"
            value={form.questionText}
            onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
            placeholder="Enter question text here..."
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        {/* HTML version */}
        <div className="space-y-1.5">
          <Label>Question HTML (optional, overrides text)</Label>
          <Textarea
            data-testid="input-question-html"
            value={form.questionHtml}
            onChange={e => setForm(f => ({ ...f, questionHtml: e.target.value }))}
            placeholder="<p>Optional HTML content...</p>"
            rows={3}
            className="font-mono text-sm"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label>Answer Options *</Label>
          <div className="grid grid-cols-1 gap-2">
            {(["A", "B", "C", "D"] as const).map(opt => (
              <div key={opt} className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm shrink-0 cursor-pointer transition-colors ${
                    form.correctAnswers.includes(opt)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                  onClick={() => toggleAnswer(opt)}
                >
                  {opt}
                </div>
                <Input
                  data-testid={`input-option-${opt.toLowerCase()}`}
                  value={form[`option${opt}` as keyof QForm] as string}
                  onChange={e => setForm(f => ({ ...f, [`option${opt}`]: e.target.value }))}
                  placeholder={`Option ${opt}`}
                  required
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Click the letter to mark as correct answer(s)</p>
        </div>

        {/* Settings row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Question Type</Label>
            <Select value={form.questionType} onValueChange={v => setForm(f => ({ ...f, questionType: v as "single" | "multiple", correctAnswers: [] }))}>
              <SelectTrigger data-testid="select-question-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single answer</SelectItem>
                <SelectItem value="multiple">Multiple answers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as "easy" | "medium" | "hard" }))}>
              <SelectTrigger data-testid="select-difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marks</Label>
            <Input type="number" min={1} value={form.marks} onChange={e => setForm(f => ({ ...f, marks: parseInt(e.target.value) || 1 }))} />
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-1.5">
          <Label>Explanation *</Label>
          <Textarea
            data-testid="input-explanation"
            value={form.explanation}
            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
            placeholder="Explain why the correct answer(s) is correct..."
            rows={3}
            required
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
          <Button data-testid="button-save-question" type="submit" disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? "Saving..." : isEdit ? "Update Question" : "Create Question"}
          </Button>
        </div>
      </form>
    </div>
  );
}

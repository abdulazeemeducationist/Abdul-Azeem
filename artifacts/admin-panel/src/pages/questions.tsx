import { useState } from "react";
import { Link, useParams, useLocation, useSearch } from "wouter";
import {
  useGetAdminQuestions, useDeleteQuestion,
  getGetAdminQuestionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronRight, HelpCircle, Upload } from "lucide-react";

const diffColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

export default function QuestionsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const tId = parseInt(topicId);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const chapterId = params.get("chapterId") ?? "";
  const subjectId = params.get("subjectId") ?? "";
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: questions, isLoading } = useGetAdminQuestions(
    { topicId: tId },
    { query: { queryKey: getGetAdminQuestionsQueryKey({ topicId: tId }) } }
  );
  const remove = useDeleteQuestion();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: getGetAdminQuestionsQueryKey({ topicId: tId }) });

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/courses" className="hover:text-foreground">Programs</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {subjectId
          ? <Link href={`/subjects/${subjectId}/chapters`} className="hover:text-foreground">Chapters</Link>
          : <span>Chapters</span>}
        <ChevronRight className="w-3.5 h-3.5" />
        {chapterId
          ? <Link href={`/chapters/${chapterId}/topics?subjectId=${subjectId}`} className="hover:text-foreground">Topics</Link>
          : <span>Topics</span>}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Questions</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-sm text-muted-foreground mt-1">Topic {tId} · {questions?.length ?? 0} questions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setLocation(`/questions/new?topicId=${tId}`)} className="gap-2">
            <Plus className="w-4 h-4" /> New Question
          </Button>
          <Button variant="outline" onClick={() => setLocation(`/questions/import?topicId=${tId}`)} className="gap-2">
            <Upload className="w-4 h-4" /> Import Questions
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !questions?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No questions yet.</p>
          <Button onClick={() => setLocation(`/questions/new?topicId=${tId}`)} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Add First Question
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} data-testid={`card-question-${q.id}`} className="bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 pt-0.5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{q.questionType === "multiple" ? "Multi-select" : "Single"}</Badge>
                    {q.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${diffColor[q.difficulty] ?? "bg-muted text-muted-foreground"}`}>
                        {q.difficulty}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{q.marks ?? 1} mark{(q.marks ?? 1) !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {q.questionText || q.questionHtml?.replace(/<[^>]+>/g, "") || "(No text)"}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {["A", "B", "C", "D"].map(opt => {
                      const val = q[`option${opt}` as keyof typeof q] as string;
                      const isCorrect = Array.isArray(q.correctAnswers) && q.correctAnswers.includes(opt);
                      return (
                        <p key={opt} className={`text-xs truncate ${isCorrect ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                          {opt}. {val}
                          {isCorrect && " ✓"}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/questions/${q.id}/edit?topicId=${tId}`} className="p-1.5 rounded hover:bg-muted inline-flex"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Link>
                  <button onClick={() => setDeleteId(q.id)} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Question?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteId) remove.mutate({ questionId: deleteId }, { onSuccess: () => { inv(); setDeleteId(null); toast({ title: "Question deleted" }); } });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

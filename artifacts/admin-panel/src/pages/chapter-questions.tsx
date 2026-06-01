import { useState } from "react";
import { Link, useParams, useLocation, useSearch } from "wouter";
import {
  useGetAdminQuestions, useGetAdminTopicsByChapter, useDeleteQuestion,
  getGetAdminQuestionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, HelpCircle, ChevronDown, Upload } from "lucide-react";

const diffColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

export default function ChapterQuestionsPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const cId = parseInt(chapterId);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const subjectId = params.get("subjectId") ?? "";
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: questions, isLoading: qLoading } = useGetAdminQuestions(
    { chapterId: cId },
    { query: { queryKey: getGetAdminQuestionsQueryKey({ chapterId: cId }) } }
  );
  const { data: topics } = useGetAdminTopicsByChapter(cId);

  const remove = useDeleteQuestion();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const inv = () => qc.invalidateQueries({ queryKey: getGetAdminQuestionsQueryKey({ chapterId: cId }) });

  function toggleCollapse(topicId: number) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId); else next.add(topicId);
      return next;
    });
  }

  const grouped = topics?.map(topic => ({
    topic,
    questions: (questions ?? []).filter(q => q.topicId === topic.id),
  })) ?? [];

  const totalQuestions = questions?.length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/courses" className="hover:text-foreground">Programs</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {subjectId
          ? <Link href={`/subjects/${subjectId}/chapters`} className="hover:text-foreground">Chapters</Link>
          : <span>Chapters</span>}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">All Questions</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => window.history.back()} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold">All Questions</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Chapter {cId} · {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} across {topics?.length ?? 0} topic{(topics?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation(`/questions/import`)} className="gap-2">
          <Upload className="w-4 h-4" /> Import Questions
        </Button>
      </div>

      {qLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !totalQuestions ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No questions in this chapter yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ topic, questions: tqs }) => (
            <div key={topic.id} className="border border-card-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCollapse(topic.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{topic.orderNumber}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm">{topic.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{tqs.length} question{tqs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/topics/${topic.id}/questions`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-primary/10"
                  >
                    Manage
                  </Link>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed.has(topic.id) ? "-rotate-90" : ""}`} />
                </div>
              </button>

              {!collapsed.has(topic.id) && (
                <div className="divide-y divide-border">
                  {tqs.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                      No questions in this topic. <Link href={`/questions/new?topicId=${topic.id}`} className="text-primary hover:underline">Add one</Link>
                    </div>
                  ) : (
                    tqs.map((q, idx) => (
                      <div key={q.id} className="bg-card px-5 py-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 pt-0.5">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {q.questionType === "multiple" ? "Multi-select" : q.questionType === "fill_blank" ? "Fill Blank" : q.questionType === "dropdown" ? "Dropdown" : "Single"}
                              </Badge>
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
                            {(q.questionType === "single" || q.questionType === "multiple") && (
                              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                                {["A", "B", "C", "D"].map(opt => {
                                  const val = q[`option${opt}` as keyof typeof q] as string;
                                  if (!val) return null;
                                  const isCorrect = Array.isArray(q.correctAnswers) && q.correctAnswers.includes(opt);
                                  return (
                                    <p key={opt} className={`text-xs truncate ${isCorrect ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                                      {opt}. {val}{isCorrect && " ✓"}
                                    </p>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link href={`/questions/${q.id}/edit?topicId=${q.topicId}`} className="p-1.5 rounded hover:bg-muted inline-flex">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                            <button onClick={() => setDeleteId(q.id)} className="p-1.5 rounded hover:bg-muted">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
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

import { useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import {
  useGetAdminTopicsByChapter, useCreateTopic, useUpdateTopic,
  useDeleteTopic, useReorderTopics,
  getGetAdminTopicsByChapterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Hash } from "lucide-react";

export default function TopicsPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const cId = parseInt(chapterId);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const subjectId = params.get("subjectId") ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: topics, isLoading } = useGetAdminTopicsByChapter(cId, { query: { queryKey: getGetAdminTopicsByChapterQueryKey(cId) } });

  const create = useCreateTopic();
  const update = useUpdateTopic();
  const remove = useDeleteTopic();
  const reorder = useReorderTopics();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", orderNumber: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: getGetAdminTopicsByChapterQueryKey(cId) });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", orderNumber: (topics?.length ?? 0) + 1 });
    setOpen(true);
  }
  function openEdit(t: { id: number; name: string; orderNumber: number }) {
    setEditing(t.id); setForm({ name: t.name, orderNumber: t.orderNumber }); setOpen(true);
  }

  function handleSave() {
    const payload = { chapterId: cId, name: form.name, orderNumber: form.orderNumber };
    if (editing) {
      update.mutate({ topicId: editing, data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Topic updated" }); } });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Topic created" }); } });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/courses" className="hover:text-foreground">Programs</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {subjectId
          ? <Link href={`/subjects/${subjectId}/chapters`} className="hover:text-foreground">Chapters</Link>
          : <span>Chapters</span>}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Topics</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => window.history.back()} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
            <h1 className="text-2xl font-bold">Topics</h1>
          </div>
          <p className="text-sm text-muted-foreground">Chapter {cId} topics</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Topic</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !topics?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hash className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No topics yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((t, idx) => (
            <div key={t.id} data-testid={`card-topic-${t.id}`} className="flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">{t.orderNumber}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{t.name}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.questionCount ?? 0} questions</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => reorder.mutate({ data: { topicId: t.id, direction: "up" } }, { onSuccess: inv })} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => reorder.mutate({ data: { topicId: t.id, direction: "down" } }, { onSuccess: inv })} disabled={idx === (topics.length - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                <Link href={`/topics/${t.id}/questions?chapterId=${cId}${subjectId ? `&subjectId=${subjectId}` : ""}`} className="p-1.5 rounded hover:bg-muted inline-flex"><ChevronRight className="w-4 h-4 text-muted-foreground" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Topic" : "New Topic"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Topic Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Elements of Financial Statements" /></div>
            <div className="space-y-1.5"><Label>Order Number</Label><Input type="number" min={1} value={form.orderNumber} onChange={e => setForm(f => ({ ...f, orderNumber: parseInt(e.target.value) || 1 }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={!form.name || create.isPending || update.isPending}>{create.isPending || update.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Topic?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the topic and all its questions.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) remove.mutate({ topicId: deleteId }, { onSuccess: () => { inv(); setDeleteId(null); toast({ title: "Topic deleted" }); } }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

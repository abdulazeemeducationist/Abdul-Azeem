import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetAllSubjects, useGetAdminChaptersBySubject, useCreateChapter, useUpdateChapter,
  useDeleteChapter, useToggleChapterActive,
  getGetAdminChaptersBySubjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronRight, ToggleLeft, ToggleRight, ChevronLeft, Layers } from "lucide-react";

export default function ChaptersPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const sId = parseInt(subjectId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: subjects } = useGetAllSubjects();
  const subject = subjects?.find(s => s.id === sId);
  const { data: chapters, isLoading } = useGetAdminChaptersBySubject(sId, { query: { queryKey: getGetAdminChaptersBySubjectQueryKey(sId) } });

  const create = useCreateChapter();
  const update = useUpdateChapter();
  const remove = useDeleteChapter();
  const toggle = useToggleChapterActive();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", orderNumber: 1 });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: getGetAdminChaptersBySubjectQueryKey(sId) });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", orderNumber: (chapters?.length ?? 0) + 1 });
    setOpen(true);
  }
  function openEdit(c: { id: number; name: string; orderNumber: number }) {
    setEditing(c.id); setForm({ name: c.name, orderNumber: c.orderNumber }); setOpen(true);
  }

  function handleSave() {
    const payload = { subjectId: sId, name: form.name, orderNumber: form.orderNumber };
    if (editing) {
      update.mutate({ chapterId: editing, data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Chapter updated" }); } });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Chapter created" }); } });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/courses"><a className="hover:text-foreground">Courses</a></Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/courses/${subject?.courseId}/subjects`}><a className="hover:text-foreground">Subjects</a></Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{subject?.name ?? "..."}</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/courses/${subject?.courseId}/subjects`}><a className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></a></Link>
            <h1 className="text-2xl font-bold">Chapters</h1>
          </div>
          <p className="text-sm text-muted-foreground">Chapters in {subject?.name}</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Chapter</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !chapters?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No chapters yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map(c => (
            <div key={c.id} data-testid={`card-chapter-${c.id}`} className="flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">{c.orderNumber}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">{c.isActive ? "Published" : "Draft"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.topicCount ?? 0} topics</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle.mutate({ chapterId: c.id, data: { isActive: !c.isActive } }, { onSuccess: inv })} className="p-1.5 rounded hover:bg-muted">
                  {c.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                <Link href={`/chapters/${c.id}/topics`}>
                  <a className="p-1.5 rounded hover:bg-muted"><ChevronRight className="w-4 h-4 text-muted-foreground" /></a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Chapter" : "New Chapter"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Chapter Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. The Regulatory Framework" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Chapter?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the chapter and all its topics and questions.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) remove.mutate({ chapterId: deleteId }, { onSuccess: () => { inv(); setDeleteId(null); toast({ title: "Chapter deleted" }); } }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

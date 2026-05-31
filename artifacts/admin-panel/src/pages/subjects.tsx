import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetAdminCourses, useGetAllSubjects, useCreateSubject, useUpdateSubject,
  useDeleteSubject, useToggleSubjectActive,
  getGetAllSubjectsQueryKey,
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
import { Plus, Pencil, Trash2, ChevronRight, ToggleLeft, ToggleRight, ChevronLeft, FileText } from "lucide-react";

interface SubjectForm { name: string; code: string; description: string; }
const empty: SubjectForm = { name: "", code: "", description: "" };

export default function SubjectsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const cId = parseInt(courseId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: courses } = useGetAdminCourses();
  const { data: allSubjects, isLoading } = useGetAllSubjects();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const remove = useDeleteSubject();
  const toggle = useToggleSubjectActive();

  const subjects = allSubjects?.filter(s => s.courseId === cId) ?? [];
  const course = courses?.find(c => c.id === cId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<SubjectForm>(empty);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: getGetAllSubjectsQueryKey() });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: { id: number; name: string; code: string; description?: string | null }) {
    setEditing(s.id); setForm({ name: s.name, code: s.code, description: s.description ?? "" }); setOpen(true);
  }

  function handleSave() {
    const payload = { courseId: cId, name: form.name, code: form.code, description: form.description };
    if (editing) {
      update.mutate({ subjectId: editing, data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Course updated" }); } });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Course created" }); } });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/courses"><a className="hover:text-foreground transition-colors">Programs</a></Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{course?.name ?? "..."}</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/courses"><a className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></a></Link>
            <h1 className="text-2xl font-bold">Courses</h1>
          </div>
          <p className="text-sm text-muted-foreground">Courses in {course?.name}</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Course</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !subjects.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No courses yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map(s => (
            <div key={s.id} data-testid={`card-subject-${s.id}`} className="flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{s.code}</span>
                  <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">{s.isActive ? "Active" : "Locked"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.chapterCount ?? 0} chapters · {s.questionCount ?? 0} questions</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle.mutate({ subjectId: s.id, data: { isActive: !s.isActive } }, { onSuccess: inv })} className="p-1.5 rounded hover:bg-muted">
                  {s.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                <Link href={`/subjects/${s.id}/chapters`}>
                  <a className="p-1.5 rounded hover:bg-muted"><ChevronRight className="w-4 h-4 text-muted-foreground" /></a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Course" : "New Course"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Financial Reporting" /></div>
              <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="FR" /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={!form.name || !form.code || create.isPending || update.isPending}>{create.isPending || update.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the course and all its chapters, topics, and questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) remove.mutate({ subjectId: deleteId }, { onSuccess: () => { inv(); setDeleteId(null); toast({ title: "Course deleted" }); } }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

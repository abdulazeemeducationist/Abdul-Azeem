import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAdminCourses, useCreateCourse, useUpdateCourse, useDeleteCourse,
  useToggleCourseActive, useReorderCourse,
  getGetAdminCoursesQueryKey,
  type Course,
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
import { Plus, Pencil, Trash2, ChevronRight, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, BookOpen } from "lucide-react";

interface CourseForm { name: string; code: string; description: string; icon: string; color: string; }
const empty: CourseForm = { name: "", code: "", description: "", icon: "", color: "#6366f1" };

export default function CoursesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: courses, isLoading } = useGetAdminCourses();
  const create = useCreateCourse();
  const update = useUpdateCourse();
  const remove = useDeleteCourse();
  const toggle = useToggleCourseActive();
  const reorder = useReorderCourse();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<CourseForm>(empty);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: getGetAdminCoursesQueryKey() });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(c: Course) {
    setEditing(c.id);
    setForm({ name: c.name, code: c.code, description: c.description ?? "", icon: c.icon ?? "", color: c.color ?? "#6366f1" });
    setOpen(true);
  }

  function handleSave() {
    const payload = { name: form.name, code: form.code, description: form.description, icon: form.icon, color: form.color };
    if (editing) {
      update.mutate({ courseId: editing, data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Course updated" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Course created" }); }, onError: () => toast({ title: "Failed", variant: "destructive" }) });
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage exam programs and qualifications</p>
        </div>
        <Button data-testid="button-create-course" onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Course
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !courses?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No courses yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((c, idx) => (
            <div key={c.id} data-testid={`card-course-${c.id}`} className="flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.color ?? "#6366f1" }}>
                <span className="text-white text-xs font-bold">{c.code?.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                  <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">{c.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.subjectCount ?? 0} subjects
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => reorder.mutate({ courseId: c.id, data: { direction: "up" } }, { onSuccess: inv })} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => reorder.mutate({ courseId: c.id, data: { direction: "down" } }, { onSuccess: inv })} disabled={idx === (courses.length - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggle.mutate({ courseId: c.id, data: { isActive: !c.isActive } }, { onSuccess: inv })} className="p-1.5 rounded hover:bg-muted" title={c.isActive ? "Deactivate" : "Activate"}>
                  {c.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-muted">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
                <Link href={`/courses/${c.id}/subjects`}>
                  <a className="p-1.5 rounded hover:bg-muted">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </a>
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
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input data-testid="input-course-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ACCA" />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input data-testid="input-course-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ACCA" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📚" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded border border-input cursor-pointer p-1" />
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#6366f1" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-save-course" className="flex-1" onClick={handleSave} disabled={!form.name || !form.code || create.isPending || update.isPending}>
                {create.isPending || update.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the course and all its subjects, chapters, topics, and questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) remove.mutate({ courseId: deleteId }, { onSuccess: () => { inv(); setDeleteId(null); toast({ title: "Course deleted" }); } });
              }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

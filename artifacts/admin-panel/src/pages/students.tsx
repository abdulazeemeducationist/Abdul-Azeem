import { useState } from "react";
import {
  useGetStudents, useCreateStudent, useUpdateStudent, useToggleStudentBlock,
  useAssignSubjectToStudent, useRevokeSubjectFromStudent, useGetAllSubjects,
  getGetStudentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, UserX, UserCheck, X, BookOpen, Users, Search } from "lucide-react";

interface StudentForm { name: string; email: string; password: string; whatsappNumber: string; }
const empty: StudentForm = { name: "", email: "", password: "", whatsappNumber: "" };

export default function StudentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: students, isLoading } = useGetStudents();
  const { data: subjects } = useGetAllSubjects();
  const create = useCreateStudent();
  const update = useUpdateStudent();
  const block = useToggleStudentBlock();
  const assign = useAssignSubjectToStudent();
  const revoke = useRevokeSubjectFromStudent();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<StudentForm>(empty);
  const [search, setSearch] = useState("");
  const [assignStudent, setAssignStudent] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const inv = () => qc.invalidateQueries({ queryKey: getGetStudentsQueryKey() });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: { id: number; name: string; email: string; whatsappNumber?: string | null }) {
    setEditing(s.id); setForm({ name: s.name, email: s.email, password: "", whatsappNumber: s.whatsappNumber ?? "" }); setOpen(true);
  }

  function handleSave() {
    if (editing) {
      update.mutate({ userId: editing, data: { name: form.name, email: form.email, whatsappNumber: form.whatsappNumber } }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Student updated" }); } });
    } else {
      create.mutate({ data: { name: form.name, email: form.email, password: form.password, whatsappNumber: form.whatsappNumber } }, { onSuccess: () => { inv(); setOpen(false); toast({ title: "Student created" }); } });
    }
  }

  function handleAssign() {
    if (!assignStudent || !selectedSubject) return;
    assign.mutate({ userId: assignStudent, data: { subjectId: parseInt(selectedSubject) } }, {
      onSuccess: () => { inv(); setSelectedSubject(""); toast({ title: "Subject assigned" }); },
      onError: () => toast({ title: "Already assigned", variant: "destructive" }),
    });
  }

  const filtered = students?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const assigningStudent = students?.find(s => s.id === assignStudent);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">{students?.length ?? 0} registered students</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Student</Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search-students"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{search ? "No students match your search." : "No students yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} data-testid={`card-student-${s.id}`} className="bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{s.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.name}</span>
                    {s.isBlocked && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                  {s.whatsappNumber && <p className="text-xs text-muted-foreground">{s.whatsappNumber}</p>}
                  {/* Assigned subjects */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.assignedSubjects?.map(sub => (
                      <span key={sub.id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {sub.code}
                        <button onClick={() => revoke.mutate({ userId: s.id, subjectId: sub.id }, { onSuccess: inv })} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => { setAssignStudent(s.id); setSelectedSubject(""); }}
                      className="text-xs text-muted-foreground hover:text-primary px-2 py-0.5 rounded-full border border-dashed border-border hover:border-primary transition-colors"
                    >
                      + Assign
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button
                    onClick={() => block.mutate({ userId: s.id, data: { isBlocked: !s.isBlocked } }, { onSuccess: inv })}
                    className="p-1.5 rounded hover:bg-muted"
                    title={s.isBlocked ? "Unblock" : "Block"}
                  >
                    {s.isBlocked
                      ? <UserCheck className="w-4 h-4 text-green-500" />
                      : <UserX className="w-4 h-4 text-destructive" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Student" : "New Student"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input data-testid="input-student-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input data-testid="input-student-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" /></div>
            {!editing && (
              <div className="space-y-1.5"><Label>Password *</Label><Input data-testid="input-student-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
            )}
            <div className="space-y-1.5"><Label>WhatsApp Number</Label><Input value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+923001234567" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-save-student" className="flex-1" onClick={handleSave} disabled={!form.name || !form.email || (!editing && !form.password) || create.isPending || update.isPending}>
                {create.isPending || update.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign subject dialog */}
      <Dialog open={assignStudent !== null} onOpenChange={v => !v && setAssignStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Subject to {assigningStudent?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Choose a subject..." /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(sub => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.code} — {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAssignStudent(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAssign} disabled={!selectedSubject || assign.isPending}>
                {assign.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

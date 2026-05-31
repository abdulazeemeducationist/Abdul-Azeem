import { useState } from "react";
import {
  useGetStudents, useCreateStudent, useUpdateStudent, useToggleStudentBlock,
  useAssignSubjectToStudent, useRevokeSubjectFromStudent, useGetAllSubjects,
  useUpdateSubjectAccess, useGetStudentAccessLogs,
  getGetStudentsQueryKey,
} from "@workspace/api-client-react";
import type { AssignedSubjectDetail, AccessLogEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, UserX, UserCheck, X, Users, Search, Lock, Unlock, Clock, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentForm { name: string; email: string; password: string; whatsappNumber: string; }
const empty: StudentForm = { name: "", email: "", password: "", whatsappNumber: "" };
interface SetExpiryTarget { userId: number; subjectId: number; currentExpiry?: string | null; }

function formatDate(dt?: string | null): string {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateInput(dt?: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function actionLabel(action: string) {
  const map: Record<string, string> = { assigned: "Assigned", revoked: "Revoked", block: "Blocked", unblock: "Unblocked", set_expiry: "Expiry Updated" };
  return map[action] ?? action;
}

function actionColor(action: string) {
  if (action === "assigned" || action === "unblock") return "text-green-700 bg-green-50 border-green-200";
  if (action === "revoked" || action === "block") return "text-red-700 bg-red-50 border-red-200";
  if (action === "set_expiry") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function SubjectAccessBadge({ sub, onToggleBlock, onSetExpiry, onRevoke }: {
  sub: AssignedSubjectDetail;
  onToggleBlock: () => void;
  onSetExpiry: () => void;
  onRevoke: () => void;
}) {
  const statusDot = sub.accessStatus === "active" ? "bg-green-500" : sub.accessStatus === "expired" ? "bg-amber-500" : "bg-red-500";
  const containerCls = sub.accessStatus === "blocked"
    ? "bg-red-50 border-red-200"
    : sub.accessStatus === "expired"
    ? "bg-amber-50 border-amber-200"
    : "bg-primary/5 border-primary/20";

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1", containerCls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot)} />
      <span className="font-medium">{sub.code}</span>
      {sub.expiresAt && (
        <span className={cn("text-[10px]", sub.accessStatus === "expired" ? "text-amber-600 font-semibold" : "text-muted-foreground")}>
          {sub.accessStatus === "expired" ? "Expired" : "Exp"} {formatDate(sub.expiresAt)}
        </span>
      )}
      <button onClick={onSetExpiry} className="hover:text-amber-500 text-muted-foreground" title="Set expiry date">
        <Clock className="w-2.5 h-2.5" />
      </button>
      <button
        onClick={onToggleBlock}
        className={cn(sub.isBlocked ? "text-green-600 hover:text-green-700" : "text-amber-500 hover:text-amber-600")}
        title={sub.isBlocked ? "Unblock access" : "Block access"}
      >
        {sub.isBlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
      </button>
      <button onClick={onRevoke} className="hover:text-destructive text-muted-foreground" title="Revoke access">
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function AccessLogsView({ logs, isLoading }: { logs?: AccessLogEntry[]; isLoading: boolean }) {
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!logs?.length) return (
    <div className="flex flex-col items-center py-12 text-center text-muted-foreground gap-2">
      <ScrollText className="w-8 h-8 opacity-30" />
      <p>No access changes recorded yet</p>
    </div>
  );
  return (
    <div className="space-y-1">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded border shrink-0 mt-0.5", actionColor(log.action))}>
            {actionLabel(log.action)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{log.subjectCode} — {log.subjectName}</p>
            {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">{formatDate(log.performedAt)}</p>
            {log.performedByName && <p className="text-xs text-muted-foreground">by {log.performedByName}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const updateAccess = useUpdateSubjectAccess();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<StudentForm>(empty);
  const [search, setSearch] = useState("");

  const [assignStudent, setAssignStudent] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [assignExpiresAt, setAssignExpiresAt] = useState<string>("");

  const [setExpiryTarget, setSetExpiryTarget] = useState<SetExpiryTarget | null>(null);
  const [setExpiryDate, setSetExpiryDate] = useState<string>("");

  const [logsStudent, setLogsStudent] = useState<number | null>(null);
  const logsStudentName = students?.find(s => s.id === logsStudent)?.name ?? "";
  const { data: logs, isLoading: logsLoading } = useGetStudentAccessLogs(
    logsStudent ?? 0,
    { query: { enabled: logsStudent !== null } }
  );

  const inv = () => qc.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
  const today = new Date().toISOString().split("T")[0];

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: { id: number; name: string; email: string; whatsappNumber?: string | null }) {
    setEditing(s.id);
    setForm({ name: s.name, email: s.email, password: "", whatsappNumber: s.whatsappNumber ?? "" });
    setOpen(true);
  }

  function handleSave() {
    if (editing) {
      update.mutate({ userId: editing, data: { name: form.name, email: form.email, whatsappNumber: form.whatsappNumber } }, {
        onSuccess: () => { inv(); setOpen(false); toast({ title: "Student updated" }); },
      });
    } else {
      create.mutate({ data: { name: form.name, email: form.email, password: form.password, whatsappNumber: form.whatsappNumber } }, {
        onSuccess: () => { inv(); setOpen(false); toast({ title: "Student created" }); },
      });
    }
  }

  function handleAssign() {
    if (!assignStudent || !selectedSubject) return;
    assign.mutate({
      userId: assignStudent,
      data: { subjectId: parseInt(selectedSubject), expiresAt: assignExpiresAt ? new Date(assignExpiresAt).toISOString() : null },
    }, {
      onSuccess: () => { inv(); setSelectedSubject(""); setAssignExpiresAt(""); toast({ title: "Course assigned" }); },
      onError: () => toast({ title: "Already assigned", variant: "destructive" }),
    });
  }

  function handleToggleBlockSubject(userId: number, subjectId: number, isBlocked: boolean) {
    updateAccess.mutate({ userId, subjectId, data: { action: isBlocked ? "unblock" : "block" } }, {
      onSuccess: () => { inv(); toast({ title: isBlocked ? "Course access restored" : "Course access blocked" }); },
      onError: () => toast({ title: "Failed to update access", variant: "destructive" }),
    });
  }

  function openSetExpiry(target: SetExpiryTarget) {
    setSetExpiryTarget(target);
    setSetExpiryDate(toDateInput(target.currentExpiry));
  }

  function handleSetExpiry() {
    if (!setExpiryTarget) return;
    updateAccess.mutate({
      userId: setExpiryTarget.userId,
      subjectId: setExpiryTarget.subjectId,
      data: { action: "set_expiry", expiresAt: setExpiryDate ? new Date(setExpiryDate).toISOString() : null },
    }, {
      onSuccess: () => { inv(); setSetExpiryTarget(null); toast({ title: "Expiry updated" }); },
      onError: () => toast({ title: "Failed to update expiry", variant: "destructive" }),
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
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
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
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {s.assignedSubjects?.map(sub => (
                      <SubjectAccessBadge
                        key={sub.id}
                        sub={sub}
                        onToggleBlock={() => handleToggleBlockSubject(s.id, sub.id, sub.isBlocked)}
                        onSetExpiry={() => openSetExpiry({ userId: s.id, subjectId: sub.id, currentExpiry: sub.expiresAt })}
                        onRevoke={() => revoke.mutate({ userId: s.id, subjectId: sub.id }, { onSuccess: inv })}
                      />
                    ))}
                    <button
                      onClick={() => { setAssignStudent(s.id); setSelectedSubject(""); setAssignExpiresAt(""); }}
                      className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded-lg border border-dashed border-border hover:border-primary transition-colors"
                    >
                      + Assign
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setLogsStudent(s.id)} className="p-1.5 rounded hover:bg-muted" title="View access log">
                    <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => block.mutate({ userId: s.id, data: { isBlocked: !s.isBlocked } }, { onSuccess: inv })}
                    className="p-1.5 rounded hover:bg-muted"
                    title={s.isBlocked ? "Unblock student" : "Block student"}
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
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input data-testid="input-student-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input data-testid="input-student-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input data-testid="input-student-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>WhatsApp Number</Label>
              <Input value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+923001234567" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-save-student" className="flex-1" onClick={handleSave}
                disabled={!form.name || !form.email || (!editing && !form.password) || create.isPending || update.isPending}>
                {create.isPending || update.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign subject dialog */}
      <Dialog open={assignStudent !== null} onOpenChange={v => !v && setAssignStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Course to {assigningStudent?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Course</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(sub => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.code} — {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="date" value={assignExpiresAt} onChange={e => setAssignExpiresAt(e.target.value)} min={today} />
              <p className="text-xs text-muted-foreground">Leave blank for permanent access</p>
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

      {/* Set Expiry dialog */}
      <Dialog open={setExpiryTarget !== null} onOpenChange={v => !v && setSetExpiryTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Access Expiry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={setExpiryDate} onChange={e => setSetExpiryDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Clear the date to grant permanent access</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSetExpiryTarget(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSetExpiry} disabled={updateAccess.isPending}>
                {updateAccess.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Logs dialog */}
      <Dialog open={logsStudent !== null} onOpenChange={v => !v && setLogsStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle>Access Log — {logsStudentName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <AccessLogsView logs={logs} isLoading={logsLoading} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

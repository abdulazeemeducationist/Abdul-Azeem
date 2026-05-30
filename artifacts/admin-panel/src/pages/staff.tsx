import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, UserX, UserCheck, Search, UserCog } from "lucide-react";
import { getAuth } from "@/lib/auth";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  whatsappNumber: string | null;
  createdAt: string;
}

interface StaffForm {
  name: string;
  email: string;
  password: string;
  role: string;
  whatsappNumber: string;
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "Teacher",
  teacher_assistant: "Teaching Assistant",
};

const STAFF_QUERY_KEY = ["admin-staff"];

function authHeaders() {
  const auth = getAuth();
  return auth?.token ? { "Authorization": `Bearer ${auth.token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch("/api/admin/staff", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch staff");
  return res.json();
}

async function createStaff(data: StaffForm): Promise<StaffMember> {
  const res = await fetch("/api/admin/staff", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create staff"); }
  return res.json();
}

async function updateStaff(id: number, data: Omit<StaffForm, "password">): Promise<StaffMember> {
  const res = await fetch(`/api/admin/staff/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to update staff"); }
  return res.json();
}

async function toggleBlock(id: number, isBlocked: boolean): Promise<void> {
  await fetch(`/api/admin/staff/${id}/block`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isBlocked }),
  });
}

async function deleteStaff(id: number): Promise<void> {
  await fetch(`/api/admin/staff/${id}`, { method: "DELETE", headers: authHeaders() });
}

async function resetPassword(id: number, newPassword: string): Promise<void> {
  const res = await fetch(`/api/admin/staff/${id}/reset-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to reset password"); }
}

const empty: StaffForm = { name: "", email: "", password: "", role: "teacher", whatsappNumber: "" };

export default function StaffPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<StaffForm>(empty);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    setIsLoading(true);
    try { setStaff(await fetchStaff()); } catch { toast({ title: "Failed to load staff", variant: "destructive" }); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: StaffMember) {
    setEditing(s.id);
    setForm({ name: s.name, email: s.email, password: "", role: s.role, whatsappNumber: s.whatsappNumber ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateStaff(editing, { name: form.name, email: form.email, role: form.role, whatsappNumber: form.whatsappNumber });
        toast({ title: "Staff member updated" });
      } else {
        await createStaff(form);
        toast({ title: "Staff member created" });
      }
      setOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleToggleBlock(s: StaffMember) {
    await toggleBlock(s.id, !s.isBlocked);
    toast({ title: s.isBlocked ? "Staff member unblocked" : "Staff member blocked" });
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try { await deleteStaff(deleteId); setDeleteId(null); toast({ title: "Staff member deleted" }); load(); }
    catch { toast({ title: "Failed to delete", variant: "destructive" }); }
    finally { setDeleting(false); }
  }

  async function handleResetPassword() {
    if (!resetId || newPassword.length < 6) return;
    setResetting(true);
    try { await resetPassword(resetId, newPassword); setResetId(null); setNewPassword(""); toast({ title: "Password reset successfully" }); }
    catch (err: unknown) { toast({ title: err instanceof Error ? err.message : "Failed to reset", variant: "destructive" }); }
    finally { setResetting(false); }
  }

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor: Record<string, string> = {
    teacher: "bg-blue-100 text-blue-700",
    teacher_assistant: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">{staff.length} staff members (teachers &amp; assistants)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Staff Member</Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCog className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{search ? "No staff match your search." : "No staff members yet. Add teachers and assistants."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="bg-card border border-card-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-700">{s.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColor[s.role] ?? "bg-muted text-muted-foreground"}`}>
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                    {s.isBlocked && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                  {s.whatsappNumber && <p className="text-xs text-muted-foreground">{s.whatsappNumber}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted" title="Edit">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => { setResetId(s.id); setNewPassword(""); }} className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground hover:text-foreground px-2" title="Reset password">
                    Reset PW
                  </button>
                  <button onClick={() => handleToggleBlock(s)} className="p-1.5 rounded hover:bg-muted" title={s.isBlocked ? "Unblock" : "Block"}>
                    {s.isBlocked ? <UserCheck className="w-4 h-4 text-green-500" /> : <UserX className="w-4 h-4 text-destructive" />}
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded hover:bg-muted" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Staff Member" : "New Staff Member"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="teacher_assistant">Teaching Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" /></div>
            {!editing && (
              <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
            )}
            <div className="space-y-1.5"><Label>WhatsApp Number</Label><Input value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+923001234567" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={!form.name || !form.email || (!editing && !form.password) || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this staff member from the system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password dialog */}
      <Dialog open={resetId !== null} onOpenChange={v => !v && setResetId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setResetId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleResetPassword} disabled={newPassword.length < 6 || resetting}>
                {resetting ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

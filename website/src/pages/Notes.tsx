import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  StickyNote,
  Plus,
  Trash2,
  Check,
  IndianRupee,
  Clock,
  User,
  Edit,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Note {
  _id: string;
  title: string;
  content: string;
  type: string;
  amount: number;
  personName: string;
  isResolved: boolean;
  createdAt: string;
}

const NOTE_TYPES = [
  { value: "money_given", label: "Money Given", color: "bg-green-100 text-green-800" },
  { value: "money_pending", label: "Money Pending", color: "bg-red-100 text-red-800" },
  { value: "reminder", label: "Reminder", color: "bg-yellow-100 text-yellow-800" },
  { value: "general", label: "General", color: "bg-gray-100 text-gray-800" },
];

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "general",
    amount: 0,
    personName: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === "pending") params.resolved = false;
      if (filter === "resolved") params.resolved = true;
      if (["money_given", "money_pending", "reminder", "general"].includes(filter)) {
        params.type = filter;
      }
      const data = await api.getNotes(params);
      setNotes(data.notes || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load notes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [filter]);

  const resetForm = () => {
    setForm({ title: "", content: "", type: "general", amount: 0, personName: "" });
  };

  const openAdd = () => {
    resetForm();
    setEditNote(null);
    setShowAdd(true);
  };

  const openEdit = (note: Note) => {
    setForm({
      title: note.title,
      content: note.content,
      type: note.type,
      amount: note.amount,
      personName: note.personName || "",
    });
    setEditNote(note);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editNote) {
        await api.updateNote(editNote._id, form);
        toast({ title: "Updated", description: "Note updated" });
      } else {
        await api.createNote(form);
        toast({ title: "Created", description: "Note added" });
      }
      setShowAdd(false);
      resetForm();
      setEditNote(null);
      fetchNotes();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await api.deleteNote(id);
      toast({ title: "Deleted", description: "Note removed" });
      fetchNotes();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const toggleResolved = async (note: Note) => {
    try {
      await api.updateNote(note._id, { isResolved: !note.isResolved });
      fetchNotes();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const getTypeInfo = (type: string) => {
    return NOTE_TYPES.find((t) => t.value === type) || NOTE_TYPES[3];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <StickyNote className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notes</h1>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="money_given">Money Given</SelectItem>
              <SelectItem value="money_pending">Money Pending</SelectItem>
              <SelectItem value="reminder">Reminders</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notes yet</p>
          <Button className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add your first note
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const typeInfo = getTypeInfo(note.type);
            return (
              <Card
                key={note._id}
                className={`hover:shadow-md transition-shadow ${note.isResolved ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                        {note.isResolved && (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Done
                          </Badge>
                        )}
                      </div>
                      <h3 className={`font-semibold ${note.isResolved ? "line-through" : ""}`}>
                        {note.title}
                      </h3>
                    </div>
                  </div>

                  {note.content && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note.content}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    {note.personName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {note.personName}
                      </span>
                    )}
                    {note.amount > 0 && (
                      <span className="flex items-center gap-1 font-medium text-primary">
                        <IndianRupee className="h-3 w-3" /> {note.amount}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(note.createdAt)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={note.isResolved ? "outline" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleResolved(note)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {note.isResolved ? "Undo" : "Done"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(note)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(note._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editNote ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Gave ₹500 to Raju"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Person Name</Label>
                <Input
                  value={form.personName}
                  onChange={(e) => setForm((p) => ({ ...p, personName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount || ""}
                  onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editNote ? "Update" : "Add Note"}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

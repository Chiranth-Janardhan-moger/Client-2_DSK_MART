import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Plus, Search, Trash2, Edit, Hash } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Address {
  _id: string;
  address: string;
  usageCount: number;
  createdAt: string;
}

export default function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);
  const [formValue, setFormValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await api.getAddresses(search || undefined);
      setAddresses(data.addresses || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load addresses", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchAddresses(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    setFormValue("");
    setEditAddress(null);
    setShowAdd(true);
  };

  const openEdit = (addr: Address) => {
    setFormValue(addr.address);
    setEditAddress(addr);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!formValue.trim() || formValue.trim().length < 3) {
      toast({ title: "Error", description: "Address must be at least 3 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editAddress) {
        await api.updateAddress(editAddress._id, formValue.trim());
        toast({ title: "Updated", description: "Address updated" });
      } else {
        await api.saveAddress(formValue.trim());
        toast({ title: "Added", description: "Address added" });
      }
      setShowAdd(false);
      setFormValue("");
      setEditAddress(null);
      fetchAddresses();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addr: Address) => {
    if (!confirm(`Delete "${addr.address}"?`)) return;
    try {
      await api.deleteAddress(addr._id);
      toast({ title: "Deleted", description: "Address removed" });
      fetchAddresses();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Addresses</h1>
          <span className="text-sm text-muted-foreground">({addresses.length})</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search addresses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{search ? "No addresses found" : "No addresses yet"}</p>
          <Button className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add your first address
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map((addr) => (
            <Card key={addr._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{addr.address}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Used {addr.usageCount} times
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(addr)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(addr)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAddress ? "Edit Address" : "Add Address"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Enter address..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editAddress ? "Update" : "Add Address"}
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

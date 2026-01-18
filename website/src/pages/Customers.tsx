import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, Trash2, Phone, MapPin, ShoppingBag, Edit } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  houseFlatNumber: string;
  address: string;
  orderCount: number;
  lastOrderAt: string;
  createdAt: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", houseFlatNumber: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (search) params.search = search;
      const data = await api.getCustomers(params);
      setCustomers(data.customers || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load customers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const resetForm = () => setFormData({ name: "", phone: "", houseFlatNumber: "", address: "" });

  const openAdd = () => {
    resetForm();
    setEditCustomer(null);
    setShowAddForm(true);
  };

  const openEdit = (c: Customer) => {
    setFormData({ name: c.name, phone: c.phone, houseFlatNumber: c.houseFlatNumber || "", address: c.address || "" });
    setEditCustomer(c);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editCustomer) {
        await api.updateCustomer(editCustomer._id, formData);
        toast({ title: "Updated", description: "Customer updated" });
      } else {
        await api.saveCustomer(formData);
        toast({ title: "Added", description: "Customer added" });
      }
      setShowAddForm(false);
      resetForm();
      setEditCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await api.deleteCustomer(id);
      toast({ title: "Deleted", description: "Customer removed" });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);

  const searchAddresses = async (query: string) => {
    if (query.length < 2) { setAddressSuggestions([]); setShowAddressSuggestions(false); return; }
    try {
      const data = await api.searchAddresses(query);
      setAddressSuggestions(data.addresses || []);
      setShowAddressSuggestions((data.addresses || []).length > 0);
    } catch (error) {}
  };


  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Customers</h1>
          <span className="text-sm text-muted-foreground">({customers.length})</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{search ? "No customers found" : "No customers yet"}</p>
          <Button className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <Card key={c._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{c.name}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" /> {c.orderCount}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
                      {(c.houseFlatNumber || c.address) && (
                        <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {[c.houseFlatNumber, c.address].filter(Boolean).join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c._id, c.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} placeholder="Customer name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: formatPhone(e.target.value)}))} placeholder="10 digit number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>House/Flat No</Label>
              <Input value={formData.houseFlatNumber} onChange={(e) => setFormData(p => ({...p, houseFlatNumber: e.target.value}))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5 relative">
              <Label>Address</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => { setFormData(p => ({...p, address: e.target.value})); searchAddresses(e.target.value); }}
                onFocus={() => formData.address && searchAddresses(formData.address)}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                placeholder="Start typing address..." 
              />
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                  {addressSuggestions.map((addr, idx) => (
                    <div key={idx} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b last:border-b-0" onMouseDown={(e) => { e.preventDefault(); setFormData(p => ({...p, address: addr})); setShowAddressSuggestions(false); }}>
                      {addr}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editCustomer ? "Update" : "Add Customer"}</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

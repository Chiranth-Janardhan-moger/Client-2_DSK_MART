import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Edit, Trash2, Phone, MapPin, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function OrdersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ customerName: "", customerPhone: "", address: "", totalAmount: 0 });
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders({ page: 1, limit: 100 });
      setOrders(data.orders);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const filteredOrders = orders.filter(order => 
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerPhone?.includes(searchQuery)
  );

  const openEdit = (order: any) => {
    setEditOrder(order);
    setEditForm({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      address: order.deliveryAddress?.addressLine || order.deliveryAddress?.city || "",
      totalAmount: order.totalAmount || 0
    });
  };

  const handleSave = async () => {
    if (!editOrder) return;
    
    const orderId = editOrder._id;
    if (!orderId) {
      toast({ title: "Error", description: "Invalid order ID", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      console.log("Updating order:", orderId, editForm);
      await api.updateOrder(orderId, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        deliveryAddress: { addressLine: editForm.address, city: "" },
        totalAmount: editForm.totalAmount
      });
      toast({ title: "Success", description: "Order updated successfully" });
      setEditOrder(null);
      loadOrders();
    } catch (error: any) {
      console.error("Update error:", error);
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (order: any) => {
    if (!confirm(`Delete order ${order.orderId}?`)) return;
    try {
      const orderId = order._id;
      if (!orderId) {
        toast({ title: "Error", description: "Invalid order ID", variant: "destructive" });
        return;
      }
      await api.deleteOrder(orderId);
      toast({ title: "Deleted", description: "Order removed" });
      loadOrders();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Assigned': return 'bg-blue-100 text-blue-800';
      case 'Picked Up': return 'bg-purple-100 text-purple-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Orders ({filteredOrders.length})</h1>
        <div className="flex gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" size="icon" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No orders found</div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{order.orderId}</span>
                      <Badge className={`${getStatusColor(order.deliveryStatus)}`}>
                        {order.deliveryStatus}
                      </Badge>
                      <span className="font-medium text-primary">₹{order.totalAmount}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {order.customerName}
                      </span>
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {order.customerPhone}
                      </span>
                    </div>
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{order.deliveryAddress.addressLine || order.deliveryAddress.city}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(order)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(order)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={editForm.customerName} onChange={(e) => setEditForm(p => ({...p, customerName: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.customerPhone} onChange={(e) => setEditForm(p => ({...p, customerPhone: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm(p => ({...p, address: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" value={editForm.totalAmount} onChange={(e) => setEditForm(p => ({...p, totalAmount: parseFloat(e.target.value) || 0}))} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : "Save Changes"}</Button>
              <Button variant="outline" onClick={() => setEditOrder(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

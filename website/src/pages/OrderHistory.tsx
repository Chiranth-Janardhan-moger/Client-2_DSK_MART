import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Package, User, Phone, IndianRupee, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryStatus: string;
  paymentStatus: string;
  paymentMode: string;
  deliveredAt: string;
  deliveredBy: string;
  assignedDeliveryBoy?: {
    id: string;
    name: string;
    phone: string;
  };
  deliveryAddress: {
    addressLine: string;
    city: string;
    pincode: string;
  };
}

interface DeliveryBoy {
  _id: string;
  name: string;
  phone: string;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [total, setTotal] = useState(0);


  useEffect(() => {
    loadHistory();
    loadDeliveryBoys();
  }, [selectedDriver]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (selectedDriver && selectedDriver !== 'all') {
        params.deliveryBoyId = selectedDriver;
      }
      const data = await api.getHistory(params);
      setOrders(data.orders);
      setTotalRevenue(data.totalRevenue);
      setTotal(data.total);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryBoys = async () => {
    try {
      const data = await api.getDeliveryBoys({ limit: 100 });
      setDeliveryBoys(data.deliveryBoys);
    } catch (error) {
      console.error('Failed to load delivery boys:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Delivered Orders</h1>
          <p className="text-sm text-muted-foreground">All completed deliveries</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2">
             
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-green-600">₹{totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </Card>
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-lg font-bold text-blue-600">{total}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDriver} onValueChange={setSelectedDriver}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers</SelectItem>
            {deliveryBoys.map((db) => (
              <SelectItem key={db._id} value={db._id}>{db.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadHistory}>
          <Package className="h-4 w-4" />
        </Button>
      </div>


      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No completed orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card key={order._id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.orderId}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(order.deliveredAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-600">Delivered</Badge>
                    <p className="text-xl font-bold mt-1">₹{order.totalAmount}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customerPhone}</span>
                    </div>
                  </div>

                  {/* Delivery Boy Info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Delivered By</p>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{order.assignedDeliveryBoy?.name || order.deliveredBy || 'Unknown'}</span>
                    </div>
                    {order.assignedDeliveryBoy?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{order.assignedDeliveryBoy.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Payment</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{order.paymentMode}</Badge>
                      <Badge variant={order.paymentStatus === 'Completed' ? 'default' : 'secondary'}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length || 0} item(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
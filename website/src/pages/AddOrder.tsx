import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Search, Barcode, Package, AlertCircle } from "lucide-react";
import { Order, OrderItem } from "@/types/order";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const generateOrderId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}${random}`;
};

const formatPhoneNumber = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  else if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10) digits = digits.slice(0, 10);
  return digits;
};

interface ScannedItem {
  id: string;
  name: string;
  weight_kg: number;
  price_per_kg: number;
  total_price: number;
  product_id: string;
  barcode: string;
}

// Optimized scanned item component with memo to prevent unnecessary re-renders
const ScannedItemCard = memo(({ 
  item, 
  onRemove, 
  onPriceChange 
}: { 
  item: ScannedItem; 
  onRemove: (id: string) => void;
  onPriceChange: (id: string, newPrice: number) => void;
}) => (
  <div className="p-3 border rounded-lg space-y-2 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
    <div className="flex items-center justify-between">
      <span className="font-medium text-sm">{item.name}</span>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 text-destructive" 
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div>
        <div className="text-xs text-muted-foreground">Weight</div>
        <div className="font-medium">{item.weight_kg} kg</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Price/kg</div>
        <Input
          type="number"
          step="0.01"
          value={item.price_per_kg}
          onChange={(e) => onPriceChange(item.id, parseFloat(e.target.value) || 0)}
          className="h-7 text-sm w-20 px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Total</div>
        <div className="font-bold">₹{item.total_price.toFixed(2)}</div>
      </div>
    </div>
  </div>
));

ScannedItemCard.displayName = 'ScannedItemCard';

export default function AddOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editOrderId = searchParams.get("edit");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Order>>({
    orderId: generateOrderId(),
    customerName: "",
    phoneNumber: "",
    houseFlatNumber: "",
    streetArea: "",
    paymentMode: "UPI",
    items: [{ id: Date.now().toString(), name: "", quantity: 1, price: 0 }],
  });

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({ product_id: "", name: "", price_per_kg: "" });
  const [scanError, setScanError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualItemDialog, setShowManualItemDialog] = useState(false);
  const [manualItem, setManualItem] = useState({ name: "", price: "" });

  useEffect(() => {
    if (editOrderId) {
      api.getOrder(editOrderId).then(order => setFormData(order)).catch(() => {
        toast({ title: "Error", description: "Failed to load order", variant: "destructive" });
      });
    }
  }, [editOrderId]);

  // Auto-scan detection: barcode is always exactly 10 digits - instant scan when reached
  useEffect(() => {
    if (barcodeInput && /^\d{10}$/.test(barcodeInput)) {
      // Instantly scan when exactly 10 digits - no delay
      handleBarcodeScan(barcodeInput);
    }
  }, [barcodeInput]);

  const updateFormData = <K extends keyof Order>(field: K, value: Order[K]) => {
    setFormData(prev => ({ ...prev, [field]: value } as Partial<Order>));
  };

  const addManualItem = () => {
    if (!manualItem.name.trim() || !manualItem.price) {
      toast({ title: "Error", description: "Name and price required", variant: "destructive" });
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []).filter(i => i.name?.trim()), { id: Date.now().toString(), name: manualItem.name.trim(), quantity: 1, price: parseFloat(manualItem.price) }],
    }));
    setManualItem({ name: "", price: "" });
    setShowManualItemDialog(false);
    toast({ title: "Added", description: `${manualItem.name} added` });
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({ ...prev, items: (prev.items || []).filter(item => item.id !== id) }));
  };

  const updateItem = <K extends keyof OrderItem>(id: string, field: K, value: OrderItem[K]) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map(item => item.id === id ? ({ ...item, [field]: value } as OrderItem) : item),
    }));
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode || barcode.length < 6) {
      setScanError("Barcode must be at least 6 digits");
      return;
    }
    setScanError(null);
    setIsScanning(true);
    
    // Clear input immediately for faster UX
    setBarcodeInput("");
    
    try {
      const result = await api.scanBarcode(barcode);
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        name: result.product_name,
        weight_kg: result.weight_kg,
        price_per_kg: result.price_per_kg,
        total_price: result.total_price,
        product_id: result.product_id,
        barcode: barcode
      };
      
      // Add item immediately to state for instant UI update
      setScannedItems(prev => [newItem, ...prev]); // Add to top for visibility
      
      // Quick toast notification
      toast({ 
        title: "✅ Scanned", 
        description: `${result.product_name} - ${result.weight_kg}kg - ₹${result.total_price}`,
        duration: 1500 // Even shorter for rapid scanning
      });
      
      // Refocus input for next scan
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    } catch (error: any) {
      setBarcodeInput(barcode); // Restore on error
      if (error.message?.includes("not registered")) {
        setScanError(`Product ID "${barcode.slice(0, -5)}" not found. Add it first.`);
        setNewProduct({ ...newProduct, product_id: barcode.slice(0, -5) });
      } else {
        setScanError(error.message || "Failed to scan barcode");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const removeScannedItem = useCallback((id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateScannedItemPrice = useCallback((id: string, newPrice: number) => {
    setScannedItems(prev => prev.map(i => 
      i.id === id 
        ? { ...i, price_per_kg: newPrice, total_price: Math.round(i.weight_kg * newPrice * 100) / 100 }
        : i
    ));
  }, []);

  const searchProducts = async (query: string) => {
    if (query.length < 1) { setProductSuggestions([]); setShowProductSuggestions(false); return; }
    try {
      const data = await api.searchProducts(query);
      setProductSuggestions(data.products || []);
      setShowProductSuggestions((data.products || []).length > 0);
    } catch (error) { console.error('Failed to search products:', error); }
  };

  const selectProduct = (product: any) => {
    const newItem: ScannedItem = {
      id: Date.now().toString(), name: product.name, weight_kg: 1, price_per_kg: product.price_per_kg,
      total_price: product.price_per_kg, product_id: product.product_id, barcode: ""
    };
    setScannedItems(prev => [...prev, newItem]);
    setProductSearch("");
    setShowProductSuggestions(false);
    toast({ title: "Added", description: `${product.name} added (1kg)` });
  };

  const handleAddProduct = async () => {
    if (!newProduct.product_id || !newProduct.name || !newProduct.price_per_kg) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }
    try {
      await api.createProduct({ product_id: newProduct.product_id, name: newProduct.name, price_per_kg: parseFloat(newProduct.price_per_kg) });
      toast({ title: "Success", description: "Product added! You can now scan it." });
      setShowAddProductDialog(false);
      setNewProduct({ product_id: "", name: "", price_per_kg: "" });
      setScanError(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const calculateManualTotal = () => (formData.items || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const calculateScannedTotal = () => scannedItems.reduce((sum, item) => sum + item.total_price, 0);
  const calculateTotal = () => calculateManualTotal() + calculateScannedTotal();
  const generateFullAddress = () => [formData.houseFlatNumber, formData.streetArea].filter(Boolean).join(", ");

  const searchCustomers = async (query: string) => {
    if (query.length < 2) { setCustomerSuggestions([]); setShowCustomerSuggestions(false); return; }
    try {
      const data = await api.searchCustomers(query);
      setCustomerSuggestions(data.customers || []);
      setShowCustomerSuggestions((data.customers || []).length > 0);
    } catch (error) { console.error('Failed to search customers:', error); }
  };

  const selectCustomer = (customer: any) => {
    setFormData(prev => ({ ...prev, customerName: customer.name, phoneNumber: customer.phone, houseFlatNumber: customer.houseFlatNumber || '', streetArea: customer.address || '' }));
    setShowCustomerSuggestions(false);
  };

  const searchAddresses = async (query: string) => {
    if (query.length < 2) { setAddressSuggestions([]); return; }
    try {
      const data = await api.searchAddresses(query);
      setAddressSuggestions(data.addresses || []);
      setShowSuggestions(data.addresses?.length > 0);
    } catch (error) { console.error('Failed to search addresses:', error); }
  };

  const selectAddress = (address: string) => { updateFormData("streetArea", address); setShowSuggestions(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const missingFields: string[] = [];
    if (!formData.customerName?.trim()) missingFields.push("Customer Name");
    if (!formData.phoneNumber?.trim()) missingFields.push("Phone Number");
    if (!formData.streetArea?.trim()) missingFields.push("Address");
    const hasManualItem = (formData.items || []).some(item => item.name?.trim() && Number(item.price) > 0);
    const hasScannedItem = scannedItems.length > 0;
    if (!hasManualItem && !hasScannedItem) missingFields.push("At least one item");
    if (missingFields.length > 0) {
      toast({ title: "⚠️ Pending", description: `Please fill: ${missingFields.join(", ")}`, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const manualItems = (formData.items || []).filter(item => item.name?.trim()).map(item => ({ name: item.name.trim(), quantity: 1, price: Number(item.price) || 0 }));
      const scannedOrderItems = scannedItems.map(item => ({ name: `${item.name} (${item.weight_kg}kg)`, quantity: 1, price: item.total_price }));
      const allItems = [...manualItems, ...scannedOrderItems];
      await api.createOrder({ customerName: formData.customerName!.trim(), customerPhone: formData.phoneNumber!.trim(), items: allItems, deliveryAddress: { addressLine: generateFullAddress(), city: formData.streetArea?.trim() || "" }, totalAmount: calculateTotal(), paymentMode: formData.paymentMode || 'UPI' });
      try { await api.saveCustomer({ name: formData.customerName!.trim(), phone: formData.phoneNumber!.trim(), houseFlatNumber: formData.houseFlatNumber || '', address: formData.streetArea || '' }); } catch (e) {}
      toast({ title: "✅ Order Created", description: "Order sent to delivery boys!" });
      navigate("/orders");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create order", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4"><h1 className="text-2xl font-bold">{editOrderId ? "Edit Order" : "Create Order"}</h1></div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
          {/* Left Column: Customer Details + Payment */}
          <div className="space-y-4">
            {/* Customer Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Customer Details</CardTitle>
                <CardDescription>Information about the customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 relative">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input id="customerName" value={formData.customerName} onChange={(e) => { updateFormData("customerName", e.target.value); searchCustomers(e.target.value); }} onFocus={() => formData.customerName && searchCustomers(formData.customerName || '')} onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)} placeholder="Start typing..." />
                  {showCustomerSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                      {customerSuggestions.map((c) => (<div key={c._id} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b last:border-b-0" onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}><div className="font-medium">{c.name}</div><div className="text-xs text-gray-500">{c.phone} • {c.orderCount} orders</div></div>))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input id="phoneNumber" type="tel" value={formData.phoneNumber} onChange={(e) => { const f = formatPhoneNumber(e.target.value); updateFormData("phoneNumber", f); searchCustomers(f); }} placeholder="10 digit number" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="houseFlatNumber">House/Flat Number</Label>
                  <Input id="houseFlatNumber" placeholder="e.g., 12-A" value={formData.houseFlatNumber} onChange={(e) => updateFormData("houseFlatNumber", e.target.value)} />
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="streetArea">Address *</Label>
                  <Input id="streetArea" placeholder="Start typing address..." value={formData.streetArea} onChange={(e) => { updateFormData("streetArea", e.target.value); searchAddresses(e.target.value); }} onFocus={() => formData.streetArea && searchAddresses(formData.streetArea || '')} onBlur={() => setTimeout(() => setShowSuggestions(false), 300)} />
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                      {addressSuggestions.map((addr, idx) => (<div key={idx} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b last:border-b-0" onMouseDown={(e) => { e.preventDefault(); selectAddress(addr); }}>{addr}</div>))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-2.5 bg-muted rounded-md">
                <p className="text-xs font-medium text-muted-foreground">Full Address</p>
                <p className="text-sm">{generateFullAddress() || "Address will appear here"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Delivery & Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <ToggleGroup type="single" value={formData.paymentMode} onValueChange={(value) => typeof value === "string" && updateFormData("paymentMode", value as Order["paymentMode"])} className="justify-start">
                    <ToggleGroupItem value="Cash" className="px-4">Cash</ToggleGroupItem>
                    <ToggleGroupItem value="UPI" className="px-4">UPI</ToggleGroupItem>
                    <ToggleGroupItem value="Card" className="px-4">Card</ToggleGroupItem>
                    <ToggleGroupItem value="Paid" className="px-4">Paid</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">₹{calculateTotal().toFixed(2)}</p>
                  {scannedItems.length > 0 && calculateManualTotal() > 0 && (<p className="text-xs text-muted-foreground mt-1">Scanned: ₹{calculateScannedTotal().toFixed(2)} + Manual: ₹{calculateManualTotal().toFixed(2)}</p>)}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Creating...</>) : (<><Save className="h-4 w-4 mr-2" />{editOrderId ? "Update" : "Save Order"}</>)}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/orders")} disabled={isSubmitting} className="flex-1">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Right Column: Order Details (Scrollable) */}
          <Card className="lg:max-h-[calc(100vh-8rem)] lg:min-h-[500px] flex flex-col relative overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0 border-b bg-white z-10 rounded-t-lg">
              <div>
                <CardTitle className="text-lg">Order Details</CardTitle>
                <CardDescription>Order ID: {formData.orderId}</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowManualItemDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Manual Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 p-4">
              {/* Scanner */}
              <div className="relative z-20">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  placeholder="Scan barcode or search product..."
                  value={barcodeInput || productSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d+$/.test(val) || val === "") { 
                      setBarcodeInput(val); 
                      setProductSearch(""); 
                    }
                    else { 
                      setProductSearch(val); 
                      setBarcodeInput(""); 
                      searchProducts(val); 
                    }
                  }}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && barcodeInput) { 
                      e.preventDefault(); 
                      handleBarcodeScan(barcodeInput); 
                    } 
                  }}
                  className="pl-10"
                  autoFocus
                  inputMode="numeric"
                />
                {showProductSuggestions && productSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-y-auto max-h-48">
                      {productSuggestions.map((p, index) => (
                        <div key={p._id} className={`px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 ${index === 0 ? 'rounded-t-lg' : ''} ${index === productSuggestions.length - 1 ? 'rounded-b-lg' : ''}`} onMouseDown={(e) => { e.preventDefault(); selectProduct(p); }}>
                          <div className="flex justify-between items-center">
                            <div><div className="font-medium text-sm">{p.name}</div><div className="text-xs text-gray-500">ID: {p.product_id}</div></div>
                            <div className="text-sm font-medium text-primary">₹{p.price_per_kg}/kg</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {isScanning && (
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded animate-pulse">
                  <Package className="h-4 w-4" />
                  <span>Scanning...</span>
                </div>
              )}
              
              {scanError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4" /><span>{scanError}</span>
                  <Button type="button" variant="link" size="sm" className="ml-auto text-primary" onClick={() => setShowAddProductDialog(true)}>+ Add Product</Button>
                </div>
              )}

              {/* Items List - Optimized rendering */}
              {scannedItems.length > 0 && (
                <div className="space-y-2">
                  {scannedItems.map((item) => (
                    <ScannedItemCard
                      key={item.id}
                      item={item}
                      onRemove={removeScannedItem}
                      onPriceChange={updateScannedItemPrice}
                    />
                  ))}
                </div>
              )}

              {/* Manual Items */}
              {(formData.items || []).filter(item => item.name?.trim()).map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.name}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-bold text-lg">₹{Number(item.price || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Add a product to the database for barcode scanning</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Product ID (from barcode prefix)</Label>
              <Input placeholder="e.g., 073" value={newProduct.product_id} onChange={(e) => setNewProduct({ ...newProduct, product_id: e.target.value })} />
              <p className="text-xs text-muted-foreground">All digits before the last 5 in barcode</p>
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input placeholder="e.g., Skinless Chicken" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price per KG (₹)</Label>
              <Input type="number" step="0.01" placeholder="e.g., 219.00" value={newProduct.price_per_kg} onChange={(e) => setNewProduct({ ...newProduct, price_per_kg: e.target.value })} />
            </div>
            <Button onClick={handleAddProduct} className="w-full">Add Product</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Manual Item Dialog */}
      <Dialog open={showManualItemDialog} onOpenChange={setShowManualItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Item</DialogTitle>
            <DialogDescription>Add an item without barcode scanning</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="e.g., Chicken Curry" value={manualItem.name} onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" step="0.01" placeholder="e.g., 250.00" value={manualItem.price} onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })} />
            </div>
            <Button onClick={addManualItem} className="w-full">Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
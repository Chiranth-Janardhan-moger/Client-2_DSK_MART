import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, CheckCircle, Users, LogOut, ChevronRight, ArrowLeft, Trash2, AlertTriangle, Sparkles, Smartphone, Globe, MapPin, StickyNote } from "lucide-react";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { toast } from "@/hooks/use-toast";

type SettingsView = "menu" | "password" | "deleteData" | "whatsNew";

export default function Settings() {
  const navigate = useNavigate();
  const [view, setView] = useState<SettingsView>("menu");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
    if (success) setSuccess(false);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) { setError("Current password is required"); return false; }
    if (!formData.newPassword) { setError("New password is required"); return false; }
    if (formData.newPassword.length < 6) { setError("New password must be at least 6 characters"); return false; }
    if (formData.newPassword !== formData.confirmPassword) { setError("New passwords do not match"); return false; }
    if (formData.currentPassword === formData.newPassword) { setError("New password must be different"); return false; }
    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setError("");
      await api.changePassword(formData.currentPassword, formData.newPassword);
      setSuccess(true);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    wsClient.disconnect();
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    window.location.href = '/login';
  };

  // Settings Menu View
  if (view === "menu") {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account</p>
        </div>

        <div className="space-y-4">
          {/* Account Section - Mobile Only */}
          <div className="md:hidden">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Account</p>
            <div className="space-y-2">
              <Card className="cursor-pointer hover:bg-purple-50 transition-colors border-purple-200" onClick={() => setView("password")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-700">Change Password</p>
                      <p className="text-sm text-muted-foreground">Update your password</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-purple-400" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-indigo-50 transition-colors border-indigo-200" onClick={() => navigate("/settings/users")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-indigo-700">Manage Users</p>
                      <p className="text-sm text-muted-foreground">Add or remove delivery boys</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-indigo-400" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Data Management Section */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Data Management</p>
            <div className="space-y-2">
              <Card className="cursor-pointer hover:bg-green-50 transition-colors border-green-200" onClick={() => navigate("/customers")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700">Customers</p>
                      <p className="text-sm text-muted-foreground">Manage customer list</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-green-400" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-blue-50 transition-colors border-blue-200" onClick={() => navigate("/addresses")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-700">Addresses</p>
                      <p className="text-sm text-muted-foreground">Manage saved addresses</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-yellow-50 transition-colors border-yellow-200" onClick={() => navigate("/notes")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <StickyNote className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-700">Notes</p>
                      <p className="text-sm text-muted-foreground">Memory & reminders</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-yellow-400" />
                </CardContent>
              </Card>
            </div>
          </div>


          {/* About Section - Mobile Only */}
          <div className="md:hidden">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">About</p>
            <Card className="cursor-pointer hover:bg-purple-50 transition-colors border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50" onClick={() => setView("whatsNew")}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-700">What's New</p>
                    <p className="text-sm text-muted-foreground">v1.5.4 • Latest updates</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-purple-400" />
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Danger Zone</p>
            <Card className="cursor-pointer hover:bg-red-50 transition-colors border-red-300 bg-red-50/30" onClick={() => setView("deleteData")}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Delete All Data</p>
                    <p className="text-sm text-muted-foreground">Remove all orders & history</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-red-400" />
              </CardContent>
            </Card>
          </div>

          {/* Logout - Mobile Only */}
          <div className="md:hidden pt-4">
            <Card className="cursor-pointer hover:bg-red-50 transition-colors border-red-200" onClick={handleLogout}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Logout</p>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }


  // What's New View
  if (view === "whatsNew") {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => setView("menu")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">What's New</h1>
          </div>
          <p className="text-muted-foreground text-sm">Latest updates and improvements</p>
        </div>

        <div className="space-y-6">
          {/* Version 1.5.4 - Latest */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Latest</span>
              <span className="text-lg font-bold">v1.5.4</span>
            </div>
            
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-700">Admin Website</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <div>
                      <span className="font-medium">Notes & Memory</span>
                      <p className="text-xs text-gray-500">Track money given/pending, reminders</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <div>
                      <span className="font-medium">Address Management</span>
                      <p className="text-xs text-gray-500">Edit, delete, add saved addresses</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <div>
                      <span className="font-medium">Improved Order Edit/Delete</span>
                      <p className="text-xs text-gray-500">Better error handling and validation</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <div>
                      <span className="font-medium">Decimal Price Support</span>
                      <p className="text-xs text-gray-500">Enter prices like ₹78.90</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <div>
                      <span className="font-medium">Redesigned Settings</span>
                      <p className="text-xs text-gray-500">Better organized mobile settings</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Version 1.4.0 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-gray-600">v1.4.0</span>
            </div>
            
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 overflow-hidden mb-3">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-purple-700">Mobile App</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Auto-Update Checker</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Network Status Banner</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> 30-Day Session</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Prominent Address Display</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-700">Admin Website</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Google Sheets Sync</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Live Order Tracking</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Address Autocomplete</li>
                  <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Customer Management</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">DSK Delivery System • Built with ❤️</p>
        </div>
      </div>
    );
  }


  // Delete Data View
  if (view === "deleteData") {
    const handleDeleteAll = async () => {
      if (deleteConfirm !== "DELETE") {
        toast({ title: "Confirmation Required", description: "Please type DELETE to confirm", variant: "destructive" });
        return;
      }
      try {
        setDeleting(true);
        const result = await api.deleteAllData();
        toast({ title: "Data Deleted", description: `Deleted ${result.deleted.orders} orders and ${result.deleted.transactions} transactions.` });
        setDeleteConfirm("");
        setView("menu");
      } catch (err: any) {
        toast({ title: "Delete Failed", description: err.message || "Failed to delete data", variant: "destructive" });
      } finally {
        setDeleting(false);
      }
    };

    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => { setView("menu"); setDeleteConfirm(""); }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete All Data
            </CardTitle>
            <CardDescription>
              This will permanently delete all orders, delivery history, and transactions. Saved addresses will be preserved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Warning: This action cannot be undone.</AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input id="deleteConfirm" type="text" placeholder="Type DELETE" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} disabled={deleting} className="border-red-300" />
            </div>
            <Button variant="destructive" className="w-full" onClick={handleDeleteAll} disabled={deleting || deleteConfirm !== "DELETE"}>
              {deleting ? "Deleting..." : "Delete All Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Change Password View
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => setView("menu")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="border-green-500 bg-green-50"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-600">Password changed successfully!</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input id="currentPassword" type={showPasswords.current ? "text" : "password"} value={formData.currentPassword} onChange={(e) => handleInputChange("currentPassword", e.target.value)} disabled={loading} className="pr-10" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => togglePasswordVisibility('current')}>
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input id="newPassword" type={showPasswords.new ? "text" : "password"} value={formData.newPassword} onChange={(e) => handleInputChange("newPassword", e.target.value)} disabled={loading} className="pr-10" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => togglePasswordVisibility('new')}>
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showPasswords.confirm ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} disabled={loading} className="pr-10" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => togglePasswordVisibility('confirm')}>
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Changing Password..." : "Change Password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

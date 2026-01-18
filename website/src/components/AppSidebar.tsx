import { useState } from "react";
import { Home, Plus, List, LogOut, CheckCircle, MapPin, FileSpreadsheet, Users, StickyNote, Package } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { toast } from "@/hooks/use-toast";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";



const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Create Order", url: "/add-order", icon: Plus },
  { title: "Orders", url: "/orders", icon: List },
  { title: "Delivered", url: "/delivered", icon: CheckCircle },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Products", url: "/products", icon: Package },
];

const sheetItems = [
  { title: "Sync Sheet", url: null, icon: FileSpreadsheet, action: "sync" },
];

const trackItems = [
  { title: "Track Us", url: "/track", icon: MapPin },
];

const memoryItems = [
  { title: "Notes", url: "/notes", icon: StickyNote },
];

export function AppSidebar() {
  const [syncing, setSyncing] = useState(false);

  const handleLogout = () => {
    api.logout();
    wsClient.disconnect();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    window.location.href = '/login';
  };

  const handleSyncToSheet = async () => {
    try {
      setSyncing(true);
      const result = await api.syncToSheet();
      
      if (result.synced) {
        toast({
          title: "Sync Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "No Orders",
          description: result.message,
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-foreground">DSK Admin</h1>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url!} 
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Track</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trackItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url!} 
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Memory</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {memoryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url!} 
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sheet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sheetItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={handleSyncToSheet}
                      disabled={syncing}
                      className="w-full flex items-center gap-2 hover:bg-sidebar-accent"
                    >
                      <item.icon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Syncing...' : item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 hover:bg-sidebar-accent text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="text-xs text-muted-foreground text-center mt-2">DSK Admin v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}

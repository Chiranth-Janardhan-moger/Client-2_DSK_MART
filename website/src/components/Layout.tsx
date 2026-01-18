import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Menu } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - simplified on mobile */}
          <header className="h-14 md:h-16 border-b bg-card flex items-center px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="hidden md:block p-2 -ml-2">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h2 className="text-lg md:text-xl font-semibold md:ml-0 truncate">DSK Admin</h2>
          </header>

          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}

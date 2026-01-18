import { useLocation, useNavigate } from "react-router-dom";
import { Home, CheckCircle, MapPin, StickyNote, Settings } from "lucide-react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Delivered", url: "/delivered", icon: CheckCircle },
  { title: "Track", url: "/track", icon: MapPin },
  { title: "Notes", url: "/notes", icon: StickyNote },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className={`text-xs font-medium ${active ? "text-primary" : ""}`}>
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

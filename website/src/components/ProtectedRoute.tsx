import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = api.getToken();
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Verify token with backend
      const userData = await api.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      
      // Connect WebSocket for real-time updates
      wsClient.connect(userData.id || userData._id);
      
      // Listen for force logout
      wsClient.on('FORCE_LOGOUT', () => {
        api.logout();
        wsClient.disconnect();
        setIsAuthenticated(false);
        setUser(null);
      });
      
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token might be expired or invalid
      api.logout();
      setIsAuthenticated(false);
    }
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin (only admins can access website)
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            Only administrators can access this dashboard.
          </p>
          <button 
            onClick={() => {
              api.logout();
              wsClient.disconnect();
              window.location.href = '/login';
            }}
            className="text-primary underline"
          >
            Login with different account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
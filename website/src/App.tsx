import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AddOrder from "./pages/AddOrder";
import OrdersList from "./pages/OrdersList";
import OrderHistory from "./pages/OrderHistory";
import ManageUsers from "./pages/ManageUsers";
import Settings from "./pages/Settings";
import Track from "./pages/Track";
import Customers from "./pages/Customers";
import Notes from "./pages/Notes";
import Addresses from "./pages/Addresses";
import Products from "./pages/Products";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/add-order" element={
            <ProtectedRoute>
              <Layout><AddOrder /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <Layout><OrdersList /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/delivered" element={
            <ProtectedRoute>
              <Layout><OrderHistory /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <Layout><Customers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings/users" element={
            <ProtectedRoute>
              <Layout><ManageUsers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/track" element={
            <ProtectedRoute>
              <Layout><Track /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/notes" element={
            <ProtectedRoute>
              <Layout><Notes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/addresses" element={
            <ProtectedRoute>
              <Layout><Addresses /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute>
              <Layout><Products /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
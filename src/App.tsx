import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MedicineListing from "@/pages/MedicineListing";
import PlaceOrder from "@/pages/PlaceOrder";
import TriggerDemo from "@/pages/TriggerDemo";
import ConcurrencyDemo from "@/pages/ConcurrencyDemo";
import AdminPage from "@/pages/AdminPage";
import NotFound from "./pages/NotFound";

import { CartProvider } from "@/contexts/CartContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<MedicineListing />} />
              <Route path="/order" element={<PlaceOrder />} />
              <Route path="/trigger" element={<TriggerDemo />} />
              <Route path="/concurrency" element={<ConcurrencyDemo />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

// ── Backend warmup: wake Render from cold sleep immediately ──
// Fire-and-forget — runs once when the JS module loads, well before
// the user navigates to any authenticated page.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
if (BACKEND_URL) {
  fetch(`${BACKEND_URL}/api/public/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
}

// Eagerly load only the landing page (critical path)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load auth pages — not needed on initial landing page render
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));

// Lazy load heavier pages for faster initial load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Project = lazy(() => import("./pages/Project"));
const BlogPreview = lazy(() => import("./pages/BlogPreview"));
const PublicBlog = lazy(() => import("./pages/PublicBlog"));
const FeedbackBuilder = lazy(() => import("./pages/FeedbackBuilder"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Landing page sub-pages
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const SpotlightInfoPage = lazy(() => import("./pages/SpotlightInfoPage"));
const SimulationPage = lazy(() => import("./pages/SimulationPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PitchFeed = lazy(() => import("./pages/PitchFeed"));
const Space = lazy(() => import("./pages/Space"));
const InnovationEcosystem = lazy(() => import("./pages/InnovationEcosystem"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — prevent refetch on remount
      gcTime: 10 * 60 * 1000,          // 10 minutes — keep data in cache
      refetchOnWindowFocus: false,      // Don't refetch just because tab regained focus
      retry: 2,                         // Retry failed requests twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/innovation-ecosystem" element={<InnovationEcosystem />} />
              <Route path="/battle-of-innovation" element={<InnovationEcosystem />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/spotlight-info" element={<SpotlightInfoPage />} />
              <Route path="/simulation" element={<SimulationPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/project/:id" element={<Project />} />
              <Route path="/project/:id/preview" element={<BlogPreview />} />
              <Route path="/project/:id/feedback" element={<FeedbackBuilder />} />
              <Route path="/project/:id/chatbot" element={<Chatbot />} />
              <Route path="/p/:slugWithId" element={<PublicBlog />} />
              <Route path="/pitches" element={<PitchFeed />} />
              <Route path="/space" element={<Space />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
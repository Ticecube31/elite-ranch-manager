import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/lib/ThemeContext';
import Home from '@/pages/Home';
import CalvingSeason from '@/pages/CalvingSeason.jsx';
import CalfSortingDashboard from '@/pages/CalfSortingDashboard';
import PreSessionSetup from '@/pages/PreSessionSetup';
import FastSortingInputScreen from '@/pages/FastSortingInputScreen';
import PastureManagement from '@/pages/PastureManagement';
import Settings from '@/pages/Settings';
import AIAssistant from '@/pages/AIAssistant';
import PregChecking from '@/pages/PregChecking';
import HerdManagement from '@/pages/HerdManagement';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-lg">ER</span>
          </div>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calving" element={<CalvingSeason />} />
        <Route path="/sorting" element={<CalfSortingDashboard />} />
        <Route path="/sorting/setup" element={<PreSessionSetup />} />
        <Route path="/sorting/:sessionId" element={<FastSortingInputScreen />} />
        <Route path="/pastures" element={<PastureManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/preg-checking" element={<PregChecking />} />
        <Route path="/herd" element={<HerdManagement />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ThemeProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </ThemeProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Route wrapper with Framer Motion slide transitions
function RouteTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
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
import HerdFamilyTree from '@/pages/HerdFamilyTree';
import CalvingSeasonSpreadsheet from '@/components/herd/CalvingSeasonSpreadsheet';
import SortedAnimalsTable from '@/pages/SortedAnimalsTable';

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
        <Route path="/" element={<RouteTransition><Home /></RouteTransition>} />
        <Route path="/calving/*" element={<RouteTransition><CalvingSeason /></RouteTransition>} />
        <Route path="/sorting" element={<RouteTransition><CalfSortingDashboard /></RouteTransition>} />
        <Route path="/sorting/setup" element={<RouteTransition><PreSessionSetup /></RouteTransition>} />
        <Route path="/sorting/:sessionId" element={<RouteTransition><FastSortingInputScreen /></RouteTransition>} />
        <Route path="/sorting/:sessionId/log" element={<RouteTransition><SortedAnimalsTable /></RouteTransition>} />
        <Route path="/pastures" element={<RouteTransition><PastureManagement /></RouteTransition>} />
        <Route path="/settings" element={<RouteTransition><Settings /></RouteTransition>} />
        <Route path="/ai-assistant" element={<RouteTransition><AIAssistant /></RouteTransition>} />
        <Route path="/preg-checking" element={<RouteTransition><PregChecking /></RouteTransition>} />
        <Route path="/herd/*" element={<RouteTransition><HerdManagement /></RouteTransition>} />
        <Route path="/family-tree" element={<RouteTransition><HerdFamilyTree /></RouteTransition>} />
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
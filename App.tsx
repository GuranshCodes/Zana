
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import { UserRole, UserSession, PlanType } from './types';

// Protected Route Component
interface ProtectedRouteProps {
  session: UserSession | null;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session, children }) => {
  const location = useLocation();
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('zana_session');
    if (saved) {
      setSession(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('zana_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('zana_session');
  };

  const handleUpdateSession = (updatedSession: UserSession) => {
    setSession(updatedSession);
    localStorage.setItem('zana_session', JSON.stringify(updatedSession));
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Navbar session={session} onLogout={handleLogout} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth onLogin={handleLogin} />} />
            <Route 
              path="/analyze" 
              element={
                <ProtectedRoute session={session}>
                  <Analyze />
                </ProtectedRoute>
              } 
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute session={session}>
                  <Settings session={session} onUpdate={handleUpdateSession} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute session={session}>
                  <div className="p-12 text-center max-w-xl mx-auto space-y-4">
                    <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Welcome, <span className="text-indigo-600">{session?.displayName || session?.email}</span></h2>
                    <p className="text-slate-600 font-medium">Your forensics history is being compiled.</p>
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-800 text-sm font-bold uppercase tracking-widest">
                      Session Plan: {session?.plan}
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;

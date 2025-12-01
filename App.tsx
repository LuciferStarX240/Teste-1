import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { User, Role, AppSettings } from './types';
import { AuthAPI, DataAPI } from './services/dataService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { MENU_ITEMS } from './constants';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Sales from './views/Sales';
import Services from './views/Services';
import Team from './views/Team';
import Settings from './views/Settings';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  settings: AppSettings | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// --- Layout Components ---
const Sidebar = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const location = useLocation();
  const { settings } = useAuth();

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col fixed left-0 top-0 hidden md:flex">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center">
        <img 
          src={settings?.logoUrl || "https://picsum.photos/200/200"} 
          alt="Logo" 
          className="w-16 h-16 rounded-full mb-3 object-cover border-2 border-primary" 
        />
        <h1 className="text-xl font-bold text-primary tracking-wider">{settings?.companyName}</h1>
        <p className="text-xs text-slate-500 uppercase mt-1">{user.role}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {MENU_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
              location.pathname === item.path
                ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-4">
          <img src={user.avatarUrl} className="w-8 h-8 rounded-full bg-slate-700" alt="avatar" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.username}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 py-2 rounded transition-colors"
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};

const MobileHeader = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-40">
             <div className="font-bold text-primary">MechanicERP</div>
             <button onClick={() => setOpen(!open)} className="text-slate-200">
                <i className="fas fa-bars text-xl"></i>
             </button>
             {open && (
                 <div className="absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 shadow-xl flex flex-col p-4 animate-fade-in">
                     {MENU_ITEMS.filter(item => item.roles.includes(user.role)).map(item => (
                         <Link key={item.path} to={item.path} className="py-3 text-slate-300 border-b border-slate-800 last:border-0" onClick={() => setOpen(false)}>
                             <i className={`fas ${item.icon} w-6`}></i> {item.label}
                         </Link>
                     ))}
                     <button onClick={onLogout} className="mt-4 text-red-400 text-left py-2">Sair</button>
                 </div>
             )}
        </div>
    )
}

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-dark text-primary"><i className="fas fa-circle-notch fa-spin text-4xl"></i></div>;
  if (!user) return <Navigate to="/login" />;
  
  return (
    <div className="min-h-screen bg-dark text-slate-200 flex flex-col md:flex-row">
        <Sidebar user={user} onLogout={logout} />
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
             <MobileHeader user={user} onLogout={logout} />
            <main className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
                {children}
            </main>
        </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
        try {
            const s = await DataAPI.getSettings();
            setSettings(s);
        } catch (e) {
            console.warn("Failed to load settings (Firebase might not be configured)", e);
        }
    };
    loadSettings();
  }, []);

  // Listen to Firebase Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Auth exists, fetch profile data
        const profile = await AuthAPI.getCurrentProfile(currentUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const u = await AuthAPI.login(email, password);
      setUser(u);
    } catch (e) {
      setIsLoading(false); // Stop loading on error
      throw e;
    }
  };

  const logout = async () => {
    await AuthAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, settings }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
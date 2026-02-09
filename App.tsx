
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Wallets from './components/Wallets';
import DebtsLoans from './components/DebtsLoans';
import Login from './components/Login';
import { Account } from './types';
import { supabase } from './lib/supabase';

interface AppContextType {
  currentAccount: Account | null;
  user: any | null;
  refreshData: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const Navigation = () => {
  const location = useLocation();
  const { logout } = useApp();

  const navItems = [
    { path: '/', label: 'ড্যাশবোর্ড', icon: '📊' },
    { path: '/transactions', label: 'লেনদেন', icon: '💸' },
    { path: '/wallets', label: 'ওয়ালেট', icon: '🏦' },
    { path: '/debts-loans', label: 'ধার ও লোন', icon: '🤝' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 glass border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:scale-110 transition duration-300 shadow-lg shadow-blue-200">
                <span className="text-xl">🪙</span>
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">হিসাব<span className="text-blue-600">রক্ষক</span></span>
            </Link>
            
            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl backdrop-blur-md">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-white text-blue-600 shadow-sm scale-105'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button 
              onClick={logout}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              লগআউট ➔
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="glass bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2rem] p-2 flex justify-between items-center px-6">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 transition-all duration-300 relative ${
                  isActive ? '-translate-y-2' : ''
                }`}
              >
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-xl transition-all duration-300 ${
                   isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'
                }`}>
                  {item.icon}
                </div>
                {isActive && <span className="absolute -bottom-4 text-[10px] font-bold text-blue-600 animate-in fade-in slide-in-from-bottom-1">{item.label}</span>}
              </Link>
            );
          })}
          <button onClick={logout} className="p-2 text-slate-300 hover:text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) setupUserAccount(session.user);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setupUserAccount(session.user);
      else {
        setCurrentAccount(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const seedCategories = async (accountId: string, userId: string) => {
    try {
      const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('account_id', accountId);
      if (count === 0) {
        const defaultCategories = [
          { name: 'বেতন', type: 'income', icon: '💰' },
          { name: 'ভাড়া', type: 'income', icon: '🏠' },
          { name: 'কোচিং', type: 'income', icon: '👨‍🏫' },
          { name: 'টিউশন', type: 'income', icon: '📖' },
          { name: 'সার্ভিস', type: 'income', icon: '🛠️' },
          { name: 'ফ্রিল্যান্সিং', type: 'income', icon: '💻' },
          { name: 'ব্যবসা', type: 'income', icon: '🏢' },
          { name: 'অন্যান্য', type: 'income', icon: '🪙' },
          { name: 'খাদ্য ও মুদি', type: 'expense', icon: '🍲' },
          { name: 'যাতায়াত', type: 'expense', icon: '🚌' },
          { name: 'স্বাস্থ্য', type: 'expense', icon: '🏥' },
          { name: 'ইউটিলিটি বিল', type: 'expense', icon: '⚡' },
          { name: 'ব্যক্তিগত', type: 'expense', icon: '👕' },
          { name: 'শপিং', type: 'expense', icon: '🛍️' },
          { name: 'শিক্ষা', type: 'expense', icon: '📚' },
          { name: 'বিনোদন', type: 'expense', icon: '🎉' }
        ];
        const seedData = defaultCategories.map(cat => ({ ...cat, account_id: accountId, user_id: userId }));
        await supabase.from('categories').insert(seedData);
      }
    } catch (err) { console.error(err); }
  };

  const setupUserAccount = async (user: any) => {
    try {
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user.id);
      let activeAccount = null;
      if (!accounts || accounts.length === 0) {
        const { data: newAccount } = await supabase.from('accounts').insert([{ user_id: user.id, name: 'আমার হিসাব' }]).select().single();
        activeAccount = newAccount;
      } else {
        activeAccount = accounts[0];
      }
      setCurrentAccount(activeAccount);
      if (activeAccount) await seedCategories(activeAccount.id, user.id);
    } catch (err) { console.error(err); } 
    finally { setAuthLoading(false); }
  };

  const logout = async () => { await supabase.auth.signOut(); };
  const refreshData = () => { console.log("Refreshing..."); };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl">🪙</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={(user) => setUser(user)} />;

  return (
    <AppContext.Provider value={{ currentAccount, user, refreshData, logout }}>
      <HashRouter>
        <div className="min-h-screen pb-32 md:pb-10">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/debts-loans" element={<DebtsLoans />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;

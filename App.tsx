
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
    <nav className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600 flex items-center space-x-2">
              <span className="text-2xl">🪙</span>
              <span className="hidden sm:inline">হিসাব রক্ষক</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
             <button 
               onClick={logout}
               className="text-xs font-bold text-slate-400 hover:text-rose-500 transition"
             >
               লগআউট
             </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-50 shadow-lg">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-lg ${
              location.pathname === item.path ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setupUserAccount(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    // Handle auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setupUserAccount(session.user);
      } else {
        setCurrentAccount(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const seedCategories = async (accountId: string, userId: string) => {
    try {
      const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

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

        const seedData = defaultCategories.map(cat => ({
          ...cat,
          account_id: accountId,
          user_id: userId
        }));

        await supabase.from('categories').insert(seedData);
      }
    } catch (err) {
      console.error("Error seeding categories:", err);
    }
  };

  const setupUserAccount = async (user: any) => {
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      let activeAccount = null;

      if (!accounts || accounts.length === 0) {
        const { data: newAccount, error: createError } = await supabase
          .from('accounts')
          .insert([{ user_id: user.id, name: 'আমার হিসাব' }])
          .select()
          .single();
        
        if (createError) throw createError;
        activeAccount = newAccount;
      } else {
        activeAccount = accounts[0];
      }
      
      setCurrentAccount(activeAccount);
      
      if (activeAccount) {
        await seedCategories(activeAccount.id, user.id);
      }

    } catch (err) {
      console.error("Account setup error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshData = () => {
    console.log("Refreshing data...");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(user) => setUser(user)} />;
  }

  return (
    <AppContext.Provider value={{ currentAccount, user, refreshData, logout }}>
      <HashRouter>
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

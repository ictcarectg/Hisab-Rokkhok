
import React, { useState, useEffect } from 'react';
import { Wallet, WalletType } from '../types';
import { useApp } from '../App';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const Wallets: React.FC = () => {
  const { currentAccount } = useApp();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form States
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WalletType>('cash');
  const [newBalance, setNewBalance] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      fetchWallets();
    }
  }, [currentAccount]);

  const fetchWallets = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('account_id', currentAccount?.id);
      
      if (error) throw error;
      setWallets(data || []);
    } catch (err) {
      console.error("Error fetching wallets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    setIsSaving(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('wallets')
          .insert([{
            account_id: currentAccount.id,
            user_id: currentAccount.user_id,
            provider_name: newName,
            type: newType,
            balance: parseFloat(newBalance) || 0
          }])
          .select();

        if (error) throw error;
        if (data) setWallets(prev => [...prev, data[0]]);
      } else {
        // Local state fallback for UI testing
        const demoWallet = {
          id: crypto.randomUUID(),
          account_id: currentAccount.id,
          user_id: currentAccount.user_id,
          provider_name: newName,
          type: newType,
          balance: parseFloat(newBalance) || 0,
          created_at: new Date().toISOString()
        };
        setWallets(prev => [...prev, demoWallet as Wallet]);
      }

      setNewName('');
      setNewType('cash');
      setNewBalance('0');
      setShowModal(false);
    } catch (err: any) {
      alert("ওয়ালেট সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">ওয়ালেট ম্যানেজমেন্ট</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          + নতুন ওয়ালেট
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">লোড হচ্ছে...</div>
      ) : wallets.length === 0 ? (
        <div className="bg-white p-20 rounded-2xl border border-dashed border-slate-200 text-center">
          <div className="text-4xl mb-4">🏦</div>
          <p className="text-slate-400">কোন ওয়ালেট যুক্ত করা নেই।</p>
          <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 font-bold hover:underline">প্রথম ওয়ালেট যোগ করুন</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wallets.map(wallet => (
            <div key={wallet.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl transform group-hover:scale-110 transition duration-300">
                {wallet.type === 'cash' ? '💵' : wallet.type === 'bank' ? '🏦' : '📱'}
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                  {wallet.type === 'cash' ? 'নগদ ক্যাশ' : wallet.type === 'bank' ? 'ব্যাংক একাউন্ট' : 'মোবাইল ফিন্যান্স'}
              </p>
              <h3 className="text-xl font-bold text-slate-800">{wallet.provider_name}</h3>
              <div className="mt-8">
                <p className="text-slate-400 text-[10px] font-bold uppercase">বর্তমান ব্যালেন্স</p>
                <h2 className="text-3xl font-black text-blue-600 mt-1">৳{wallet.balance.toLocaleString('bn-BD')}</h2>
              </div>
            </div>
          ))}
        </div>
      )}

      {wallets.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
              <div>
                <h2 className="text-2xl font-bold mb-1">মোট তারল্য</h2>
                <p className="opacity-60 text-sm">সম্মিলিত ব্যালেন্স</p>
              </div>
              <div className="mt-4 md:mt-0">
                 <span className="text-4xl md:text-5xl font-black text-emerald-400">৳{totalBalance.toLocaleString('bn-BD')}</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">নতুন ওয়ালেট</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddWallet} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ওয়ালেটের নাম</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="যেমন: বিকাশ" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ধরণ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'bank', 'mobile_banking'] as WalletType[]).map((type) => (
                    <button key={type} type="button" onClick={() => setNewType(type)} className={`py-2 rounded-xl text-xs font-bold border ${newType === type ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                      {type === 'cash' ? 'ক্যাশ' : type === 'bank' ? 'ব্যাংক' : 'মোবাইল'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ব্যালেন্স</label>
                <input type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <button type="submit" disabled={isSaving || !newName} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">
                {isSaving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;

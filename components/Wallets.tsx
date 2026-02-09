
import React, { useState, useEffect } from 'react';
import { Wallet, WalletType } from '../types';
import { useApp } from '../App';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const Wallets: React.FC = () => {
  const { currentAccount } = useApp();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WalletType>('cash');
  const [newBalance, setNewBalance] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (currentAccount) fetchWallets(); }, [currentAccount]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      setWallets(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('wallets').insert([{
        account_id: currentAccount.id, user_id: currentAccount.user_id, provider_name: newName, type: newType, balance: parseFloat(newBalance) || 0
      }]).select();
      if (error) throw error;
      if (data) setWallets(prev => [...prev, data[0]]);
      setNewName(''); setNewType('cash'); setNewBalance('0'); setShowModal(false);
    } catch (err: any) { alert("Error: " + err.message); } finally { setIsSaving(false); }
  };

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const getGradient = (type: string, index: number) => {
    if (type === 'cash') return 'bg-gradient-to-br from-emerald-500 to-teal-700';
    if (type === 'mobile_banking') return 'bg-gradient-to-br from-rose-500 to-pink-700';
    const bankGradients = [
        'bg-gradient-to-br from-blue-600 to-indigo-800',
        'bg-gradient-to-br from-violet-600 to-purple-800',
        'bg-gradient-to-br from-cyan-600 to-blue-800'
    ];
    return bankGradients[index % bankGradients.length];
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-slate-800">ওয়ালেট</h1>
            <p className="text-slate-500 text-sm font-bold mt-1">আপনার সব একাউন্ট ম্যানেজ করুন</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-200 active:scale-95">
          + নতুন যোগ করুন
        </button>
      </div>

      {/* Total Balance Card */}
      {wallets.length > 0 && (
         <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-300 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10 text-center md:text-left">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">সর্বমোট স্থিতি</p>
                <h2 className="text-5xl font-black tracking-tight text-white">৳{totalBalance.toLocaleString('bn-BD')}</h2>
            </div>
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/30 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 mt-6 md:mt-0 flex gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                    <span className="text-2xl mb-1 block">🏦</span>
                    <span className="text-xs font-bold text-slate-300">{wallets.filter(w=>w.type==='bank').length} ব্যাংক</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                    <span className="text-2xl mb-1 block">📱</span>
                    <span className="text-xs font-bold text-slate-300">{wallets.filter(w=>w.type==='mobile_banking').length} মোবাইল</span>
                </div>
            </div>
         </div>
      )}

      {loading ? (
        <div className="text-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <div className="text-6xl mb-6 opacity-50">💳</div>
          <p className="text-slate-400 font-bold text-lg">কোন ওয়ালেট নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet, idx) => (
            <div key={wallet.id} className={`${getGradient(wallet.type, idx)} p-8 rounded-[2rem] shadow-lg text-white relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300`}>
              {/* Decorative Circles */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between h-48">
                 <div className="flex justify-between items-start">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                        <span className="text-2xl">{wallet.type === 'cash' ? '💵' : wallet.type === 'bank' ? '🏦' : '📱'}</span>
                    </div>
                    <span className="bg-black/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                        {wallet.type === 'cash' ? 'CASH' : wallet.type === 'bank' ? 'BANK' : 'MOBILE'}
                    </span>
                 </div>
                 
                 <div>
                    <h3 className="text-xl font-bold opacity-90 mb-1">{wallet.provider_name}</h3>
                    <p className="text-white/60 text-xs font-mono tracking-widest">**** **** **** {wallet.id.slice(0,4)}</p>
                 </div>

                 <div>
                    <p className="text-xs text-blue-100 font-bold uppercase opacity-80 mb-1">ব্যালেন্স</p>
                    <h2 className="text-3xl font-black tracking-wide">৳{wallet.balance.toLocaleString('bn-BD')}</h2>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">নতুন ওয়ালেট</h2>
              <button onClick={() => setShowModal(false)} className="bg-slate-100 w-10 h-10 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition">✕</button>
            </div>
            <form onSubmit={handleAddWallet} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">নাম</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition" placeholder="উদাঃ বিকাশ" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ধরণ</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['cash', 'bank', 'mobile_banking'] as WalletType[]).map((type) => (
                    <button key={type} type="button" onClick={() => setNewType(type)} className={`py-3 rounded-2xl text-xs font-black uppercase transition-all duration-200 ${newType === type ? 'bg-slate-800 text-white shadow-lg shadow-slate-300 scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                      {type === 'mobile_banking' ? 'মোবাইল' : type === 'bank' ? 'ব্যাংক' : 'ক্যাশ'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">প্রাথমিক ব্যালেন্স</label>
                <input type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition" />
              </div>
              <button type="submit" disabled={isSaving || !newName} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                {isSaving ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;

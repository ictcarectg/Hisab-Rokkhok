
import React, { useState, useEffect } from 'react';
import { Transaction, Wallet, Category, TransactionType } from '../types';
import { useApp } from '../App';
import { supabase } from '../lib/supabase';

const Transactions: React.FC = () => {
  const { currentAccount } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentAccount) fetchInitialData();
  }, [currentAccount]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: wData } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      if (wData) setWallets(wData);
      const { data: cData } = await supabase.from('categories').select('*').eq('account_id', currentAccount?.id);
      if (cData) setCategories(cData);
      await fetchTransactions();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*, wallet:wallets(*), category:categories(*)')
      .eq('account_id', currentAccount?.id).is('deleted_at', null).order('transaction_date', { ascending: false });
    setTransactions(data || []);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !walletId || !categoryId) return;
    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount);
      const selectedWallet = wallets.find(w => w.id === walletId);
      if (!selectedWallet) return;

      if (editingTransaction) {
         // Logic to reverse old transaction and apply new one (simplified for UI focus, ensure logic consistency)
         const oldWallet = wallets.find(w => w.id === editingTransaction.wallet_id);
         if(oldWallet) {
             const rev = editingTransaction.type === 'expense' ? editingTransaction.amount : -editingTransaction.amount;
             await supabase.from('wallets').update({ balance: oldWallet.balance + rev }).eq('id', oldWallet.id);
         }
         await supabase.from('transactions').update({ wallet_id: walletId, category_id: categoryId, amount: numAmount, type, note, transaction_date: date }).eq('id', editingTransaction.id);
         const { data: tw } = await supabase.from('wallets').select('balance').eq('id', walletId).single();
         if(tw) {
             const adj = type === 'income' ? numAmount : -numAmount;
             await supabase.from('wallets').update({ balance: tw.balance + adj }).eq('id', walletId);
         }
      } else {
        await supabase.from('transactions').insert([{ account_id: currentAccount?.id, user_id: currentAccount?.user_id, wallet_id: walletId, category_id: categoryId, amount: numAmount, type, note, transaction_date: date }]);
        const newBalance = type === 'income' ? selectedWallet.balance + numAmount : selectedWallet.balance - numAmount;
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId);
      }
      setShowModal(false); resetForm(); fetchTransactions();
      const { data: rw } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      if (rw) setWallets(rw);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const resetForm = () => { setEditingTransaction(null); setAmount(''); setNote(''); setCategoryId(''); setWalletId(''); setType('expense'); setDate(new Date().toISOString().split('T')[0]); };
  
  const handleEdit = (tx: Transaction) => {
      setEditingTransaction(tx); setAmount(tx.amount.toString()); setWalletId(tx.wallet_id); setCategoryId(tx.category_id); setType(tx.type); setNote(tx.note || ''); setDate(tx.transaction_date); setShowModal(true);
  }

  const handleDelete = async (tx: Transaction) => {
      if(!confirm("Sure?")) return;
      await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', tx.id);
      const w = wallets.find(w=>w.id === tx.wallet_id);
      if(w) {
          const adj = tx.type === 'expense' ? tx.amount : -tx.amount;
          await supabase.from('wallets').update({ balance: w.balance + adj }).eq('id', w.id);
      }
      fetchTransactions();
      const { data: rw } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      if (rw) setWallets(rw);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-slate-800">লেনদেন</h1>
           <p className="text-slate-500 font-bold text-sm mt-1">সব আয়ের ও ব্যয়ের তালিকা</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition flex items-center gap-2">
          <span>+</span> <span className="hidden sm:inline">নতুন লেনদেন</span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? <div className="text-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div> : 
         transactions.length === 0 ? <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 text-center text-slate-400 font-bold text-lg">কোন লেনদেন নেই</div> :
         transactions.map(tx => (
          <div key={tx.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:border-blue-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {tx.category?.icon || '📦'}
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-lg mb-1">{tx.category?.name || 'অজানা'}</h4>
                <div className="flex items-center gap-2">
                     <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-wider">{new Date(tx.transaction_date).toLocaleDateString('bn-BD')}</span>
                     <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-wider">{tx.wallet?.provider_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8">
               <div className="text-right">
                    <p className={`text-2xl font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'} ৳{tx.amount.toLocaleString('bn-BD')}
                    </p>
                    {tx.note && <p className="text-xs text-slate-400 font-medium italic mt-1 max-w-[150px] truncate ml-auto">{tx.note}</p>}
               </div>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEdit(tx)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center">✎</button>
                   <button onClick={() => handleDelete(tx)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center">✕</button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-slate-800">{editingTransaction ? 'লেনদেন আপডেট' : 'নতুন লেনদেন'}</h2>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-100 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition">✕</button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="space-y-8">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm scale-100' : 'text-slate-500 scale-95'}`}>ব্যয়</button>
                <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm scale-100' : 'text-slate-500 scale-95'}`}>আয়</button>
              </div>

              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">পরিমাণ</label>
                 <div className="relative">
                     <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-black text-slate-300">৳</span>
                     <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-12 pr-6 text-3xl font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition" placeholder="0" required />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">তারিখ</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition" required />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ওয়ালেট</label>
                  <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition appearance-none" required>
                    <option value="">সিলেক্ট করুন...</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.provider_name} (৳{w.balance})</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ক্যাটাগরি</label>
                <div className="grid grid-cols-4 gap-2">
                    {categories.filter(c => c.type === type).map(cat => (
                        <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${categoryId === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                            <span className="text-2xl mb-1">{cat.icon}</span>
                            <span className="text-[10px] font-bold truncate w-full text-center">{cat.name}</span>
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">নোট</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition" rows={2} placeholder="বিস্তারিত..."></textarea>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-6 bg-blue-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                {isSaving ? 'সেভ হচ্ছে...' : 'সম্পন্ন করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

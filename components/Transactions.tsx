
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

  // Transaction Form States
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentAccount) {
      fetchInitialData();
    }
  }, [currentAccount]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wallets
      const { data: wData } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      if (wData) setWallets(wData);

      // 2. Fetch or Seed Categories
      const { data: cData } = await supabase.from('categories').select('*').eq('account_id', currentAccount?.id);
      
      const defaultCategories = [
        // আয়ের ক্যাটাগরি (User requested)
        { name: 'বেতন', type: 'income', icon: '💰' },
        { name: 'ভাড়া', type: 'income', icon: '🏠' },
        { name: 'কোচিং', type: 'income', icon: '👨‍🏫' },
        { name: 'টিউশন', type: 'income', icon: '📖' },
        { name: 'সার্ভিস', type: 'income', icon: '🛠️' },
        { name: 'ফ্রিল্যান্সিং', type: 'income', icon: '💻' },
        { name: 'ব্যবসা', type: 'income', icon: '🏢' },
        { name: 'অন্যান্য', type: 'income', icon: '🪙' },
        
        // ব্যয়ের ক্যাটাগরি
        { name: 'খাদ্য ও মুদি', type: 'expense', icon: '🍲' },
        { name: 'যাতায়াত', type: 'expense', icon: '🚌' },
        { name: 'স্বাস্থ্য', type: 'expense', icon: '🏥' },
        { name: 'ইউটিলিটি বিল', type: 'expense', icon: '⚡' },
        { name: 'ব্যক্তিগত', type: 'expense', icon: '👕' }
      ];

      if (!cData || cData.length === 0) {
        const seedData = defaultCategories.map(cat => ({
          ...cat,
          account_id: currentAccount?.id,
          user_id: currentAccount?.user_id
        }));
        const { data: newCats } = await supabase.from('categories').insert(seedData).select();
        if (newCats) setCategories(newCats);
      } else {
        setCategories(cData);
      }

      await fetchTransactions();
    } catch (err) {
      console.error("Initialization failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .eq('account_id', currentAccount?.id)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false });

    if (data) setTransactions(data);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setAmount('');
    setNote('');
    setWalletId('');
    setCategoryId('');
    setType('expense');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setAmount(tx.amount.toString());
    setNote(tx.note || '');
    setWalletId(tx.wallet_id);
    setCategoryId(tx.category_id);
    setType(tx.type);
    setDate(tx.transaction_date);
    setShowModal(true);
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি ডিলিট করতে চান? ওয়ালেট ব্যালেন্স অটোমেটিক অ্যাডজাস্ট হবে।')) return;

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tx.id);

      if (deleteError) throw deleteError;

      const wallet = wallets.find(w => w.id === tx.wallet_id);
      if (wallet) {
        const adjustment = tx.type === 'expense' ? tx.amount : -tx.amount;
        const newBalance = wallet.balance + adjustment;
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', tx.wallet_id);
        setWallets(prev => prev.map(w => w.id === tx.wallet_id ? { ...w, balance: newBalance } : w));
      }

      fetchTransactions();
    } catch (err: any) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !amount || !walletId || !categoryId) {
      alert("সবগুলো তথ্য সঠিকভাবে পূরণ করুন");
      return;
    }

    setIsSaving(true);
    const numAmount = parseFloat(amount);
    const selectedWallet = wallets.find(w => w.id === walletId);
    if (!selectedWallet) return;

    try {
      if (editingTransaction) {
        // Reverse old impact
        const oldWallet = wallets.find(w => w.id === editingTransaction.wallet_id);
        if (oldWallet) {
          const reverseAmount = editingTransaction.type === 'expense' ? editingTransaction.amount : -editingTransaction.amount;
          await supabase.from('wallets').update({ balance: oldWallet.balance + reverseAmount }).eq('id', oldWallet.id);
        }

        // Update TX
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            wallet_id: walletId,
            category_id: categoryId,
            amount: numAmount,
            type: type,
            note: note,
            transaction_date: date
          })
          .eq('id', editingTransaction.id);
        if (updateError) throw updateError;

        // Apply new impact
        const { data: targetWallet } = await supabase.from('wallets').select('balance').eq('id', walletId).single();
        if (targetWallet) {
          const newAdjustment = type === 'income' ? numAmount : -numAmount;
          await supabase.from('wallets').update({ balance: targetWallet.balance + newAdjustment }).eq('id', walletId);
        }
      } else {
        // Create New
        const { error: txError } = await supabase.from('transactions').insert([{
          account_id: currentAccount.id,
          user_id: currentAccount.user_id,
          wallet_id: walletId,
          category_id: categoryId,
          amount: numAmount,
          type: type,
          note: note,
          transaction_date: date
        }]);
        if (txError) throw txError;

        const newBalance = type === 'income' ? selectedWallet.balance + numAmount : selectedWallet.balance - numAmount;
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId);
      }

      setShowModal(false);
      resetForm();
      fetchTransactions();
      const { data: refreshedWallets } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      if (refreshedWallets) setWallets(refreshedWallets);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">লেনদেন সমূহ</h1>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <span>+ নতুন লেনদেন</span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
             <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-slate-400 font-medium">এখনো কোন লেনদেন করা হয়নি</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {transactions.map(tx => (
              <div key={tx.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.category?.icon || '📦'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{tx.category?.name || 'অজানা'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(tx.transaction_date).toLocaleDateString('bn-BD')} • {tx.wallet?.provider_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'} ৳{tx.amount.toLocaleString('bn-BD')}
                    </p>
                    {tx.note && <p className="text-[10px] text-slate-400 italic max-w-[150px] truncate mt-0.5">{tx.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(tx)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition">✏️</button>
                    <button onClick={() => handleDeleteTransaction(tx)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">{editingTransaction ? 'লেনদেন আপডেট' : 'নতুন লেনদেন'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="space-y-6">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>ব্যয়</button>
                <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>আয়</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">পরিমাণ (৳)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-xl" placeholder="০.০০" required />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">তারিখ</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ওয়ালেট</label>
                <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white font-medium" required>
                  <option value="">সিলেক্ট করুন...</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.provider_name} (৳{w.balance.toLocaleString('bn-BD')})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ক্যাটাগরি</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white font-medium" required>
                  <option value="">সিলেক্ট করুন...</option>
                  {categories.filter(c => c.type === type).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">নোট (ঐচ্ছিক)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium" placeholder="লেনদেন সম্পর্কে লিখুন..." rows={2}></textarea>
              </div>

              <button type="submit" disabled={isSaving || wallets.length === 0} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                {isSaving ? 'প্রসেসিং হচ্ছে...' : (editingTransaction ? 'পরিবর্তন সেভ করুন' : 'লেনদেন সম্পন্ন করুন')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

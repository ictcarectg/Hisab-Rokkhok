
import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { Wallet, TransactionType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type EntryType = 'debt' | 'receivable';

interface Entry {
  id: string;
  person_name: string;
  amount: number;
  status: 'pending' | 'partial' | 'paid' | 'uncollectible';
  created_at: string;
  account_id: string;
  user_id: string;
}

const DebtsLoans: React.FC = () => {
  const { currentAccount } = useApp();
  const [loading, setLoading] = useState(false);
  
  // Lists
  const [debts, setDebts] = useState<Entry[]>([]);
  const [receivables, setReceivables] = useState<Entry[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState<EntryType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<{ entry: Entry, type: EntryType } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Add Form States
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  // Payment Form States
  const [payAmount, setPayAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');

  useEffect(() => {
    if (currentAccount) {
      fetchData();
      fetchWallets();
    }
  }, [currentAccount]);

  const fetchWallets = async () => {
    const { data } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
    if (data) setWallets(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: dtData } = await supabase.from('debts_taken').select('*').eq('account_id', currentAccount?.id).order('created_at', { ascending: false });
      const { data: dgData } = await supabase.from('debts_given').select('*').eq('account_id', currentAccount?.id).order('created_at', { ascending: false });
      
      if (dtData) setDebts(dtData);
      if (dgData) setReceivables(dgData);
    } catch (err) {
      console.error("Error fetching debts/loans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !name || !amount) return;

    setIsSaving(true);
    const numAmount = parseFloat(amount);
    const table = showAddModal === 'debt' ? 'debts_taken' : 'debts_given';

    try {
      const { error } = await supabase.from(table).insert([{
        person_name: name,
        amount: numAmount,
        status: 'pending',
        account_id: currentAccount.id,
        user_id: currentAccount.user_id
      }]);

      if (error) throw error;
      setName('');
      setAmount('');
      setShowAddModal(null);
      fetchData();
    } catch (err: any) {
      alert("সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: Entry, type: EntryType) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${entry.person_name}" এর এই হিসাবটি ডিলিট করতে চান? এটি চিরতরে মুছে যাবে।`)) return;
    
    const table = type === 'debt' ? 'debts_taken' : 'debts_given';
    try {
      const { error } = await supabase.from(table).delete().eq('id', entry.id);
      if (error) throw error;
      
      if (type === 'debt') {
        setDebts(prev => prev.filter(d => d.id !== entry.id));
      } else {
        setReceivables(prev => prev.filter(r => r.id !== entry.id));
      }
    } catch (err: any) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || !payAmount || !selectedWalletId) return;

    setIsSaving(true);
    const amountToPay = parseFloat(payAmount);
    const { entry, type } = showPaymentModal;
    const table = type === 'debt' ? 'debts_taken' : 'debts_given';
    const wallet = wallets.find(w => w.id === selectedWalletId);

    if (!wallet) return;

    try {
      const remainingAmount = entry.amount - amountToPay;
      const newStatus = remainingAmount <= 0 ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          amount: Math.max(0, remainingAmount), 
          status: newStatus 
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      const txType: TransactionType = type === 'debt' ? 'expense' : 'income';
      await supabase.from('transactions').insert([{
        account_id: currentAccount?.id,
        user_id: currentAccount?.user_id,
        wallet_id: selectedWalletId,
        amount: amountToPay,
        type: txType,
        note: `${entry.person_name} কে ${type === 'debt' ? 'পরিশোধ' : 'থেকে আদায়'}`,
        transaction_date: new Date().toISOString().split('T')[0]
      }]);

      const newBalance = txType === 'income' ? wallet.balance + amountToPay : wallet.balance - amountToPay;
      await supabase.from('wallets').update({ balance: newBalance }).eq('id', selectedWalletId);

      setShowPaymentModal(null);
      setPayAmount('');
      fetchData();
      fetchWallets();
    } catch (err: any) {
      alert("পেমেন্ট সম্পন্ন হয়নি: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const markAsUncollectible = async (entry: Entry, type: EntryType) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${entry.person_name}" এর এই লেনদেনটি অনাদায়ী (Uncollectible) হিসেবে মার্ক করতে চান? এটি হিসাব থেকে বাদ পড়বে।`)) return;
    
    setIsSaving(true);
    const table = type === 'debt' ? 'debts_taken' : 'debts_given';
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: 'uncollectible' })
        .eq('id', entry.id);
      
      if (error) throw error;
      
      // Update local state for immediate feedback
      if (type === 'debt') {
        setDebts(prev => prev.map(d => d.id === entry.id ? { ...d, status: 'uncollectible' } : d));
      } else {
        setReceivables(prev => prev.map(r => r.id === entry.id ? { ...r, status: 'uncollectible' } : r));
      }
    } catch (err: any) {
      alert("ব্যর্থ হয়েছে: " + err.message + "\nপরামর্শ: ডাটাবেজ টেবিলে 'uncollectible' স্ট্যাটাসটি এনাবল আছে কিনা নিশ্চিত করুন।");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">বাকি</span>;
      case 'partial': return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold">আংশিক</span>;
      case 'paid': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold">পরিশোধিত</span>;
      case 'uncollectible': return <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold">অনাদায়ী</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">ধার ও লোন হিসাব</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setShowAddModal('debt')} className="flex-1 md:flex-none bg-rose-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-100">+ দেনা যোগ করুন</button>
          <button onClick={() => setShowAddModal('receivable')} className="flex-1 md:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">+ পাওনা যোগ করুন</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* দেনা সেকশন */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-rose-600 flex items-center justify-between">
            <div className="flex items-center"><span className="mr-2 text-xl">🚩</span> আমার দেনা ও লোন</div>
            <span className="text-sm font-black opacity-50">মোট: ৳{debts.filter(d => d.status === 'pending' || d.status === 'partial').reduce((a, b) => a + b.amount, 0).toLocaleString('bn-BD')}</span>
          </h2>
          <div className="space-y-3">
             {loading ? (
               <div className="text-center py-10 text-slate-400 text-xs">লোড হচ্ছে...</div>
             ) : debts.length === 0 ? (
               <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400 font-medium">কোন লোন নেই</div>
             ) : (
               debts.map(item => (
                 <div key={item.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group transition duration-300 hover:border-rose-200 ${item.status === 'paid' || item.status === 'uncollectible' ? 'opacity-50 grayscale' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-700">{item.person_name}</h4>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{new Date(item.created_at).toLocaleDateString('bn-BD')}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <p className="text-rose-600 font-black text-xl">৳{item.amount.toLocaleString('bn-BD')}</p>
                        <button 
                          onClick={() => handleDelete(item, 'debt')}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-300 hover:text-rose-600 transition"
                          title="ডিলিট"
                        >
                          🗑️
                        </button>
                      </div>
                      {item.status !== 'paid' && item.status !== 'uncollectible' && (
                        <div className="flex gap-4 justify-end mt-2">
                          <button 
                            onClick={() => markAsUncollectible(item, 'debt')} 
                            disabled={isSaving}
                            className="text-[10px] text-slate-400 font-bold hover:text-rose-600 transition uppercase tracking-wider disabled:opacity-50"
                          >
                            অনাদায়ী মার্ক করুন
                          </button>
                          <button onClick={() => { setShowPaymentModal({ entry: item, type: 'debt' }); setPayAmount(item.amount.toString()); }} className="text-[10px] text-blue-600 font-bold hover:underline transition uppercase tracking-wider">পরিশোধ</button>
                        </div>
                      )}
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* পাওনা সেকশন */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-emerald-600 flex items-center justify-between">
            <div className="flex items-center"><span className="mr-2 text-xl">🏳️</span> পাওনা টাকা</div>
            <span className="text-sm font-black opacity-50">মোট: ৳{receivables.filter(r => r.status === 'pending' || r.status === 'partial').reduce((a, b) => a + b.amount, 0).toLocaleString('bn-BD')}</span>
          </h2>
          <div className="space-y-3">
             {loading ? (
                <div className="text-center py-10 text-slate-400 text-xs">লোড হচ্ছে...</div>
             ) : receivables.length === 0 ? (
               <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400 font-medium">কোন পাওনা নেই</div>
             ) : (
               receivables.map(item => (
                 <div key={item.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group transition duration-300 hover:border-emerald-200 ${item.status === 'paid' || item.status === 'uncollectible' ? 'opacity-50 grayscale' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-700">{item.person_name}</h4>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{new Date(item.created_at).toLocaleDateString('bn-BD')}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <p className="text-emerald-600 font-black text-xl">৳{item.amount.toLocaleString('bn-BD')}</p>
                        <button 
                          onClick={() => handleDelete(item, 'receivable')}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-300 hover:text-rose-600 transition"
                          title="ডিলিট"
                        >
                          🗑️
                        </button>
                      </div>
                      {item.status !== 'paid' && item.status !== 'uncollectible' && (
                        <div className="flex gap-4 justify-end mt-2">
                          <button 
                            onClick={() => markAsUncollectible(item, 'receivable')} 
                            disabled={isSaving}
                            className="text-[10px] text-slate-400 font-bold hover:text-rose-600 transition uppercase tracking-wider disabled:opacity-50"
                          >
                            অনাদায়ী মার্ক করুন
                          </button>
                          <button onClick={() => { setShowPaymentModal({ entry: item, type: 'receivable' }); setPayAmount(item.amount.toString()); }} className="text-[10px] text-blue-600 font-bold hover:underline transition uppercase tracking-wider">আদায়</button>
                        </div>
                      )}
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">{showAddModal === 'debt' ? 'দেনা যোগ করুন' : 'পাওনা যোগ করুন'}</h2>
              <button onClick={() => setShowAddModal(null)} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddNew} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ব্যক্তি বা প্রতিষ্ঠানের নাম</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-medium" placeholder="যেমন: রহীম ভাই" required />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">টাকার পরিমাণ</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-xl" placeholder="৳ ০.০০" required />
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">
                {isSaving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">{showPaymentModal.type === 'debt' ? 'পরিশোধ সম্পন্ন করুন' : 'আদায় লিপিবদ্ধ করুন'}</h2>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            <div className="bg-slate-50 p-6 rounded-[1.5rem] mb-8 border border-slate-100">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">বাকি পরিমাণ</p>
              <h3 className="text-3xl font-black text-slate-800">৳{showPaymentModal.entry.amount.toLocaleString('bn-BD')}</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5"><span className="opacity-50">ব্যক্তি:</span> {showPaymentModal.entry.person_name}</p>
            </div>
            <form onSubmit={handleProcessPayment} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">টাকার পরিমাণ</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={showPaymentModal.entry.amount} className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-xl" required />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1">ওয়ালেট সিলেক্ট করুন</label>
                <select value={selectedWalletId} onChange={(e) => setSelectedWalletId(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium" required>
                  <option value="">সিলেক্ট করুন...</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.provider_name} (৳{w.balance})</option>)}
                </select>
              </div>
              <button type="submit" disabled={isSaving || wallets.length === 0} className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all">
                {isSaving ? 'প্রসেসিং হচ্ছে...' : 'লেনদেন কনফার্ম করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtsLoans;

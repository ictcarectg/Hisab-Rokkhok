
import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { Wallet, TransactionType } from '../types';
import { supabase } from '../lib/supabase';

type EntryType = 'debt' | 'receivable';
interface Entry { id: string; person_name: string; amount: number; status: 'pending' | 'partial' | 'paid' | 'uncollectible'; created_at: string; account_id: string; user_id: string; }

const DebtsLoans: React.FC = () => {
  const { currentAccount } = useApp();
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<Entry[]>([]);
  const [receivables, setReceivables] = useState<Entry[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showAddModal, setShowAddModal] = useState<EntryType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<{ entry: Entry, type: EntryType } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');

  useEffect(() => { if (currentAccount) { fetchData(); fetchWallets(); } }, [currentAccount]);

  const fetchWallets = async () => { const { data } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id); if (data) setWallets(data); };
  const fetchData = async () => {
    setLoading(true);
    const { data: dtData } = await supabase.from('debts_taken').select('*').eq('account_id', currentAccount?.id).order('created_at', { ascending: false });
    const { data: dgData } = await supabase.from('debts_given').select('*').eq('account_id', currentAccount?.id).order('created_at', { ascending: false });
    setDebts(dtData || []); setReceivables(dgData || []); setLoading(false);
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    const table = showAddModal === 'debt' ? 'debts_taken' : 'debts_given';
    try { await supabase.from(table).insert([{ person_name: name, amount: parseFloat(amount), status: 'pending', account_id: currentAccount?.id, user_id: currentAccount?.user_id }]);
    setName(''); setAmount(''); setShowAddModal(null); fetchData(); } catch (err:any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    if (!showPaymentModal || !selectedWalletId) return;
    const { entry, type } = showPaymentModal;
    const table = type === 'debt' ? 'debts_taken' : 'debts_given';
    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (!wallet) return;
    const rem = entry.amount - parseFloat(payAmount);
    try {
        await supabase.from(table).update({ amount: Math.max(0, rem), status: rem <= 0 ? 'paid' : 'partial' }).eq('id', entry.id);
        const txType = type === 'debt' ? 'expense' : 'income';
        await supabase.from('transactions').insert([{ account_id: currentAccount?.id, user_id: currentAccount?.user_id, wallet_id: selectedWalletId, amount: parseFloat(payAmount), type: txType, note: `${entry.person_name} (${type==='debt'?'পরিশোধ':'আদায়'})`, transaction_date: new Date().toISOString().split('T')[0] }]);
        const nb = txType === 'income' ? wallet.balance + parseFloat(payAmount) : wallet.balance - parseFloat(payAmount);
        await supabase.from('wallets').update({ balance: nb }).eq('id', selectedWalletId);
        setShowPaymentModal(null); setPayAmount(''); fetchData(); fetchWallets();
    } catch(err:any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const markAsUncollectible = async (entry: Entry, type: EntryType) => {
      if(!confirm("Uncollectible?")) return;
      const table = type === 'debt' ? 'debts_taken' : 'debts_given';
      await supabase.from(table).update({ status: 'uncollectible' }).eq('id', entry.id);
      fetchData();
  }

  const handleDelete = async (entry: Entry, type: EntryType) => {
      if(!confirm("Delete?")) return;
      const table = type === 'debt' ? 'debts_taken' : 'debts_given';
      await supabase.from(table).delete().eq('id', entry.id);
      fetchData();
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black text-slate-800">ঋণ হিসাব</h1><p className="text-slate-500 font-bold text-sm mt-1">দেনা এবং পাওনা ট্র্যাকার</p></div>
        <div className="flex gap-2">
            <button onClick={() => setShowAddModal('debt')} className="bg-rose-100 text-rose-700 px-5 py-3 rounded-2xl font-bold hover:bg-rose-200 transition">+ দেনা</button>
            <button onClick={() => setShowAddModal('receivable')} className="bg-emerald-100 text-emerald-700 px-5 py-3 rounded-2xl font-bold hover:bg-emerald-200 transition">+ পাওনা</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[ { title: 'দেনা ও লোন', items: debts, type: 'debt', color: 'rose' }, { title: 'পাওনা টাকা', items: receivables, type: 'receivable', color: 'emerald' } ].map((section: any) => (
            <div key={section.type} className="space-y-4">
                <div className={`flex justify-between items-center p-4 rounded-3xl bg-${section.color}-50 border border-${section.color}-100`}>
                    <h2 className={`text-xl font-black text-${section.color}-600`}>{section.title}</h2>
                    <span className={`text-${section.color}-700 font-bold bg-white px-3 py-1 rounded-xl shadow-sm`}>৳{section.items.filter((i:any)=>i.status!=='paid'&&i.status!=='uncollectible').reduce((a:any,b:any)=>a+b.amount,0).toLocaleString('bn-BD')}</span>
                </div>
                <div className="space-y-3">
                    {section.items.map((item: Entry) => (
                        <div key={item.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition duration-300 ${item.status==='paid'?'opacity-50 grayscale':''}`}>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 mb-1">{item.person_name}</h4>
                                <div className="flex gap-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.status==='pending'?'bg-slate-100 text-slate-500':item.status==='partial'?'bg-blue-100 text-blue-600':item.status==='uncollectible'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-600'}`}>{item.status}</span>
                                    <span className="text-[10px] text-slate-400 font-bold pt-0.5">{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-black mb-2 text-${section.color}-600`}>৳{item.amount.toLocaleString('bn-BD')}</p>
                                {item.status !== 'paid' && item.status !== 'uncollectible' && (
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => markAsUncollectible(item, section.type)} className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600">✕</button>
                                        <button onClick={() => { setShowPaymentModal({ entry: item, type: section.type }); setPayAmount(item.amount.toString()); }} className="px-3 h-8 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">✓</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {section.items.length === 0 && <div className="text-center py-10 text-slate-400">কোন তথ্য নেই</div>}
                </div>
            </div>
        ))}
      </div>

      {(showAddModal || showPaymentModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">{showAddModal ? 'নতুন এন্ট্রি' : 'লেনদেন'}</h2>
                <button onClick={() => { setShowAddModal(null); setShowPaymentModal(null); }} className="w-10 h-10 bg-slate-100 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition">✕</button>
             </div>
             {showAddModal && <form onSubmit={handleAddNew} className="space-y-6">
                 <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="নাম" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:border-blue-500" required />
                 <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="পরিমাণ" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-xl outline-none focus:border-blue-500" required />
                 <button type="submit" disabled={isSaving} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200">সেভ করুন</button>
             </form>}
             {showPaymentModal && <form onSubmit={handleProcessPayment} className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-2xl text-center"><p className="text-xs font-bold text-slate-400 uppercase">বাকি</p><h3 className="text-3xl font-black text-slate-800">৳{showPaymentModal.entry.amount}</h3></div>
                 <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-black text-xl outline-none focus:border-blue-500" required />
                 <select value={selectedWalletId} onChange={e=>setSelectedWalletId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-bold" required>
                    <option value="">ওয়ালেট...</option>{wallets.map(w=><option key={w.id} value={w.id}>{w.provider_name}</option>)}
                 </select>
                 <button type="submit" disabled={isSaving} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200">নিশ্চিত করুন</button>
             </form>}
          </div>
        </div>
      )}
    </div>
  );
};
export default DebtsLoans;

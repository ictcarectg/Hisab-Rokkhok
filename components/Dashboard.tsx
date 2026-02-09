
import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { FinancialSummary, Transaction, Wallet } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { currentAccount } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalCash: 0, totalBank: 0, totalMobileBanking: 0, totalBankLoan: 0, totalNgoLoan: 0,
    totalReceivable: 0, totalPayable: 0, monthlyIncome: 0, monthlyExpense: 0,
  });

  useEffect(() => {
    if (isSupabaseConfigured && currentAccount) loadDashboardData();
  }, [currentAccount]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: wallets } = await supabase.from('wallets').select('*').eq('account_id', currentAccount?.id);
      let cash = 0, bank = 0, mobile = 0;
      wallets?.forEach((w: Wallet) => {
        if (w.type === 'cash') cash += w.balance;
        if (w.type === 'bank') bank += w.balance;
        if (w.type === 'mobile_banking') mobile += w.balance;
      });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const { data: monthlyTxs } = await supabase.from('transactions').select('amount, type')
        .eq('account_id', currentAccount?.id).gte('transaction_date', startOfMonth).is('deleted_at', null);
      let mIncome = 0, mExpense = 0;
      monthlyTxs?.forEach(tx => {
        if (tx.type === 'income') mIncome += tx.amount;
        if (tx.type === 'expense') mExpense += tx.amount;
      });

      const { data: dtData } = await supabase.from('debts_taken').select('amount, status').eq('account_id', currentAccount?.id);
      const { data: dgData } = await supabase.from('debts_given').select('amount, status').eq('account_id', currentAccount?.id);
      const totalPayable = dtData?.filter(d => d.status === 'pending' || d.status === 'partial').reduce((a, b) => a + b.amount, 0) || 0;
      const totalReceivable = dgData?.filter(d => d.status === 'pending' || d.status === 'partial').reduce((a, b) => a + b.amount, 0) || 0;

      setSummary({ totalCash: cash, totalBank: bank, totalMobileBanking: mobile, totalBankLoan: 0, totalNgoLoan: 0,
        totalReceivable, totalPayable, monthlyIncome: mIncome, monthlyExpense: mExpense });

      const { data: txData } = await supabase.from('transactions').select('*, wallet:wallets(*), category:categories(*)')
        .eq('account_id', currentAccount?.id).is('deleted_at', null).order('transaction_date', { ascending: false }).limit(5);
      if (txData) setRecentTransactions(txData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const chartData = [
    { name: 'নগদ', amount: summary.totalCash },
    { name: 'ব্যাংক', amount: summary.totalBank },
    { name: 'মোবাইল', amount: summary.totalMobileBanking },
  ];
  const loanDebtData = [{ name: 'পাওনা', value: summary.totalReceivable }, { name: 'দেনা', value: summary.totalPayable }];
  const COLORS = ['#10b981', '#f43f5e'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">শুভ সকাল 👋</p>
           <h1 className="text-3xl font-black text-slate-800">ওভারভিউ</h1>
        </div>
        <button onClick={loadDashboardData} className="bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl shadow-sm transition active:scale-95">🔄</button>
      </div>

      {/* Hero Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition duration-700"></div>
            <div className="relative z-10">
                <p className="text-blue-100 font-medium mb-2">মোট ব্যালেন্স</p>
                <h2 className="text-5xl font-black tracking-tight">৳{(summary.totalCash + summary.totalBank + summary.totalMobileBanking).toLocaleString('bn-BD')}</h2>
                <div className="mt-8 flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        <p className="text-xs text-blue-100">নগদ</p>
                        <p className="font-bold text-lg">৳{summary.totalCash.toLocaleString('bn-BD')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        <p className="text-xs text-blue-100">ডিজিটাল</p>
                        <p className="font-bold text-lg">৳{(summary.totalBank + summary.totalMobileBanking).toLocaleString('bn-BD')}</p>
                    </div>
                </div>
            </div>
         </div>

         <SummaryCard title="এই মাসের আয়" value={summary.monthlyIncome} type="income" icon="📈" />
         <SummaryCard title="এই মাসের ব্যয়" value={summary.monthlyExpense} type="expense" icon="📉" />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-xl font-bold text-slate-800">ব্যালেন্স ব্রেকডাউন</h2>
             <div className="flex gap-2">
                {['নগদ', 'ব্যাংক', 'মোবাইল'].map((t, i) => (
                    <div key={t} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <div className={`w-2 h-2 rounded-full ${i===0?'bg-blue-500':i===1?'bg-indigo-500':'bg-violet-500'}`}></div>{t}
                    </div>
                ))}
             </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="amount" radius={[16, 16, 16, 16]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#6366f1' : '#8b5cf6'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-4">ঋণ অবস্থা</h2>
          <div className="flex-1 flex items-center justify-center relative">
            {summary.totalReceivable === 0 && summary.totalPayable === 0 ? (
                <div className="text-center text-slate-300 font-bold">কোন ডাটা নেই</div>
            ) : (
                <ResponsiveContainer width="100%" height="200px">
                <PieChart>
                    <Pie data={loanDebtData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {loanDebtData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
                </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                    <p className="text-xs text-slate-400 font-bold uppercase">নেট অবস্থান</p>
                    <p className={`text-lg font-black ${(summary.totalReceivable - summary.totalPayable) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {(summary.totalReceivable - summary.totalPayable) >= 0 ? '+' : ''}
                        ৳{(summary.totalReceivable - summary.totalPayable).toLocaleString('bn-BD')}
                    </p>
                 </div>
            </div>
          </div>
          <div className="space-y-3 mt-4">
             <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-xs font-black text-emerald-600 uppercase">পাওনা</span>
                <span className="font-black text-emerald-700">৳{summary.totalReceivable.toLocaleString('bn-BD')}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <span className="text-xs font-black text-rose-600 uppercase">দেনা</span>
                <span className="font-black text-rose-700">৳{summary.totalPayable.toLocaleString('bn-BD')}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xl font-bold text-slate-800">সাম্প্রতিক লেনদেন</h2>
            <button onClick={() => navigate('/transactions')} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition">সব দেখুন ➔</button>
        </div>
        <div className="space-y-4">
            {recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-white rounded-[2rem] border border-slate-100">কোন লেনদেন নেই</div>
            ) : (
                recentTransactions.map((tx, i) => (
                    <div key={tx.id} onClick={() => navigate('/transactions')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} group-hover:scale-110 transition-transform duration-300`}>
                                {tx.category?.icon || '📦'}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg mb-0.5">{tx.category?.name || 'অজানা'}</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                                    {new Date(tx.transaction_date).toLocaleDateString('bn-BD')} • {tx.wallet?.provider_name}
                                </p>
                            </div>
                        </div>
                        <span className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'income' ? '+' : '-'} ৳{tx.amount.toLocaleString('bn-BD')}
                        </span>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, type, icon }: { title: string, value: number, type: 'income' | 'expense', icon: string }) => {
  const isIncome = type === 'income';
  return (
    <div className={`rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg duration-300 bg-white ${isIncome ? 'border-emerald-100' : 'border-rose-100'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {icon}
        </div>
        <span className={`text-xs font-black uppercase tracking-widest py-1 px-3 rounded-full ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {isIncome ? '+ আয়' : '- ব্যয়'}
        </span>
      </div>
      <div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">{title}</p>
        <h3 className={`text-3xl font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>৳{value.toLocaleString('bn-BD')}</h3>
      </div>
    </div>
  );
};

export default Dashboard;

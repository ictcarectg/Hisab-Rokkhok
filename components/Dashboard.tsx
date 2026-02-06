
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
    totalCash: 0,
    totalBank: 0,
    totalMobileBanking: 0,
    totalBankLoan: 0,
    totalNgoLoan: 0,
    totalReceivable: 0,
    totalPayable: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
  });

  useEffect(() => {
    if (isSupabaseConfigured && currentAccount) {
      loadDashboardData();
    }
  }, [currentAccount]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('account_id', currentAccount?.id);

      let cash = 0, bank = 0, mobile = 0;
      wallets?.forEach((w: Wallet) => {
        if (w.type === 'cash') cash += w.balance;
        if (w.type === 'bank') bank += w.balance;
        if (w.type === 'mobile_banking') mobile += w.balance;
      });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyTxs } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('account_id', currentAccount?.id)
        .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
        .is('deleted_at', null);

      let mIncome = 0, mExpense = 0;
      monthlyTxs?.forEach(tx => {
        if (tx.type === 'income') mIncome += tx.amount;
        if (tx.type === 'expense') mExpense += tx.amount;
      });

      const { data: dtData } = await supabase.from('debts_taken').select('amount, status').eq('account_id', currentAccount?.id);
      const { data: dgData } = await supabase.from('debts_given').select('amount, status').eq('account_id', currentAccount?.id);

      const totalPayable = dtData?.filter(d => d.status === 'pending' || d.status === 'partial').reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const totalReceivable = dgData?.filter(d => d.status === 'pending' || d.status === 'partial').reduce((acc, curr) => acc + curr.amount, 0) || 0;

      setSummary({
        totalCash: cash,
        totalBank: bank,
        totalMobileBanking: mobile,
        totalBankLoan: 0,
        totalNgoLoan: 0,
        totalReceivable: totalReceivable,
        totalPayable: totalPayable,
        monthlyIncome: mIncome,
        monthlyExpense: mExpense,
      });

      const { data: txData } = await supabase
        .from('transactions')
        .select('*, wallet:wallets(*), category:categories(*)')
        .eq('account_id', currentAccount?.id)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (txData) setRecentTransactions(txData);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি ডিলিট করতে চান?')) return;
    try {
      await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', tx.id);
      
      // Get current wallet balance
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('id', tx.wallet_id).single();
      if (wallet) {
        const adjustment = tx.type === 'expense' ? tx.amount : -tx.amount;
        await supabase.from('wallets').update({ balance: wallet.balance + adjustment }).eq('id', tx.wallet_id);
      }
      
      loadDashboardData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const chartData = [
    { name: 'নগদ', amount: summary.totalCash },
    { name: 'ব্যাংক', amount: summary.totalBank },
    { name: 'মোবাইল', amount: summary.totalMobileBanking },
  ];

  const loanDebtData = [
    { name: 'পাওনা', value: summary.totalReceivable },
    { name: 'দেনা', value: summary.totalPayable },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-slate-800">ওভারভিউ</h1>
        <div className="flex items-center gap-2">
           <button onClick={loadDashboardData} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition border border-blue-100 flex items-center gap-1">
             <span>রিফ্রেশ করুন</span> 🔄
           </button>
           <p className="text-slate-500 text-sm font-medium">{new Date().toLocaleDateString('bn-BD')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="মানিব্যাগ" value={summary.totalCash + summary.totalBank + summary.totalMobileBanking} color="blue" icon="💼" />
        <SummaryCard title="এই মাসের আয়" value={summary.monthlyIncome} color="emerald" icon="📈" />
        <SummaryCard title="এই মাসের ব্যয়" value={summary.monthlyExpense} color="rose" icon="📉" />
        <SummaryCard title="মোট ঋণ (দেনা)" value={summary.totalPayable} color="orange" icon="🏦" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-6 text-slate-700">ওয়ালেট ভিত্তিক ব্যালেন্স</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-6 text-slate-700">দেনা বনাম পাওনা</h2>
          <div className="h-64 w-full">
            {summary.totalReceivable === 0 && summary.totalPayable === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">কোন লেনদেন নেই</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={loanDebtData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    >
                    {loanDebtData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
                </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2">
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">পাওনা</span></div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">দেনা</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-700">সাম্প্রতিক লেনদেন</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">তারিখ</th>
                <th className="px-6 py-4">বিবরণ</th>
                <th className="px-6 py-4">ওয়ালেট</th>
                <th className="px-6 py-4 text-right">পরিমাণ</th>
                <th className="px-6 py-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">কোন সাম্প্রতিক লেনদেন নেই</td>
                </tr>
              ) : (
                recentTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition duration-200">
                        <td className="px-6 py-4 font-medium text-slate-600">{new Date(tx.transaction_date).toLocaleDateString('bn-BD')}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{tx.category?.icon || '📦'}</span>
                                <span className="font-bold text-slate-800">{tx.category?.name || 'অজানা'}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{tx.wallet?.provider_name}</td>
                        <td className={`px-6 py-4 text-right font-black text-base ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'income' ? '+' : '-'} ৳{tx.amount.toLocaleString('bn-BD')}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex justify-center gap-2">
                             <button 
                               onClick={() => navigate('/transactions')} 
                               className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition"
                               title="এডিট (লেনদেন পাতায় যান)"
                             >
                               ✏️
                             </button>
                             <button 
                               onClick={() => handleDeleteTransaction(tx)}
                               className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-rose-600 rounded-xl transition"
                               title="ডিলিট"
                             >
                               🗑️
                             </button>
                           </div>
                        </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, color, icon }: { title: string, value: number, color: string, icon: string }) => {
  const colorMap: any = {
    blue: 'text-blue-600 border-blue-50',
    emerald: 'text-emerald-600 border-emerald-50',
    rose: 'text-rose-600 border-rose-50',
    orange: 'text-orange-600 border-orange-50',
  };

  const iconBgMap: any = {
    blue: 'bg-blue-50',
    emerald: 'bg-emerald-50',
    rose: 'bg-rose-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className={`p-6 bg-white rounded-[2rem] border shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${colorMap[color] || colorMap.blue}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{title}</p>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">৳{value.toLocaleString('bn-BD')}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${iconBgMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

export default Dashboard;

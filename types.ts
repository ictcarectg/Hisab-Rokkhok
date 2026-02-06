
export interface Account {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export type WalletType = 'cash' | 'bank' | 'mobile_banking';

export interface Wallet {
  id: string;
  user_id: string;
  account_id: string;
  type: WalletType;
  provider_name: string;
  balance: number;
  created_at: string;
}

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  name: string;
  icon?: string;
  parent_id?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  wallet_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  is_opening_balance: boolean;
  note?: string;
  transaction_date: string;
  created_at: string;
  deleted_at?: string;
  // Join fields
  category?: Category;
  wallet?: Wallet;
}

export interface Loan {
  id: string;
  user_id: string;
  account_id: string;
  type: 'bank' | 'ngo' | 'others';
  provider_name: string;
  amount: number;
  interest_rate: number;
  status: 'active' | 'paid' | 'uncollectible';
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  account_id: string;
  person_name: string;
  amount: number;
  status: 'pending' | 'partial' | 'paid' | 'uncollectible';
  created_at: string;
}

export interface CreditPurchase {
  id: string;
  user_id: string;
  account_id: string;
  vendor_name: string;
  amount: number;
  status: 'unpaid' | 'paid';
  created_at: string;
}

export interface FinancialSummary {
  totalCash: number;
  totalBank: number;
  totalMobileBanking: number;
  totalBankLoan: number;
  totalNgoLoan: number;
  totalReceivable: number;
  totalPayable: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

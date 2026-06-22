export type View = 'dashboard' | 'transactions' | 'receivables' | 'budget' | 'credit-card' | 'settings' | 'import' | 'auth' | 'goals';

export interface Category { id: string; name: string; type: 'income' | 'expense'; icon: string; color: string; }
export interface Transaction { id: string; description: string; amount: number; my_amount: number; date: string; type: 'income' | 'expense' | 'transfer'; status: string; person_id?: string; category?: Category; }
export interface Person { id: string; name: string; avatar_color: string; }
export interface Goal { id: string; title: string; target_amount: number; current_amount: number; deadline: string; icon: string; }

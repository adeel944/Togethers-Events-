import React, { useMemo, useState } from 'react';
import { Banknote, Plus, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { Booking, BusinessExpense, BusinessProfile, Invoice } from '../../types';

interface FinanceViewProps {
  bookings?: Booking[];
  invoices?: Invoice[];
  profile?: BusinessProfile;
}

const EXPENSE_KEY = 'together-events-business-expenses-v1';
const categories: BusinessExpense['category'][] = ['Operations', 'Transport', 'Staff', 'Marketing', 'Office', 'Other'];

export const FinanceView: React.FC<FinanceViewProps> = ({ bookings = [], invoices = [], profile }) => {
  const currency = profile?.currencySymbol || 'Rs. ';
  const [expenses, setExpenses] = useState<BusinessExpense[]>(() => {
    try {
      const raw = localStorage.getItem(EXPENSE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Operations' as BusinessExpense['category'], amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  const money = (n: number) => `${currency}${Number(n || 0).toLocaleString()}`;
  const revenue = useMemo(() => invoices.reduce((sum, invoice) => {
    const amount = Number(invoice.totalAmount || 0);
    if (amount > 0) return sum + amount;
    return sum + (invoice.items || []).reduce((s, item) => s + Number(item.total || Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
  }, 0), [invoices]);
  const vendorCommitted = useMemo(() => bookings.reduce((sum, booking) => sum + (booking.assignedVendors || []).reduce((s, vendor) => s + Number(vendor.agreedAmount || 0), 0), 0), [bookings]);
  const vendorPaid = useMemo(() => bookings.reduce((sum, booking) => sum + (booking.assignedVendors || []).filter(v => v.paymentStatus === 'Paid').reduce((s, vendor) => s + Number(vendor.agreedAmount || 0), 0), 0), [bookings]);
  const otherExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const netProfit = revenue - vendorPaid - otherExpenses;
  const expectedProfit = revenue - vendorCommitted - otherExpenses;

  const saveExpenses = (next: BusinessExpense[]) => {
    setExpenses(next);
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(next));
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount || 0);
    if (!form.title.trim() || amount <= 0) return;
    const expense: BusinessExpense = { id: crypto.randomUUID(), title: form.title.trim(), category: form.category, amount, date: form.date, notes: form.notes.trim(), createdAt: new Date().toISOString() };
    saveExpenses([expense, ...expenses]);
    setForm({ title: '', category: 'Operations', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setIsOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Financial Control</span><h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-1">Profit &amp; Loss</h1><p className="text-slate-500 text-sm mt-1">See your total business, vendor costs, expenses and actual profit.</p></div>
        <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-bold shadow-lg shadow-slate-900/10"><Plus className="w-4 h-4" /> Add Expense</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5"><Banknote className="w-5 h-5 text-slate-500" /><span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">Total Business</span><strong className="block text-xl font-extrabold mt-2">{money(revenue)}</strong><span className="text-[10px] text-slate-500">Invoice revenue</span></div>
        <div className="glass-panel p-5"><Wallet className="w-5 h-5 text-slate-500" /><span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">Vendor Paid</span><strong className="block text-xl font-extrabold mt-2">{money(vendorPaid)}</strong><span className="text-[10px] text-slate-500">Marked as paid</span></div>
        <div className="glass-panel p-5"><TrendingDown className="w-5 h-5 text-slate-500" /><span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">Other Expenses</span><strong className="block text-xl font-extrabold mt-2">{money(otherExpenses)}</strong><span className="text-[10px] text-slate-500">Manual expenses</span></div>
        <div className="glass-panel p-5"><TrendingDown className="w-5 h-5 text-slate-500" /><span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">Vendor Commitments</span><strong className="block text-xl font-extrabold mt-2">{money(vendorCommitted)}</strong><span className="text-[10px] text-slate-500">Agreed vendor cost</span></div>
        <div className={`glass-panel p-5 col-span-2 lg:col-span-1 ${netProfit >= 0 ? 'bg-white/75' : 'bg-rose-50/70'}`}><TrendingUp className="w-5 h-5 text-slate-500" /><span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-4">Net Profit</span><strong className={`block text-xl font-extrabold mt-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{money(netProfit)}</strong><span className="text-[10px] text-slate-500">Revenue − paid vendors − expenses</span></div>
      </div>

      <div className="glass-panel p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-white/60"><div><h2 className="text-lg font-bold">Profit &amp; Cost Summary</h2><p className="text-xs text-slate-500 mt-1">Your expected profit after all agreed vendor costs is {money(expectedProfit)}.</p></div></div>
        <div className="mt-6 space-y-4">
          <div><div className="flex justify-between text-xs font-bold mb-1.5"><span>Business Revenue</span><span>{money(revenue)}</span></div><div className="h-2 rounded-full bg-slate-200/70 overflow-hidden"><div className="h-full rounded-full bg-slate-900" style={{ width: revenue ? '100%' : '0%' }} /></div></div>
          <div><div className="flex justify-between text-xs font-bold mb-1.5"><span>Vendor Paid</span><span>{money(vendorPaid)}</span></div><div className="h-2 rounded-full bg-slate-200/70 overflow-hidden"><div className="h-full rounded-full bg-slate-500" style={{ width: revenue ? `${Math.min(100, vendorPaid / revenue * 100)}%` : '0%' }} /></div></div>
          <div><div className="flex justify-between text-xs font-bold mb-1.5"><span>Other Expenses</span><span>{money(otherExpenses)}</span></div><div className="h-2 rounded-full bg-slate-200/70 overflow-hidden"><div className="h-full rounded-full bg-slate-400" style={{ width: revenue ? `${Math.min(100, otherExpenses / revenue * 100)}%` : '0%' }} /></div></div>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-7"><div className="flex items-center justify-between mb-5"><div><h2 className="text-base font-bold">Business Expenses</h2><p className="text-xs text-slate-500 mt-1">Add office, transport, staff, marketing and other running costs.</p></div><button type="button" onClick={() => setIsOpen(true)} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button></div>{expenses.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No manual expenses added yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3">Expense</th><th className="pb-3">Category</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 w-10" /></tr></thead><tbody className="divide-y divide-white/50">{expenses.map(expense => <tr key={expense.id}><td className="py-3 text-xs font-bold">{expense.title}</td><td className="py-3 text-xs text-slate-500">{expense.category}</td><td className="py-3 text-xs text-slate-500">{expense.date}</td><td className="py-3 text-xs font-bold text-right">{money(expense.amount)}</td><td className="py-3 text-right"><button type="button" onClick={() => saveExpenses(expenses.filter(item => item.id !== expense.id))} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label={`Delete ${expense.title}`}><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody></table></div>}</div>

      {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"><form onSubmit={addExpense} className="w-full max-w-md glass-panel p-6 shadow-2xl"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-bold">Add Business Expense</h2><p className="text-xs text-slate-500 mt-1">This amount will reduce Net Profit.</p></div><button type="button" onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-white/70"><X className="w-4 h-4" /></button></div><div className="space-y-4"><div><label className="text-xs font-bold text-slate-600">Expense Name</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office electricity" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/90 text-sm" /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-600">Amount</label><input required min="0.01" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/90 text-sm" /></div><div><label className="text-xs font-bold text-slate-600">Date</label><input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/90 text-sm" /></div></div><div><label className="text-xs font-bold text-slate-600">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as BusinessExpense['category'] })} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/90 text-sm">{categories.map(category => <option key={category}>{category}</option>)}</select></div><div><label className="text-xs font-bold text-slate-600">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/90 text-sm resize-none" /></div></div><button type="submit" className="mt-5 w-full py-2.5 rounded-xl bg-[#0f172a] text-white text-xs font-bold">Save Expense</button></form></div>}
    </div>
  );
};

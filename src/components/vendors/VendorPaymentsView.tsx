import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, WalletCards } from 'lucide-react';
import { Booking, BusinessProfile, Vendor } from '../../types';
import { Modal } from '../common/Modal';

interface Props {
  vendors: Vendor[];
  bookings: Booking[];
  profile: BusinessProfile;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => Promise<Booking>;
}

export const VendorPaymentsView: React.FC<Props> = ({ vendors, bookings, profile, onUpdateBooking }) => {
  const [paymentOpen, setPaymentOpen] = useState<{ bookingId: string; vendorId: string } | null>(null);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const rows = useMemo(() => vendors.flatMap(v => bookings.flatMap(b => {
    const a = (b.assignedVendors || []).find(x => x.vendorId === v.id);
    if (!a) return [];
    const agreed = Number(a.agreedAmount || 0);
    const paid = Math.min(Number(a.paidAmount || 0), agreed);
    return [{ vendor: v, booking: b, assignment: a, agreed, paid, balance: Math.max(0, agreed - paid) }];
  })), [vendors, bookings]);

  const open = (bookingId: string, vendorId: string) => {
    setForm({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Cash', notes: '' });
    setPaymentOpen({ bookingId, vendorId });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOpen) return;
    const booking = bookings.find(b => b.id === paymentOpen.bookingId);
    const assignment = booking?.assignedVendors?.find(v => v.vendorId === paymentOpen.vendorId);
    const amount = Number(form.amount || 0);
    if (!booking || !assignment || amount <= 0) return;
    const agreed = Number(assignment.agreedAmount || 0);
    const paid = Math.max(0, Number(assignment.paidAmount || 0));
    const balance = Math.max(0, agreed - paid);
    if (amount > balance) return;
    setSaving(true);
    try {
      const nextPaid = paid + amount;
      await onUpdateBooking(booking.id, {
        assignedVendors: booking.assignedVendors.map(v => v.vendorId === assignment.vendorId ? {
          ...v,
          paidAmount: nextPaid,
          paymentStatus: nextPaid >= agreed ? 'Paid' : 'Pending',
          paymentDate: form.date,
          paymentMethod: form.method,
          paymentNotes: form.notes.trim(),
        } : v),
      });
      setPaymentOpen(null);
    } finally { setSaving(false); }
  };

  return <div className="glass-card p-5 mt-6">
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <div><h3 className="text-sm font-semibold flex items-center gap-2"><WalletCards className="w-4 h-4 text-slate-500" />Vendor Payments</h3><p className="text-[11px] text-slate-500 mt-1">Add payments against any vendor assigned to a booking.</p></div>
    </div>
    {rows.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No vendor is assigned to a booking yet. Assign a vendor from the booking first.</p> : <div className="divide-y divide-slate-100">
      {rows.map(r => <div key={`${r.booking.id}-${r.vendor.id}`} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><div className="font-medium text-sm text-slate-900">{r.vendor.vendorName}</div><div className="text-xs text-slate-500 mt-1">{r.booking.clientName} • {r.booking.eventDate} • Agreed {money(r.agreed)}</div><div className="text-[11px] mt-1"><span className="text-emerald-600">Paid {money(r.paid)}</span><span className="text-slate-300 mx-2">•</span><span className="text-amber-600">Balance {money(r.balance)}</span></div></div>
        <button type="button" onClick={() => open(r.booking.id, r.vendor.id)} disabled={r.balance <= 0} className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${r.balance > 0 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-emerald-50 text-emerald-700'}`}>{r.balance > 0 ? <><Banknote className="w-3.5 h-3.5" /> Add Payment</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid</>}</button>
      </div>)}
    </div>}

    {paymentOpen && <Modal isOpen={true} onClose={() => !saving && setPaymentOpen(null)} title="Add Vendor Payment">
      <form onSubmit={save} className="space-y-4">
        <div><label className="block text-xs font-semibold mb-1">Payment Amount</label><input autoFocus type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Enter amount" required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold mb-1">Payment Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" required /></div><div><label className="block text-xs font-semibold mb-1">Method</label><select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"><option>Cash</option><option>Bank Transfer</option><option>JazzCash</option><option>EasyPaisa</option><option>Cheque</option><option>Other</option></select></div></div>
        <div><label className="block text-xs font-semibold mb-1">Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Optional payment note" /></div>
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving...' : 'Save Payment'}</button>
      </form>
    </Modal>}
  </div>;
};

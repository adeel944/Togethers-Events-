import React, { useMemo, useState } from 'react';
import { Plus, Search, Building2, Phone, Mail, MapPin, Edit2, Banknote, WalletCards, AlertCircle, CalendarDays, Trash } from 'lucide-react';
import { Vendor, VendorCategory, Booking, BusinessProfile } from '../../types';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { initialBusinessProfile } from '../../services/mockData';

interface VendorPayment { id: string; vendorId: string; amount: number; date: string; method: string; notes: string; createdAt: string; }
interface VendorsViewProps {
  vendors?: Vendor[]; bookings?: Booking[]; profile?: BusinessProfile;
  onCreateVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => Promise<Vendor>;
  onUpdateVendor: (id: string, vendor: Partial<Vendor>) => Promise<Vendor>;
  onDeleteVendor: (id: string) => Promise<boolean>;
  onSelectBooking: (booking: Booking) => void;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => Promise<Booking>;
}

const VENDOR_CATEGORIES: VendorCategory[] = ['Decorator','Caterer','Photographer','Videographer','Makeup Artist','Mehndi Artist','DJ / Sound','Florist','Venue','Furniture','Lighting','Transport','Other'];
const PAYMENT_KEY = 'together-events-vendor-payments-v1';
const loadPayments = (): VendorPayment[] => { try { const raw = localStorage.getItem(PAYMENT_KEY); const data = raw ? JSON.parse(raw) : []; return Array.isArray(data) ? data : []; } catch { return []; } };

export const VendorsView: React.FC<VendorsViewProps> = ({ vendors: inputVendors = [], bookings: inputBookings = [], profile: inputProfile, onCreateVendor, onUpdateVendor, onDeleteVendor, onSelectBooking }) => {
  const profile = inputProfile || initialBusinessProfile;
  const vendors = Array.isArray(inputVendors) ? inputVendors : [];
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(vendors[0] || null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [payments, setPayments] = useState<VendorPayment[]>(loadPayments);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentVendorId, setPaymentVendorId] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().slice(0,10), method: 'Cash', notes: '' });
  const [formData, setFormData] = useState({ vendorName:'', category:'Decorator' as VendorCategory, contactPerson:'', phone:'', whatsApp:'', email:'', address:'', services:'', paymentTerms:'', notes:'' });

  const money = (n: number) => `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;
  const resetForm = () => setFormData({ vendorName:'', category:'Decorator', contactPerson:'', phone:'', whatsApp:'', email:'', address:'', services:'', paymentTerms:'', notes:'' });
  const openAddVendor = () => { setEditingVendor(null); resetForm(); setIsFormOpen(true); };
  const openEditVendor = (vendor: Vendor) => { setEditingVendor(vendor); setFormData({ vendorName:vendor.vendorName || '', category:vendor.category, contactPerson:vendor.contactPerson || '', phone:vendor.phone || '', whatsApp:vendor.whatsApp || '', email:vendor.email || '', address:vendor.address || '', services:vendor.services || '', paymentTerms:vendor.paymentTerms || '', notes:vendor.notes || '' }); setIsFormOpen(true); };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!formData.vendorName.trim()) return; const saved = editingVendor ? await onUpdateVendor(editingVendor.id, formData) : await onCreateVendor(formData); setSelectedVendor(saved); setIsFormOpen(false); };
  const handleDelete = async (id: string) => { if (!window.confirm('Are you sure you want to delete this vendor?')) return; await onDeleteVendor(id); const next = payments.filter(p => p.vendorId !== id); setPayments(next); localStorage.setItem(PAYMENT_KEY, JSON.stringify(next)); if (selectedVendor?.id === id) setSelectedVendor(null); };

  const filteredVendors = vendors.filter(v => { const q = searchTerm.toLowerCase(); return (v.vendorName || '').toLowerCase().includes(q) || (v.contactPerson || '').toLowerCase().includes(q) || (v.services || '').toLowerCase().includes(q); }).filter(v => categoryFilter === 'All' || v.category === categoryFilter);
  const selectedPayments = selectedVendor ? payments.filter(p => p.vendorId === selectedVendor.id) : [];
  const booked = useMemo(() => selectedVendor ? bookings.reduce((sum,b) => sum + (b.assignedVendors || []).filter(a => a.vendorId === selectedVendor.id).reduce((s,a) => s + Number(a.agreedAmount || 0), 0), 0) : 0, [bookings, selectedVendor]);
  const paid = selectedPayments.reduce((s,p) => s + Number(p.amount || 0), 0);
  const remaining = Math.max(0, booked - paid);

  const openVendorPayment = (vendorId?: string) => {
    const id = vendorId || selectedVendor?.id || vendors[0]?.id || '';
    if (!id) { alert('Please add a vendor first.'); return; }
    const vendor = vendors.find(v => v.id === id) || selectedVendor;
    if (vendor) setSelectedVendor(vendor);
    setPaymentVendorId(id);
    setPaymentForm({ amount:'', date:new Date().toISOString().slice(0,10), method:'Cash', notes:'' });
    setPaymentOpen(true);
  };

  const paymentVendor = vendors.find(v => v.id === paymentVendorId) || selectedVendor;
  const paymentHistory = paymentVendor ? payments.filter(p => p.vendorId === paymentVendor.id) : [];
  const paymentBooked = paymentVendor ? bookings.reduce((sum,b) => sum + (b.assignedVendors || []).filter(a => a.vendorId === paymentVendor.id).reduce((s,a) => s + Number(a.agreedAmount || 0), 0), 0) : 0;
  const paymentPaid = paymentHistory.reduce((s,p) => s + Number(p.amount || 0), 0);
  const paymentRemaining = Math.max(0, paymentBooked - paymentPaid);

  const savePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentVendor) return;
    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0 || amount > paymentRemaining) return;
    const payment: VendorPayment = { id:`vp-${Date.now()}`, vendorId:paymentVendor.id, amount, date:paymentForm.date, method:paymentForm.method, notes:paymentForm.notes.trim(), createdAt:new Date().toISOString() };
    const next = [payment, ...payments]; setPayments(next); localStorage.setItem(PAYMENT_KEY, JSON.stringify(next)); setPaymentOpen(false); setSelectedVendor(paymentVendor);
  };
  const deletePayment = (id: string) => { const next = payments.filter(p => p.id !== id); setPayments(next); localStorage.setItem(PAYMENT_KEY, JSON.stringify(next)); };

  return <div className="space-y-6 animate-in fade-in duration-150">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-[#0f172a]">Vendors & Partners</h1><p className="text-slate-500 text-sm mt-1">Manage vendors and record vendor payments.</p></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => openVendorPayment()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-lg hover:bg-emerald-700"><Banknote className="w-4 h-4"/> Vendor Payment</button>
        <button type="button" onClick={openAddVendor} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] text-white text-sm font-medium shadow-lg"><Plus className="w-4 h-4"/> Add Vendor</button>
      </div>
    </div>

    {selectedVendor && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="glass-card p-4"><span className="text-[10px] uppercase tracking-widest text-slate-400">Booked / Agreed</span><div className="text-xl font-semibold mt-1">{money(booked)}</div></div><div className="glass-card p-4"><span className="text-[10px] uppercase tracking-widest text-slate-400">Paid to Vendor</span><div className="text-xl font-semibold text-emerald-600 mt-1">{money(paid)}</div></div><div className="glass-card p-4"><span className="text-[10px] uppercase tracking-widest text-slate-400">Remaining</span><div className="text-xl font-semibold text-amber-600 mt-1">{money(remaining)}</div></div></div>}

    <div className="glass-card p-4 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/70 border border-slate-200 rounded-xl outline-none"/></div><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="px-3 py-2.5 text-sm bg-white/70 border border-slate-200 rounded-xl outline-none"><option>All</option>{VENDOR_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto pr-1">{filteredVendors.length===0 ? <EmptyState title="No vendors found" description="Add vendors to your directory first." icon={Building2} actionLabel="Add Vendor" onAction={openAddVendor}/> : filteredVendors.map(v=>{const selected=selectedVendor?.id===v.id; const total=bookings.reduce((s,b)=>s+(b.assignedVendors||[]).filter(a=>a.vendorId===v.id).reduce((x,a)=>x+Number(a.agreedAmount||0),0),0); return <button type="button" key={v.id} onClick={()=>setSelectedVendor(v)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?'bg-slate-900 text-white border-slate-900 shadow-md':'bg-white/80 hover:bg-white border-slate-200 text-slate-900'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-sm">{v.vendorName}</h3><p className={`text-xs mt-1 ${selected?'text-slate-300':'text-slate-500'}`}>{v.contactPerson||'No contact person'}</p></div><span className={`text-[10px] px-2 py-1 rounded-md font-medium ${selected?'bg-white/10':'bg-slate-100'}`}>{v.category}</span></div><div className={`mt-3 pt-2.5 border-t ${selected?'border-white/10':'border-slate-100'} text-[11px]`}>Booked {money(total)}</div></button>})}</div>
      <div className="lg:col-span-7">{selectedVendor ? <div className="space-y-5">
        <div className="glass-card p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100"><div><h2 className="text-xl font-semibold text-[#0f172a]">{selectedVendor.vendorName}</h2><span className="text-xs text-slate-500">{selectedVendor.category}</span></div><div className="flex gap-2"><button type="button" onClick={()=>openVendorPayment(selectedVendor.id)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"><Banknote className="w-4 h-4"/> Add Payment</button><button type="button" onClick={()=>openEditVendor(selectedVendor)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"><Edit2 className="w-3.5 h-3.5"/> Edit</button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs"><div className="flex gap-2"><Phone className="w-3.5 h-3.5 text-slate-400"/>Phone: {selectedVendor.phone||'N/A'}</div><div className="flex gap-2"><Mail className="w-3.5 h-3.5 text-slate-400"/>Email: {selectedVendor.email||'N/A'}</div>{selectedVendor.whatsApp&&<div>WhatsApp: {selectedVendor.whatsApp}</div>}{selectedVendor.address&&<div className="flex gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400"/>{selectedVendor.address}</div>}</div></div>
        <div className="glass-card p-5"><div className="flex items-center justify-between pb-3 border-b border-slate-100"><h3 className="text-sm font-semibold flex items-center gap-2"><WalletCards className="w-4 h-4 text-slate-500"/> Payment History</h3><button type="button" onClick={()=>openVendorPayment(selectedVendor.id)} className="text-xs font-semibold text-emerald-700">+ Add Payment</button></div>{selectedPayments.length===0?<div className="py-10 text-center"><p className="text-sm font-medium text-slate-600">No payments recorded yet</p><p className="text-xs text-slate-400 mt-1">Click Add Payment to record a payment.</p></div>:<div className="divide-y divide-slate-100">{selectedPayments.map(p=><div key={p.id} className="py-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-medium text-slate-900"><CalendarDays className="w-3.5 h-3.5 text-slate-400"/>{p.date}<span className="text-[10px] px-2 py-1 rounded bg-slate-100">{p.method}</span></div>{p.notes&&<p className="text-xs text-slate-500 mt-1">{p.notes}</p>}</div><div className="flex items-center gap-3"><b className="text-sm text-emerald-700">{money(p.amount)}</b><button type="button" onClick={()=>deletePayment(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600" title="Delete payment"><Trash className="w-3.5 h-3.5"/></button></div></div>)}</div>}</div>
        {bookings.filter(b=>(b.assignedVendors||[]).some(a=>a.vendorId===selectedVendor.id)).length>0&&<div className="glass-card p-5"><h3 className="text-sm font-semibold mb-3">Booked Events</h3><div className="divide-y divide-slate-100">{bookings.filter(b=>(b.assignedVendors||[]).some(a=>a.vendorId===selectedVendor.id)).map(b=>{const a=b.assignedVendors.find(x=>x.vendorId===selectedVendor.id);return <div key={b.id} className="py-3"><button type="button" onClick={()=>onSelectBooking(b)} className="text-left"><div className="text-sm font-medium text-slate-900">{b.clientName} • {b.eventType}</div><div className="text-xs text-slate-500 mt-1">{b.eventDate} • Agreed {money(Number(a?.agreedAmount||0))}</div></button></div>})}</div></div>}
      </div> : <div className="p-12 text-center text-slate-400 text-sm bg-white/60 rounded-2xl border border-slate-200">Select a vendor to manage payments.</div>}</div>
    </div>

    <Modal isOpen={paymentOpen} onClose={()=>setPaymentOpen(false)} title="Vendor Payment" subtitle="Select a vendor and record the payment." maxWidth="md"><form onSubmit={savePayment} className="space-y-4">
      <div><label className="block text-xs font-semibold mb-1">Vendor *</label><select required value={paymentVendorId} onChange={e=>{setPaymentVendorId(e.target.value); const v=vendors.find(x=>x.id===e.target.value); if(v)setSelectedVendor(v);}} className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white"><option value="">Select vendor</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.vendorName}</option>)}</select></div>
      {paymentVendor && <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-3 text-xs"><div><span className="text-slate-400 block">Booked</span><b>{money(paymentBooked)}</b></div><div><span className="text-emerald-500 block">Paid</span><b className="text-emerald-700">{money(paymentPaid)}</b></div><div><span className="text-amber-500 block">Remaining</span><b className="text-amber-700">{money(paymentRemaining)}</b></div></div>}
      <div><label className="block text-xs font-semibold mb-1">Payment Amount *</label><input required type="number" min="0.01" max={paymentRemaining||undefined} step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:e.target.value})} placeholder="e.g. 25,000" className="w-full px-3 py-3 rounded-xl border border-slate-200"/>{Number(paymentForm.amount||0)>paymentRemaining&&<p className="text-[11px] text-rose-600 mt-1"><AlertCircle className="w-3 h-3 inline"/> Payment cannot exceed remaining {money(paymentRemaining)}.</p>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold mb-1">Payment Date *</label><input required type="date" value={paymentForm.date} onChange={e=>setPaymentForm({...paymentForm,date:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">Payment Method</label><select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option>Cash</option><option>Bank Transfer</option><option>JazzCash</option><option>EasyPaisa</option><option>Cheque</option><option>Other</option></select></div></div>
      <div><label className="block text-xs font-semibold mb-1">Notes</label><textarea rows={2} value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm,notes:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 resize-none" placeholder="Optional note"/></div>
      <div className="flex justify-end gap-2"><button type="button" onClick={()=>setPaymentOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs">Cancel</button><button type="submit" disabled={!paymentVendor||!paymentForm.amount||Number(paymentForm.amount)<=0||Number(paymentForm.amount)>paymentRemaining} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-50">Save Payment</button></div>
    </form></Modal>

    <Modal isOpen={isFormOpen} onClose={()=>setIsFormOpen(false)} title={editingVendor?'Edit Vendor Information':'Add New Vendor'} subtitle="Only Vendor / Company Name is required. All other details are optional." maxWidth="lg"><form onSubmit={handleSubmit} className="space-y-4 text-sm"><div><label className="block text-xs font-semibold mb-1">Vendor / Company Name *</label><input required value={formData.vendorName} onChange={e=>setFormData({...formData,vendorName:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold mb-1">Category</label><select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value as VendorCategory})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">{VENDOR_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="block text-xs font-semibold mb-1">Contact Person</label><input value={formData.contactPerson} onChange={e=>setFormData({...formData,contactPerson:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold mb-1">Phone</label><input value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">WhatsApp</label><input value={formData.whatsApp} onChange={e=>setFormData({...formData,whatsApp:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div></div><div><label className="block text-xs font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">Address / Location</label><input value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">Services Offered</label><input value={formData.services} onChange={e=>setFormData({...formData,services:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">Payment Terms</label><input value={formData.paymentTerms} onChange={e=>setFormData({...formData,paymentTerms:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold mb-1">Notes</label><textarea value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 resize-none"/></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setIsFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs">Cancel</button><button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium">{editingVendor?'Save Changes':'Create Vendor'}</button></div></form></Modal>
  </div>;
};
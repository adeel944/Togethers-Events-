import React, { useState } from 'react';
import { Plus, Search, Users, Phone, Mail, MapPin, Edit2, Trash2, CalendarCheck2, FileText } from 'lucide-react';
import { Client, Booking, Invoice, BusinessProfile } from '../../types';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { initialBusinessProfile } from '../../services/mockData';

interface ClientsViewProps {
  clients?: Client[]; bookings?: Booking[]; invoices?: Invoice[]; profile?: BusinessProfile;
  onCreateClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<Client>;
  onDeleteClient: (id: string) => Promise<boolean>;
  onSelectBooking: (booking: Booking) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onNewBookingForClient?: (client: Client) => void;
  onNewInvoiceForClient: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ clients: inputClients = [], bookings: inputBookings = [], invoices: inputInvoices = [], profile: inputProfile, onCreateClient, onUpdateClient, onDeleteClient, onSelectBooking, onSelectInvoice, onNewInvoiceForClient }) => {
  const profile = inputProfile || initialBusinessProfile;
  const clients = Array.isArray(inputClients) ? inputClients : [];
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const invoices = Array.isArray(inputInvoices) ? inputInvoices : [];
  const money = (n: number) => `${profile.currencySymbol || '$'}${Number(n || 0).toLocaleString()}`;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(clients[0] || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ fullName:'', phone:'', whatsApp:'', email:'', billingAddress:'', city:'', country:'Pakistan', notes:'' });
  const openAdd = () => { setEditing(null); setForm({fullName:'',phone:'',whatsApp:'',email:'',billingAddress:'',city:'',country:'Pakistan',notes:''}); setFormOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({fullName:c.fullName,phone:c.phone,whatsApp:c.whatsApp,email:c.email,billingAddress:c.billingAddress,city:c.city,country:c.country,notes:c.notes||''}); setFormOpen(true); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!form.fullName.trim()) return; const result = editing ? await onUpdateClient(editing.id, form) : await onCreateClient(form); setSelected(result); setFormOpen(false); };
  const remove = async (id: string) => { if (window.confirm('Are you sure you want to delete this client?')) { await onDeleteClient(id); if (selected?.id === id) setSelected(null); } };
  const filtered = clients.filter(c => `${c.fullName} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(search.toLowerCase()));
  const clientBookings = selected ? bookings.filter(b => b.clientId === selected.id) : [];
  const clientInvoices = selected ? invoices.filter(i => i.clientId === selected.id) : [];
  const billed = clientInvoices.reduce((s,i) => s + Number(i.totalAmount || 0), 0);
  const paid = clientInvoices.reduce((s,i) => s + Number(i.advancePaid || 0), 0);

  return <div className="space-y-6 animate-in fade-in duration-150">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Clients</h1><p className="text-slate-500 text-sm mt-0.5">Manage clients and their event invoices.</p></div><button type="button" onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] text-white text-sm font-semibold"><Plus className="w-4 h-4"/>Add Client</button></div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 space-y-4"><div className="glass-card p-3"><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients by name, phone, city..." className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"/></div></div>{filtered.length===0?<EmptyState title="No clients found" description="Add a client to create invoices and automatically create their bookings." icon={Users} actionLabel="Add Client" onAction={openAdd}/>:<div className="space-y-2 max-h-[700px] overflow-y-auto">{filtered.map(c=><div key={c.id} onClick={()=>setSelected(c)} className={`p-4 rounded-2xl border cursor-pointer ${selected?.id===c.id?'bg-slate-900 text-white border-slate-900':'bg-white/80 border-slate-200'}`}><div className="flex items-start justify-between"><div><h3 className="font-bold text-sm">{c.fullName}</h3><p className={`text-xs mt-1 ${selected?.id===c.id?'text-slate-300':'text-slate-500'}`}>{c.phone || c.email || 'No contact'}</p></div><span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{c.city || 'Pakistan'}</span></div><div className="mt-3 pt-2 border-t border-white/10 flex justify-end gap-1"><button type="button" onClick={e=>{e.stopPropagation();openEdit(c)}} className="p-1.5 rounded hover:bg-white/10"><Edit2 className="w-3.5 h-3.5"/></button><button type="button" onClick={e=>{e.stopPropagation();remove(c.id)}} className="p-1.5 rounded hover:bg-white/10"><Trash2 className="w-3.5 h-3.5"/></button></div></div>)}</div>}</div>
      <div className="lg:col-span-7">{selected?<div className="space-y-5"><div className="glass-card p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-[#0f172a]">{selected.fullName}</h2><div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-4"><span><Phone className="inline w-3.5 h-3.5 mr-1"/>{selected.phone || 'No phone'}</span><span><Mail className="inline w-3.5 h-3.5 mr-1"/>{selected.email || 'No email'}</span><span><MapPin className="inline w-3.5 h-3.5 mr-1"/>{selected.city || 'Pakistan'}</span></div></div><div className="flex gap-2"><button type="button" onClick={()=>onNewInvoiceForClient(selected)} className="px-3.5 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-semibold">+ New Invoice</button><button type="button" onClick={()=>openEdit(selected)} className="p-2 rounded-xl border border-slate-200"><Edit2 className="w-4 h-4"/></button></div></div>{selected.billingAddress&&<p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">Billing Address: {selected.billingAddress}</p>}</div>
      <div className="grid grid-cols-3 gap-3"><div className="glass-card p-4"><span className="text-[10px] font-bold text-slate-400 uppercase">Total Billed</span><p className="text-lg font-bold mt-1">{money(billed)}</p></div><div className="glass-card p-4"><span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span><p className="text-lg font-bold text-emerald-600 mt-1">{money(paid)}</p></div><div className="glass-card p-4"><span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding</span><p className="text-lg font-bold text-orange-500 mt-1">{money(Math.max(0,billed-paid))}</p></div></div>
      <div className="glass-card p-5"><h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3"><CalendarCheck2 className="inline w-4 h-4 mr-2"/>Booking History ({clientBookings.length})</h3>{clientBookings.length===0?<p className="text-xs text-slate-400 italic py-4 text-center">No bookings yet. Create a New Invoice to automatically create one.</p>:<div className="divide-y divide-slate-100">{clientBookings.map(b=><div key={b.id} onClick={()=>onSelectBooking(b)} className="py-3 flex items-center justify-between cursor-pointer"><div><p className="font-semibold text-sm">{b.eventType} <span className="text-xs text-slate-500">({b.eventDate})</span></p><p className="text-xs text-slate-500">{b.venue || 'Venue TBA'}</p></div><div className="text-right"><p className="text-xs font-semibold">{money(b.totalAmount)}</p><StatusBadge status={b.bookingStatus}/></div></div>)}</div>}</div>
      <div className="glass-card p-5"><h3 className="text-sm font-bold border-b border-slate-100 pb-3"><FileText className="inline w-4 h-4 mr-2"/>Invoices ({clientInvoices.length})</h3>{clientInvoices.length===0?<p className="text-xs text-slate-400 italic py-4 text-center">No invoices yet.</p>:<div className="divide-y divide-slate-100">{clientInvoices.map(i=><div key={i.id} onClick={()=>onSelectInvoice(i)} className="py-3 flex justify-between cursor-pointer"><span className="text-sm font-semibold">{i.invoiceNumber}</span><span className="text-xs font-semibold">{money(i.totalAmount)}</span></div>)}</div>}</div>
      </div>:<EmptyState title="Select a client" description="Choose a client to view their details." icon={Users}/>}</div>
    </div>
    <Modal isOpen={formOpen} onClose={()=>setFormOpen(false)} title={editing?'Edit Client':'Add Client'}><form onSubmit={submit} className="space-y-4">{[['fullName','Full Name'],['phone','Phone'],['whatsApp','WhatsApp'],['email','Email'],['billingAddress','Billing Address'],['city','City'],['country','Country']].map(([key,label])=><div key={key}><label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label><input value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"/></div>)}<div><label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" rows={3}/></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200">Cancel</button><button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white">Save Client</button></div></form></Modal>
  </div>;
};
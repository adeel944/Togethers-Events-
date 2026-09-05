import React, { useState } from 'react';
import {
  Plus, Search, FileText, Eye, Edit2, Copy, Trash2,
  UserPlus, Users, Check, CheckCircle2, Clock, UtensilsCrossed, X
} from 'lucide-react';
import {
  Invoice, Client, Booking, BusinessProfile, InvoiceSettings, InvoiceItem,
  PaymentStatus, EventType, MenuItem
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { initialBusinessProfile, initialInvoiceSettings } from '../../services/mockData';
import { clientService } from '../../services/clientService';

const MENU_KEY = 'together-events-menus-v1';
const loadMenus = (): MenuItem[] => { try { const raw = localStorage.getItem(MENU_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };

interface InvoicesViewProps {
  invoices?: Invoice[];
  clients?: Client[];
  bookings?: Booking[];
  profile?: BusinessProfile;
  settings?: InvoiceSettings;
  onCreateInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<Invoice>;
  onUpdateInvoice: (id: string, updates: Partial<Invoice>) => Promise<Invoice>;
  onDeleteInvoice: (id: string) => Promise<boolean>;
  onDuplicateInvoice: (id: string) => Promise<Invoice>;
  onPreviewInvoice: (invoice: Invoice) => void;
  onCreateClient?: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
}

const EVENT_TYPE_OPTIONS: EventType[] = [
  'Baraat', 'Walima', 'Mehendi', 'Sangeet', 'Qawwali Night', 'Reception',
  'Nikkah', 'Engagement', 'Birthday', 'Corporate Gala', 'Concert', 'Other',
];

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices: inputInvoices = [], clients: inputClients = [], bookings: inputBookings = [],
  profile: inputProfile, settings: inputSettings, onCreateInvoice, onUpdateInvoice,
  onDeleteInvoice, onDuplicateInvoice, onPreviewInvoice, onCreateClient,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const settings = inputSettings || initialInvoiceSettings;
  const invoices = Array.isArray(inputInvoices) ? inputInvoices : [];
  const [clients, setClients] = useState<Client[]>(Array.isArray(inputClients) ? inputClients : []);
  React.useEffect(() => { if (Array.isArray(inputClients)) setClients(inputClients); }, [inputClients]);
  const formatMoney = (amount: number) => `${profile.currencySymbol || 'Rs. '}${Number(amount || 0).toLocaleString()}`;
  const today = () => new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientCreatedSuccess, setClientCreatedSuccess] = useState<string | null>(null);
  const [newClientData, setNewClientData] = useState({ fullName: '', phone: '', whatsApp: '', email: '' });
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [menuGuests, setMenuGuests] = useState(1);

  const generateNewInvoiceNumber = () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV-${ymd}-${rand}`;
  };

  const [formData, setFormData] = useState({
    invoiceNumber: '', documentTitle: 'BOOKING CONFIRMATION', clientId: '', clientName: '',
    clientPhone: '', clientWhatsApp: '', clientEmail: '', billingAddress: '', eventType: '' as EventType,
    eventDate: '', eventTime: '', venue: '', issueDate: today(), dueDate: '',
    items: [{ id: 'item-1', description: '', quantity: 1, unitPrice: 0, total: 0 }] as InvoiceItem[],
    discount: 0, tax: 0, advancePaid: 0, notes: '', termsAndConditions: '',
    templateId: settings.defaultTemplate || 'modern',
  });

  const openCreateModal = () => {
    setEditingInvoice(null);
    setClientMode('new'); setClientCreatedSuccess(null);
    setNewClientData({ fullName: '', phone: '', whatsApp: '', email: '' });
    setSelectedMenu(null); setMenuGuests(1); setIsMenuDrawerOpen(false); setMenus(loadMenus());
    setFormData({
      invoiceNumber: generateNewInvoiceNumber(), documentTitle: 'BOOKING CONFIRMATION',
      clientId: '', clientName: '', clientPhone: '', clientWhatsApp: '', clientEmail: '', billingAddress: '',
      eventType: '' as EventType, eventDate: '', eventTime: '', venue: '', issueDate: today(), dueDate: '',
      items: [{ id: 'item-' + Date.now(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
      discount: 0, tax: 0, advancePaid: 0, notes: '', termsAndConditions: '',
      templateId: settings.defaultTemplate || 'modern',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv); setClientMode('existing'); setClientCreatedSuccess(null); setSelectedMenu(null); setMenuGuests(1); setIsMenuDrawerOpen(false); setMenus(loadMenus());
    setFormData({
      invoiceNumber: inv.invoiceNumber, documentTitle: 'BOOKING CONFIRMATION',
      clientId: inv.clientId, clientName: inv.clientName, clientPhone: inv.clientPhone,
      clientWhatsApp: inv.clientWhatsApp || '', clientEmail: inv.clientEmail || '', billingAddress: '',
      eventType: inv.eventType, eventDate: inv.eventDate, eventTime: '', venue: inv.venue || '',
      issueDate: inv.issueDate || today(), dueDate: inv.dueDate || '', items: inv.items.map((it) => ({ ...it })),
      discount: inv.discount || 0, tax: 0, advancePaid: inv.advancePaid || 0, notes: inv.notes || '',
      termsAndConditions: inv.termsAndConditions || '', templateId: 'modern',
    });
    setIsFormOpen(true);
  };

  const handleSelectClient = (selectedId: string) => {
    const cl = clients.find((c) => c.id === selectedId);
    if (cl) setFormData((prev) => ({ ...prev, clientId: cl.id, clientName: cl.fullName, clientPhone: cl.phone, clientWhatsApp: cl.whatsApp || cl.phone, clientEmail: cl.email, billingAddress: '' }));
  };

  const handleQuickCreateClient = async () => {
    if (!newClientData.fullName.trim()) { alert('Please provide at least a Client Name.'); return; }
    try {
      const payload = { fullName: newClientData.fullName.trim(), phone: newClientData.phone.trim() || '+92 300 0000000', whatsApp: newClientData.whatsApp.trim() || newClientData.phone.trim() || '+92 300 0000000', email: newClientData.email.trim(), billingAddress: '' };
      const created = onCreateClient ? await onCreateClient(payload) : await clientService.createClient(payload);
      setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setFormData((prev) => ({ ...prev, clientId: created.id, clientName: created.fullName, clientPhone: created.phone, clientWhatsApp: created.whatsApp, clientEmail: created.email, billingAddress: '' }));
      setClientMode('existing'); setClientCreatedSuccess(`Client "${created.fullName}" created and linked to this invoice!`);
      setTimeout(() => setClientCreatedSuccess(null), 4000);
    } catch (err) { console.error('Failed to create client:', err); }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: string | number) => {
    const newItems = [...formData.items]; const current = { ...newItems[index], [field]: val };
    current.total = Number(current.quantity) * Number(current.unitPrice); newItems[index] = current;
    setFormData({ ...formData, items: newItems });
  };
  const addItem = () => setFormData({ ...formData, items: [...formData.items, { id: 'item-' + Date.now(), description: '', quantity: 1, unitPrice: 0, total: 0 }] });
  const removeItem = (index: number) => { if (formData.items.length > 1) setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) }); };

  const openMenuDrawer = () => { setMenus(loadMenus()); setSelectedMenu(null); setMenuGuests(1); setIsMenuDrawerOpen(true); };
  const addSelectedMenuToInvoice = () => {
    if (!selectedMenu) return;
    const price = Number(selectedMenu.price || 0);
    if (price <= 0) { alert('Please set a price for this menu first in Menus.'); return; }
    const guests = Math.max(1, Number(menuGuests || 1));
    const menuItem: InvoiceItem = { id: `menu-${selectedMenu.id}-${Date.now()}`, description: `${selectedMenu.name}${selectedMenu.description ? ` — ${selectedMenu.description}` : ''}`, quantity: guests, unitPrice: price, total: guests * price };
    setFormData((prev) => {
      const existingBlank = prev.items.length === 1 && !prev.items[0].description && Number(prev.items[0].unitPrice) === 0;
      return { ...prev, items: existingBlank ? [menuItem] : [...prev.items, menuItem] };
    });
    setIsMenuDrawerOpen(false);
  };

  const formSubtotal = formData.items.reduce((acc, it) => acc + (it.total || it.quantity * it.unitPrice), 0);
  const formTotal = Math.max(0, formSubtotal - formData.discount);
  const formRemaining = Math.max(0, formTotal - formData.advancePaid);
  const computedPaymentStatus: PaymentStatus = formData.advancePaid >= formTotal && formTotal > 0 ? 'Paid' : 'Pending';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let activeClientId = formData.clientId, activeClientName = formData.clientName, activeClientPhone = formData.clientPhone, activeClientWhatsApp = formData.clientWhatsApp, activeClientEmail = formData.clientEmail;
    if (clientMode === 'new' && newClientData.fullName.trim()) {
      try {
        const payload = { fullName: newClientData.fullName.trim(), phone: newClientData.phone.trim() || '+92 300 0000000', whatsApp: newClientData.whatsApp.trim() || newClientData.phone.trim() || '+92 300 0000000', email: newClientData.email.trim(), billingAddress: '' };
        const created = onCreateClient ? await onCreateClient(payload) : await clientService.createClient(payload);
        setClients((prev) => [created, ...prev]); activeClientId = created.id; activeClientName = created.fullName; activeClientPhone = created.phone; activeClientWhatsApp = created.whatsApp; activeClientEmail = created.email;
      } catch (err) { console.error('Error saving new client:', err); }
    }
    if (!activeClientName.trim()) { alert('Please select or add a client for this invoice.'); return; }
    const payload = { ...formData, clientId: activeClientId, clientName: activeClientName, clientPhone: activeClientPhone, clientWhatsApp: activeClientWhatsApp, clientEmail: activeClientEmail, billingAddress: '', eventTime: '', issueDate: formData.issueDate || today(), tax: 0, subtotal: formSubtotal, totalAmount: formTotal, remainingBalance: formRemaining, paymentStatus: computedPaymentStatus };
    if (editingInvoice) await onUpdateInvoice(editingInvoice.id, payload); else await onCreateInvoice(payload);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => { if (window.confirm('Are you sure you want to delete this invoice?')) await onDeleteInvoice(id); };
  const handleDuplicate = async (id: string) => { const dup = await onDuplicateInvoice(id); onPreviewInvoice(dup); };
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q) || (inv.venue || '').toLowerCase().includes(q) || (inv.eventType || '').toLowerCase().includes(q);
    return matchesSearch && (statusFilter === 'All' || inv.paymentStatus === statusFilter);
  });
  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.advancePaid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.remainingBalance || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Invoices</h1><p className="text-slate-500 text-sm mt-0.5">Create independent invoices, manage payments, customize headers, and export PDF confirmations</p></div><button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-sm font-semibold shadow-xl shadow-slate-200 transition-all"><Plus className="w-4 h-4" /><span>New Invoice</span></button></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="glass-card stat-card p-5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Invoiced</span><p className="text-2xl font-bold text-[#0f172a] mt-1">{formatMoney(totalInvoiced)}</p><p className="text-[11px] text-slate-400 mt-1">{invoices.length} invoices issued</p></div><div className="glass-card stat-card p-5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Collected Payments</span><p className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(totalCollected)}</p><p className="text-[11px] text-slate-400 mt-1">Settled &amp; paid balances</p></div><div className="glass-card stat-card p-5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Outstanding Balance</span><p className="text-2xl font-bold text-rose-600 mt-1">{formatMoney(totalOutstanding)}</p><p className="text-[11px] text-slate-400 mt-1">Pending client payments</p></div></div>
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"><div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Search by invoice #, client name, venue, event type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 text-xs font-semibold bg-white/60 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Pending">Pending</option></select></div>
      {filteredInvoices.length === 0 ? <EmptyState title="No invoices found" description="Create your first invoice directly from New Invoice." icon={FileText} actionLabel="New Invoice" onAction={openCreateModal} /> : <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left border-collapse text-sm"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100"><tr><th className="py-3 px-4 font-bold">Invoice #</th><th className="py-3 px-4 font-bold">Client & Event</th><th className="py-3 px-4 font-bold">Issue / Due Date</th><th className="py-3 px-4 font-bold text-right">Total</th><th className="py-3 px-4 font-bold text-right">Advance Paid</th><th className="py-3 px-4 font-bold text-right">Remaining</th><th className="py-3 px-4 font-bold text-center">Status</th><th className="py-3 px-4 font-bold text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredInvoices.map((inv) => <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors group"><td className="py-3 px-4 font-mono font-bold text-slate-900"><button onClick={() => onPreviewInvoice(inv)} className="hover:underline text-[#0f172a] text-left">{inv.invoiceNumber}</button><span className="block text-[11px] font-sans font-normal text-slate-400">BOOKING CONFIRMATION</span></td><td className="py-3 px-4"><p className="font-semibold text-slate-900">{inv.clientName}</p><p className="text-xs text-slate-500">{inv.eventType} {inv.venue ? `• ${inv.venue}` : ''}</p></td><td className="py-3 px-4 text-xs text-slate-600"><p>Issued: {inv.issueDate}</p>{inv.dueDate && <p className="text-slate-400">Due: {inv.dueDate}</p>}</td><td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{formatMoney(inv.totalAmount)}</td><td className="py-3 px-4 text-right font-medium text-emerald-600 font-mono">{formatMoney(inv.advancePaid)}</td><td className="py-3 px-4 text-right font-medium text-rose-600 font-mono">{formatMoney(inv.remainingBalance)}</td><td className="py-3 px-4 text-center"><StatusBadge status={inv.paymentStatus} /></td><td className="py-3 px-4 text-right"><div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100"><button type="button" onClick={() => onPreviewInvoice(inv)} title="View / Print A4" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"><Eye className="w-4 h-4" /></button><button type="button" onClick={() => openEditModal(inv)} title="Edit Invoice" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"><Edit2 className="w-4 h-4" /></button><button type="button" onClick={() => handleDuplicate(inv.id)} title="Duplicate Invoice" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"><Copy className="w-4 h-4" /></button><button type="button" onClick={() => handleDelete(inv.id)} title="Delete Invoice" className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></div>}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingInvoice ? `Edit Invoice #${editingInvoice.invoiceNumber}` : 'New Invoice'} subtitle="Create independent invoices, choose or add clients directly, customize headers and line items" maxWidth="4xl">
        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-700" /><span className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Client Details</span></div><div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs"><button type="button" onClick={() => setClientMode('existing')} className={`px-3 py-1 rounded-md font-semibold transition-all ${clientMode === 'existing' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Select Existing Client</button><button type="button" onClick={() => setClientMode('new')} className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${clientMode === 'new' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}><UserPlus className="w-3.5 h-3.5" /><span>+ Add New Client</span></button></div></div>{clientCreatedSuccess && <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{clientCreatedSuccess}</span></div>}{clientMode === 'existing' ? <div className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Choose Client</label><select value={formData.clientId} onChange={(e) => handleSelectClient(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><option value="">Select a client...</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}</select></div><div className="flex items-end"><button type="button" onClick={() => setClientMode('new')} className="w-full px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-slate-800 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"><UserPlus className="w-3.5 h-3.5" /><span>Create New Client</span></button></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs"><div><label className="block font-medium text-slate-500 mb-0.5">Phone Number</label><input type="text" value={formData.clientPhone} onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })} placeholder="+92 300 0000000" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs" /></div><div><label className="block font-medium text-slate-500 mb-0.5">WhatsApp</label><input type="text" value={formData.clientWhatsApp} onChange={(e) => setFormData({ ...formData, clientWhatsApp: e.target.value })} placeholder="+92 300 0000000" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs" /></div><div><label className="block font-medium text-slate-500 mb-0.5">Email Address (Optional)</label><input type="email" value={formData.clientEmail} onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })} placeholder="client@example.com" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs" /></div></div></div> : <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-900">Create New Client (Saved directly into client directory)</span><span className="text-[11px] text-slate-500">No booking required to register client</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Client Name <span className="text-rose-500">*</span></label><input type="text" required placeholder="Full Name" value={newClientData.fullName} onChange={(e) => setNewClientData({ ...newClientData, fullName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label><input type="text" placeholder="+92 300 0000000" value={newClientData.phone} onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">WhatsApp Number</label><input type="text" placeholder="+92 300 0000000" value={newClientData.whatsApp} onChange={(e) => setNewClientData({ ...newClientData, whatsApp: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email Address (Optional)</label><input type="email" placeholder="client@example.com" value={newClientData.email} onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div></div><div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><button type="button" onClick={handleQuickCreateClient} className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /><span>Save &amp; Attach Client</span></button></div></div>}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90"><div className="sm:col-span-2"><span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">2. Invoice Details</span></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Issue Date</label><input type="date" value={formData.issueDate || today()} readOnly className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm cursor-not-allowed" /><p className="text-[10px] text-slate-400 mt-1">Automatically set to the invoice creation date.</p></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Due Date</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" /></div></div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90"><div className="sm:col-span-3"><span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">3. Event Details</span></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Event Type</label><select value={formData.eventType} onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"><option value="">Select event type...</option>{EVENT_TYPE_OPTIONS.map((et) => <option key={et} value={et}>{et}</option>)}</select></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Event Date</label><input type="date" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" /></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Venue / Location (Optional)</label><input type="text" value={formData.venue} placeholder="e.g. Grand Marquee Hall" onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" /></div></div>

          <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-800 uppercase tracking-wider">4. Line Items / Services</label><div className="flex items-center gap-2"><button type="button" onClick={openMenuDrawer} className="text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"><UtensilsCrossed className="w-3.5 h-3.5" /><span>Menu</span></button><button type="button" onClick={addItem} className="text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /><span>Add Item</span></button></div></div><div className="space-y-2">{formData.items.map((item, idx) => <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80"><div className="col-span-6"><input type="text" placeholder="Service / item description..." value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white" required /></div><div className="col-span-2"><input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" required /></div><div className="col-span-2"><input type="number" min="0" placeholder="Price" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-right bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" required /></div><div className="col-span-1 text-right text-xs font-bold font-mono text-slate-800">{formatMoney(item.total || item.quantity * item.unitPrice)}</div><div className="col-span-1 text-right"><button type="button" onClick={() => removeItem(idx)} disabled={formData.items.length <= 1} className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}</div></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200"><div className="space-y-4"><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Terms &amp; Conditions</label><textarea rows={4} value={formData.termsAndConditions} onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white" /></div><div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Private Notes / Remarks (Optional)</label><textarea rows={2} value={formData.notes} placeholder="Optional internal remarks..." onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white" /></div></div><div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs"><span className="font-bold text-slate-800 uppercase tracking-wider block text-xs border-b border-slate-200 pb-1.5">Financial Summary &amp; Payment Status</span><div className="flex justify-between text-slate-600"><span>Subtotal:</span><span className="font-semibold font-mono">{formatMoney(formSubtotal)}</span></div><div className="flex items-center justify-between gap-2"><span className="text-slate-600">Discount:</span><input type="number" min="0" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })} className="w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right text-xs font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></div><div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm"><span>Total Amount:</span><span className="font-mono text-base">{formatMoney(formTotal)}</span></div><div className="flex items-center justify-between gap-2 pt-1"><span className="text-slate-700 font-semibold">Advance Paid:</span><input type="number" min="0" value={formData.advancePaid} onChange={(e) => setFormData({ ...formData, advancePaid: Number(e.target.value) })} className="w-32 px-2 py-1 rounded-lg border border-slate-200 bg-white text-right text-xs font-mono font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></div><div className="flex justify-between font-bold text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-100"><span>Remaining Balance:</span><span className="font-mono">{formatMoney(formRemaining)}</span></div><div className="pt-2 border-t border-slate-200 flex items-center justify-between"><span className="text-xs text-slate-500 font-medium">Computed Payment Status:</span><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${computedPaymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>{computedPaymentStatus === 'Paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}<span>{computedPaymentStatus}</span></span></div><p className="text-[10px] text-slate-400">Rule: If Advance Paid == Total Amount → <strong>Paid</strong>. If Advance Paid &lt; Total Amount → <strong>Pending</strong>.</p></div></div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs">{editingInvoice ? 'Update Invoice' : 'Create & Save Invoice'}</button></div>
        </form>
      </Modal>

      {isMenuDrawerOpen && <>
        <div className="fixed inset-0 z-[110] bg-slate-900/25 backdrop-blur-[1px]" onClick={() => setIsMenuDrawerOpen(false)} />
        <aside className="fixed right-0 top-0 z-[120] h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-200"><div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UtensilsCrossed className="w-5 h-5" />Select Menu</h2><p className="text-xs text-slate-500 mt-1">Choose a menu and enter the number of guests.</p></div><button type="button" onClick={() => setIsMenuDrawerOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button></div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">{menus.length === 0 ? <div className="text-center py-12"><UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 mb-3" /><p className="font-semibold text-slate-700">No menus found</p><p className="text-xs text-slate-400 mt-1">Add menus first from the Menus section.</p></div> : menus.map((menu) => { const active = selectedMenu?.id === menu.id; return <button key={menu.id} type="button" onClick={() => setSelectedMenu(menu)} className={`w-full text-left p-4 rounded-xl border transition-all ${active ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{menu.name}</p>{menu.description && <p className="text-xs text-slate-500 mt-1">{menu.description}</p>}</div><span className="font-bold text-slate-900 whitespace-nowrap">{menu.price != null ? formatMoney(menu.price) : 'Price not set'}</span></div></button>; })}</div>
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4"><div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Number of Guests</label><input type="number" min="1" value={menuGuests} onChange={(e) => setMenuGuests(Math.max(1, Number(e.target.value || 1)))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold" /></div>{selectedMenu && <div className="rounded-xl bg-white border border-slate-200 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold text-slate-700">{selectedMenu.name}</span><span className="font-mono font-bold">{formatMoney(Number(selectedMenu.price || 0))} / guest</span></div><div className="flex justify-between mt-2 pt-2 border-t border-slate-100"><span className="text-slate-500">{menuGuests} guests × {formatMoney(Number(selectedMenu.price || 0))}</span><span className="font-bold text-slate-900">{formatMoney(menuGuests * Number(selectedMenu.price || 0))}</span></div></div>}<button type="button" disabled={!selectedMenu || Number(selectedMenu.price || 0) <= 0} onClick={addSelectedMenuToInvoice} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold">Add Menu to Invoice</button></div>
        </aside>
      </>}
    </div>
  );
};

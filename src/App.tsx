import React, { useState, useEffect } from 'react';
import { NavTab, BusinessProfile, InvoiceSettings, Booking, Client, Vendor, Invoice, BookingVendor } from './types';
import { initialBusinessProfile, initialInvoiceSettings } from './services/mockData';
import { businessService } from './services/businessService';
import { bookingService } from './services/bookingService';
import { clientService } from './services/clientService';
import { vendorService } from './services/vendorService';
import { invoiceService } from './services/invoiceService';
import { createInvoiceWithBooking, backfillBookingsFromInvoices, createBookingForInvoice } from './services/invoiceBookingService';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { BookingsView } from './components/bookings/BookingsView';
import { CalendarView } from './components/calendar/CalendarView';
import { ClientsView } from './components/clients/ClientsView';
import { VendorsView } from './components/vendors/VendorsView';
import { MenusView } from './components/menus/MenusView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { InvoicePreviewView } from './components/invoices/InvoicePreviewView';
import { SettingsView } from './components/settings/SettingsView';
import { FinanceView } from './components/finance/FinanceView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const VENDOR_PAYMENT_KEY = 'together-events-vendor-payments-v1';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>(initialBusinessProfile);
  const [settings, setSettings] = useState<InvoiceSettings>(initialInvoiceSettings);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  const syncLegacyVendorPayments = async (freshBookings: Booking[], freshInvoices: Invoice[]) => {
    try {
      const raw = localStorage.getItem(VENDOR_PAYMENT_KEY);
      if (!raw) return freshBookings;
      const payments = JSON.parse(raw);
      if (!Array.isArray(payments) || !payments.length) return freshBookings;
      let result = [...freshBookings];
      const grouped = new Map<string, any>();
      for (const p of payments) {
        const key = `${p.invoiceId || ''}|${String(p.vendorId || '')}`;
        const current = grouped.get(key) || { ...p, amount: 0 };
        current.amount += Number(p.amount || 0);
        if (!current.date && p.date) current.date = p.date;
        if (!current.method && p.method) current.method = p.method;
        if (!current.notes && p.notes) current.notes = p.notes;
        if (!current.totalAmount && p.totalAmount) current.totalAmount = Number(p.totalAmount);
        grouped.set(key, current);
      }
      for (const p of grouped.values()) {
        const invoice = freshInvoices.find(i => i.id === p.invoiceId);
        const bookingId = invoice?.bookingId;
        if (!bookingId) continue;
        const booking = result.find(b => b.id === bookingId);
        if (!booking) continue;
        const vendorId = String(p.vendorId || '');
        if (!vendorId) continue;
        const existing = booking.assignedVendors?.find(v => v.vendorId === vendorId);
        const agreedAmount = Math.max(Number(existing?.agreedAmount || 0), Number(p.totalAmount || 0), Number(invoice?.totalAmount || 0));
        const paidAmount = Math.min(agreedAmount, Number(p.amount || 0));
        const updatedVendor: BookingVendor = existing
          ? { ...existing, agreedAmount, paidAmount, paymentStatus: paidAmount >= agreedAmount && agreedAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending', paymentDate: p.date || existing.paymentDate, paymentMethod: p.method || existing.paymentMethod, paymentNotes: p.notes || existing.paymentNotes }
          : { id: `legacy-bv-${booking.id}-${vendorId}`, vendorId, vendorName: '', category: 'Other', agreedAmount, paidAmount, paymentStatus: paidAmount >= agreedAmount && agreedAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending', paymentDate: p.date, paymentMethod: p.method, paymentNotes: p.notes };
        const nextAssignments = existing ? (booking.assignedVendors || []).map(v => v.vendorId === vendorId ? updatedVendor : v) : [...(booking.assignedVendors || []), updatedVendor];
        const updated = await bookingService.updateBooking(booking.id, { assignedVendors: nextAssignments });
        result = result.map(b => b.id === updated.id ? updated : b);
      }
      return result;
    } catch (error) {
      console.warn('Vendor payment migration skipped:', error);
      return freshBookings;
    }
  };

  const refreshAll = async () => {
    const results = await Promise.allSettled([
      businessService.getProfile(),
      businessService.getInvoiceSettings(),
      bookingService.getBookings(),
      clientService.getClients(),
      vendorService.getVendors(),
      invoiceService.getInvoices(),
    ]);
    const [p, s, b, c, v, i] = results;
    if (p.status === 'fulfilled') setProfile(p.value || initialBusinessProfile);
    if (s.status === 'fulfilled') setSettings(s.value || initialInvoiceSettings);
    let freshBookings = b.status === 'fulfilled' && Array.isArray(b.value) ? b.value : [];
    const freshInvoices = i.status === 'fulfilled' && Array.isArray(i.value) ? i.value : [];
    if (freshInvoices.length) freshBookings = await backfillBookingsFromInvoices(freshInvoices, freshBookings);
    if (freshBookings.length && freshInvoices.length) freshBookings = await syncLegacyVendorPayments(freshBookings, freshInvoices);
    setBookings(freshBookings);
    if (c.status === 'fulfilled') setClients(Array.isArray(c.value) ? c.value : []);
    if (v.status === 'fulfilled') setVendors(Array.isArray(v.value) ? v.value : []);
    setInvoices(freshInvoices);
  };

  useEffect(() => { void refreshAll(); }, []);

  const refreshBookings = async (created?: Booking) => {
    try {
      const fresh = await bookingService.getBookings();
      setBookings(current => {
        if (!created) return fresh;
        const found = fresh.some(b => b.id === created.id);
        return found ? fresh : [created, ...fresh];
      });
      return fresh.length || created ? (fresh.some(b => b.id === created?.id) ? fresh : [created, ...fresh]) : null;
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      if (created) {
        setBookings(current => current.some(b => b.id === created.id) ? current : [created, ...current]);
        return [created, ...bookings];
      }
      return null;
    }
  };

  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => { const updated = await bookingService.updateBooking(id, updates); await refreshBookings(updated); return updated; };
  const handleDeleteBooking = async (id: string) => { const result = await bookingService.deleteBooking(id); setBookings(current => current.filter(b => b.id !== id)); return result; };
  const handleAssignVendor = async (bookingId: string, vendorData: any) => { const updated = await bookingService.assignVendor(bookingId, vendorData); await refreshBookings(updated); return updated; };
  const handleRemoveVendor = async (bookingId: string, bookingVendorId: string) => { const updated = await bookingService.removeAssignedVendor(bookingId, bookingVendorId); await refreshBookings(updated); return updated; };
  const handleCreateClient = async (data: Omit<Client, 'id' | 'createdAt'>) => { const created = await clientService.createClient(data); setClients(await clientService.getClients()); return created; };
  const handleUpdateClient = async (id: string, updates: Partial<Client>) => { const updated = await clientService.updateClient(id, updates); setClients(await clientService.getClients()); return updated; };
  const handleDeleteClient = async (id: string) => { const result = await clientService.deleteClient(id); setClients(await clientService.getClients()); return result; };
  const handleCreateVendor = async (data: Omit<Vendor, 'id' | 'createdAt'>) => { const created = await vendorService.createVendor(data); setVendors(await vendorService.getVendors()); return created; };
  const handleUpdateVendor = async (id: string, updates: Partial<Vendor>) => { const updated = await vendorService.updateVendor(id, updates); setVendors(await vendorService.getVendors()); return updated; };
  const handleDeleteVendor = async (id: string) => { const result = await vendorService.deleteVendor(id); setVendors(await vendorService.getVendors()); return result; };

  const handleCreateInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    try {
      const { invoice: created, booking } = await createInvoiceWithBooking(invoiceData);
      await refreshBookings(booking || undefined);
      setInvoices(current => { const exists = current.some(inv => inv.id === created.id); return exists ? current.map(inv => inv.id === created.id ? created : inv) : [created, ...current]; });
      return created;
    } catch (error) {
      console.error('Invoice save failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Invoice could not be saved. Please try again.');
    }
  };

  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const current = invoices.find(inv => inv.id === id) || await invoiceService.getInvoiceById(id);
    const updated = await invoiceService.updateInvoice(id, updates);
    let linkedBooking: Booking | null = null;
    if (current?.bookingId) {
      const bookingUpdates: Partial<Booking> = {};
      if (updates.clientId !== undefined) bookingUpdates.clientId = updates.clientId;
      if (updates.clientName !== undefined) bookingUpdates.clientName = updates.clientName;
      if (updates.eventType !== undefined) bookingUpdates.eventType = updated.eventType;
      if (updates.eventDate !== undefined) bookingUpdates.eventDate = updated.eventDate;
      if (updates.eventTime !== undefined) bookingUpdates.eventTime = updates.eventTime || '';
      if (updates.venue !== undefined) bookingUpdates.venue = updates.venue || '';
      if (updates.totalAmount !== undefined) bookingUpdates.totalAmount = Number(updated.totalAmount || 0);
      if (updates.advancePaid !== undefined) bookingUpdates.advancePaid = Number(updated.advancePaid || 0);
      if (updates.notes !== undefined) bookingUpdates.notes = updates.notes || '';
      if (Object.keys(bookingUpdates).length) linkedBooking = await handleUpdateBooking(current.bookingId, bookingUpdates);
      else linkedBooking = await bookingService.getBookingById(current.bookingId);
    } else {
      linkedBooking = await createBookingForInvoice(updated);
    }
    if (linkedBooking) await refreshBookings(linkedBooking);
    else await refreshBookings();
    setInvoices(inv => inv.some(item => item.id === updated.id) ? inv.map(item => item.id === updated.id ? updated : item) : [updated, ...inv]);
    return updated;
  };

  const handleDeleteInvoice = async (id: string) => {
    const current = invoices.find(inv => inv.id === id) || await invoiceService.getInvoiceById(id);
    const result = await invoiceService.deleteInvoice(id);
    if (current?.bookingId) {
      try { await bookingService.deleteBooking(current.bookingId); } catch (error) { console.error('Failed to delete linked booking:', error); }
      setBookings(currentBookings => currentBookings.filter(b => b.id !== current.bookingId));
    }
    setInvoices(await invoiceService.getInvoices());
    if (previewInvoice?.id === id) setPreviewInvoice(null);
    return result;
  };

  const handleDuplicateInvoice = async (id: string) => { const duplicate = await invoiceService.duplicateInvoice(id); setInvoices(await invoiceService.getInvoices()); return duplicate; };
  const handleSaveProfile = async (data: BusinessProfile) => { const saved = await businessService.saveProfile({ ...data, defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ' }); setProfile(saved); return saved; };
  const handleSaveSettings = async (data: InvoiceSettings) => { const saved = await businessService.saveInvoiceSettings(data); setSettings(saved); return saved; };
  const handleSaveLogo = async (logoUrl: string) => { await handleSaveProfile({ ...profile, logoUrl }); };
  const handleTabChange = (tab: NavTab) => { setCurrentTab(tab); setPreviewInvoice(null); };
  const handleSelectBooking = (booking: Booking) => { setSelectedBookingForDetail(booking); setCurrentTab('bookings'); setPreviewInvoice(null); };

  return <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#d4e1ec] via-[#e3ecf3] to-[#c8d8e5] flex text-slate-800 antialiased font-sans">
    <Sidebar currentTab={currentTab} onTabChange={handleTabChange} onSelectTab={handleTabChange} profile={profile} isMobileOpen={isMobileSidebarOpen} isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <Header profile={profile} onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} onNewInvoice={() => handleTabChange('invoices')} onSaveLogo={handleSaveLogo} />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full"><div className="max-w-[1560px] mx-auto w-full"><ErrorBoundary>
        {previewInvoice ? <InvoicePreviewView invoice={previewInvoice} profile={profile} settings={settings} onBack={() => setPreviewInvoice(null)} onUpdateSettings={async updated => { await handleSaveSettings({ ...settings, ...updated }); }} /> : <>
          {currentTab === 'dashboard' && <DashboardView profile={profile} bookings={bookings} clients={clients} invoices={invoices} onNavigate={handleTabChange} onSelectBooking={handleSelectBooking} />}
          {currentTab === 'bookings' && <BookingsView bookings={bookings} clients={clients} vendors={vendors} profile={profile} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} onAssignVendor={handleAssignVendor} onRemoveVendor={handleRemoveVendor} selectedBookingForDetail={selectedBookingForDetail} onCloseDetail={() => setSelectedBookingForDetail(null)} />}
          {currentTab === 'calendar' && <CalendarView bookings={bookings} profile={profile} onSelectBooking={handleSelectBooking} onNewBooking={() => handleTabChange('invoices')} />}
          {currentTab === 'clients' && <ClientsView clients={clients} bookings={bookings} profile={profile} onCreateClient={handleCreateClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient} onSelectBooking={handleSelectBooking} />}
          {currentTab === 'vendors' && <VendorsView vendors={vendors} bookings={bookings} invoices={invoices} profile={profile} onCreateVendor={handleCreateVendor} onUpdateVendor={handleUpdateVendor} onDeleteVendor={handleDeleteVendor} onSelectBooking={handleSelectBooking} onUpdateBooking={handleUpdateBooking} />}
          {currentTab === 'menus' && <MenusView profile={profile} />}
          {currentTab === 'invoices' && <InvoicesView invoices={invoices} clients={clients} bookings={bookings} profile={profile} settings={settings} onCreateInvoice={handleCreateInvoice} onUpdateInvoice={handleUpdateInvoice} onDeleteInvoice={handleDeleteInvoice} onDuplicateInvoice={handleDuplicateInvoice} onPreviewInvoice={inv => setPreviewInvoice(inv)} onCreateClient={handleCreateClient} />}
          {currentTab === 'finance' && <FinanceView profile={profile} bookings={bookings} invoices={invoices} onUpdateBooking={handleUpdateBooking} />}
          {currentTab === 'settings-invoice' && <SettingsView profile={profile} settings={settings} initialTab="invoice" onSaveProfile={handleSaveProfile} onSaveSettings={handleSaveSettings} />}
          {(currentTab === 'settings-profile' || ((currentTab as string) === 'settings')) && <SettingsView profile={profile} settings={settings} initialTab="profile" onSaveProfile={handleSaveProfile} onSaveSettings={handleSaveSettings} />}
        </>}
      </ErrorBoundary></div></main>
    </div>
  </div>;
}

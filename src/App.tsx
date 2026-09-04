import React, { useState, useEffect } from 'react';
import {
  NavTab,
  BusinessProfile,
  InvoiceSettings,
  Booking,
  Client,
  Vendor,
  Invoice
} from './types';
import {
  initialBusinessProfile,
  initialInvoiceSettings,
} from './services/mockData';
import { businessService } from './services/businessService';
import { bookingService } from './services/bookingService';
import { clientService } from './services/clientService';
import { vendorService } from './services/vendorService';
import { invoiceService } from './services/invoiceService';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { BookingsView } from './components/bookings/BookingsView';
import { CalendarView } from './components/calendar/CalendarView';
import { ClientsView } from './components/clients/ClientsView';
import { VendorsView } from './components/vendors/VendorsView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { InvoicePreviewView } from './components/invoices/InvoicePreviewView';
import { SettingsView } from './components/settings/SettingsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
    if (p.status === 'fulfilled') setProfile(p.value || initialBusinessProfile); else console.error('Error loading business profile:', p.reason);
    if (s.status === 'fulfilled') setSettings(s.value || initialInvoiceSettings); else console.error('Error loading invoice settings:', s.reason);
    if (b.status === 'fulfilled') setBookings(Array.isArray(b.value) ? b.value : []); else console.error('Error loading bookings:', b.reason);
    if (c.status === 'fulfilled') setClients(Array.isArray(c.value) ? c.value : []); else console.error('Error loading clients:', c.reason);
    if (v.status === 'fulfilled') setVendors(Array.isArray(v.value) ? v.value : []); else console.error('Error loading vendors:', v.reason);
    if (i.status === 'fulfilled') setInvoices(Array.isArray(i.value) ? i.value : []); else console.error('Error loading invoices:', i.reason);
  };

  useEffect(() => { refreshAll(); }, []);

  const handleCreateBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'remainingAmount'>) => {
    const created = await bookingService.createBooking(bookingData);
    setBookings(await bookingService.getBookings());
    return created;
  };
  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    const updated = await bookingService.updateBooking(id, updates);
    setBookings(await bookingService.getBookings());
    return updated;
  };
  const handleDeleteBooking = async (id: string) => {
    const res = await bookingService.deleteBooking(id);
    setBookings(await bookingService.getBookings());
    return res;
  };
  const handleAssignVendor = async (bookingId: string, vendorData: any) => {
    const updated = await bookingService.assignVendor(bookingId, vendorData);
    setBookings(await bookingService.getBookings());
    return updated;
  };
  const handleRemoveVendor = async (bookingId: string, bookingVendorId: string) => {
    const updated = await bookingService.removeAssignedVendor(bookingId, bookingVendorId);
    setBookings(await bookingService.getBookings());
    return updated;
  };
  const handleCreateInvoiceFromBooking = async (bookingId: string) => {
    const createdInvoice = await invoiceService.createInvoiceFromBooking(bookingId);
    setInvoices(await invoiceService.getInvoices());
    setPreviewInvoice(createdInvoice);
  };

  const handleCreateClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const created = await clientService.createClient(clientData);
    setClients(await clientService.getClients());
    return created;
  };
  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    const updated = await clientService.updateClient(id, updates);
    setClients(await clientService.getClients());
    return updated;
  };
  const handleDeleteClient = async (id: string) => {
    const res = await clientService.deleteClient(id);
    setClients(await clientService.getClients());
    return res;
  };

  const handleCreateVendor = async (vendorData: Omit<Vendor, 'id' | 'createdAt'>) => {
    const created = await vendorService.createVendor(vendorData);
    setVendors(await vendorService.getVendors());
    return created;
  };
  const handleUpdateVendor = async (id: string, updates: Partial<Vendor>) => {
    const updated = await vendorService.updateVendor(id, updates);
    setVendors(await vendorService.getVendors());
    return updated;
  };
  const handleDeleteVendor = async (id: string) => {
    const res = await vendorService.deleteVendor(id);
    setVendors(await vendorService.getVendors());
    return res;
  };

  const handleCreateInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const created = await invoiceService.createInvoice(invoiceData);
    setInvoices(await invoiceService.getInvoices());
    return created;
  };
  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const updated = await invoiceService.updateInvoice(id, updates);
    setInvoices(await invoiceService.getInvoices());
    if (previewInvoice && previewInvoice.id === id) setPreviewInvoice(updated);
    return updated;
  };
  const handleDeleteInvoice = async (id: string) => {
    const res = await invoiceService.deleteInvoice(id);
    setInvoices(await invoiceService.getInvoices());
    if (previewInvoice?.id === id) setPreviewInvoice(null);
    return res;
  };
  const handleDuplicateInvoice = async (id: string) => {
    const dup = await invoiceService.duplicateInvoice(id);
    setInvoices(await invoiceService.getInvoices());
    return dup;
  };

  const handleSaveProfile = async (newProfile: BusinessProfile) => {
    const saved = await businessService.saveProfile(newProfile);
    setProfile(saved);
    return saved;
  };
  const handleSaveSettings = async (newSettings: InvoiceSettings) => {
    const saved = await businessService.saveInvoiceSettings(newSettings);
    setSettings(saved);
    return saved;
  };

  // Refresh live booking data whenever the user enters Dashboard, Bookings or Calendar.
  // This prevents a stale in-memory list from showing zero while the database has a booking.
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    setPreviewInvoice(null);
    if (tab === 'dashboard' || tab === 'bookings' || tab === 'calendar') {
      void refreshAll();
    }
  };

  const handleSelectBookingFromAnywhere = (booking: Booking) => {
    setSelectedBookingForDetail(booking);
    setCurrentTab('bookings');
    setPreviewInvoice(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#d4e1ec] via-[#e3ecf3] to-[#c8d8e5] flex text-slate-800 antialiased font-sans">
      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} onSelectTab={handleTabChange} profile={profile} isMobileOpen={isMobileSidebarOpen} isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header profile={profile} onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} onNewBooking={() => handleTabChange('bookings')} onNewInvoice={() => handleTabChange('invoices')} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div className="max-w-[1560px] mx-auto w-full">
            <ErrorBoundary>
              {previewInvoice ? (
                <InvoicePreviewView invoice={previewInvoice} profile={profile} settings={settings} onBack={() => setPreviewInvoice(null)} onUpdateSettings={async (updated) => { await handleSaveSettings({ ...settings, ...updated }); }} />
              ) : (
                <>
                  {currentTab === 'dashboard' && <DashboardView profile={profile} bookings={bookings} clients={clients} invoices={invoices} onNavigate={handleTabChange} onSelectBooking={handleSelectBookingFromAnywhere} />}
                  {currentTab === 'bookings' && <BookingsView bookings={bookings} clients={clients} vendors={vendors} profile={profile} onCreateBooking={handleCreateBooking} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} onAssignVendor={handleAssignVendor} onRemoveVendor={handleRemoveVendor} onCreateInvoiceFromBooking={handleCreateInvoiceFromBooking} selectedBookingForDetail={selectedBookingForDetail} onCloseDetail={() => setSelectedBookingForDetail(null)} />}
                  {currentTab === 'calendar' && <CalendarView bookings={bookings} profile={profile} onSelectBooking={handleSelectBookingFromAnywhere} onNewBooking={() => handleTabChange('bookings')} />}
                  {currentTab === 'clients' && <ClientsView clients={clients} bookings={bookings} invoices={invoices} profile={profile} onCreateClient={handleCreateClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient} onSelectBooking={handleSelectBookingFromAnywhere} onSelectInvoice={(inv) => setPreviewInvoice(inv)} onNewBookingForClient={() => handleTabChange('bookings')} onNewInvoiceForClient={() => handleTabChange('invoices')} />}
                  {currentTab === 'vendors' && <VendorsView vendors={vendors} bookings={bookings} profile={profile} onCreateVendor={handleCreateVendor} onUpdateVendor={handleUpdateVendor} onDeleteVendor={handleDeleteVendor} onSelectBooking={handleSelectBookingFromAnywhere} />}
                  {currentTab === 'invoices' && <InvoicesView invoices={invoices} clients={clients} bookings={bookings} profile={profile} settings={settings} onCreateInvoice={handleCreateInvoice} onUpdateInvoice={handleUpdateInvoice} onDeleteInvoice={handleDeleteInvoice} onDuplicateInvoice={handleDuplicateInvoice} onPreviewInvoice={(inv) => setPreviewInvoice(inv)} onCreateClient={handleCreateClient} />}
                  {(currentTab === 'settings-profile' || currentTab === 'settings-invoice' || (currentTab as string) === 'settings') && <SettingsView profile={profile} settings={settings} initialTab={currentTab === 'settings-invoice' ? 'invoice' : 'profile'} onSaveProfile={handleSaveProfile} onSaveSettings={handleSaveSettings} />}
                </>
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

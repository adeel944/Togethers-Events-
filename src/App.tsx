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
  initialBookings,
  initialClients,
  initialVendors,
  initialInvoices
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

  // Core Data Layer State
  const [profile, setProfile] = useState<BusinessProfile>(initialBusinessProfile);
  const [settings, setSettings] = useState<InvoiceSettings>(initialInvoiceSettings);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Deep Navigation / Modals State
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  // Sync state on mount and reload
  const refreshAll = async () => {
    try {
      const [p, s, b, c, v, i] = await Promise.all([
        businessService.getProfile(),
        businessService.getInvoiceSettings(),
        bookingService.getBookings(),
        clientService.getClients(),
        vendorService.getVendors(),
        invoiceService.getInvoices(),
      ]);
      setProfile(p || initialBusinessProfile);
      setSettings(s || initialInvoiceSettings);
      setBookings(Array.isArray(b) ? b : initialBookings);
      setClients(Array.isArray(c) ? c : initialClients);
      setVendors(Array.isArray(v) ? v : initialVendors);
      setInvoices(Array.isArray(i) ? i : initialInvoices);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Handlers for Bookings
  const handleCreateBooking = async (
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'remainingAmount'>
  ) => {
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

  // Convert Booking to Invoice Workflow
  const handleCreateInvoiceFromBooking = async (bookingId: string) => {
    const createdInvoice = await invoiceService.createInvoiceFromBooking(bookingId);
    setInvoices(await invoiceService.getInvoices());
    setPreviewInvoice(createdInvoice);
  };

  // Handlers for Clients
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

  // Handlers for Vendors
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

  // Handlers for Invoices
  const handleCreateInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const created = await invoiceService.createInvoice(invoiceData);
    setInvoices(await invoiceService.getInvoices());
    return created;
  };

  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const updated = await invoiceService.updateInvoice(id, updates);
    setInvoices(await invoiceService.getInvoices());
    if (previewInvoice && previewInvoice.id === id) {
      setPreviewInvoice(updated);
    }
    return updated;
  };

  const handleDeleteInvoice = async (id: string) => {
    const res = await invoiceService.deleteInvoice(id);
    setInvoices(await invoiceService.getInvoices());
    if (previewInvoice?.id === id) {
      setPreviewInvoice(null);
    }
    return res;
  };

  const handleDuplicateInvoice = async (id: string) => {
    const dup = await invoiceService.duplicateInvoice(id);
    setInvoices(await invoiceService.getInvoices());
    return dup;
  };

  // Handlers for Settings
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

  // Navigation callbacks
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    setPreviewInvoice(null);
  };

  const handleSelectBookingFromAnywhere = (booking: Booking) => {
    setSelectedBookingForDetail(booking);
    setCurrentTab('bookings');
    setPreviewInvoice(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#d4e1ec] via-[#e3ecf3] to-[#c8d8e5] flex text-slate-800 antialiased font-sans">
      {/* Sidebar - Dedicated Column in Desktop Flex, Drawer in Mobile */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSelectTab={handleTabChange}
        profile={profile}
        isMobileOpen={isMobileSidebarOpen}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Column (Header + Scrollable Views) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header Navigation - Sits cleanly within main content width */}
        <Header
          profile={profile}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNewBooking={() => {
            setCurrentTab('bookings');
            setPreviewInvoice(null);
          }}
          onNewInvoice={() => {
            setCurrentTab('invoices');
            setPreviewInvoice(null);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div className="max-w-[1560px] mx-auto w-full">
            <ErrorBoundary>
              {previewInvoice ? (
                /* Dedicated A4 Invoice Preview Screen */
                <InvoicePreviewView
                  invoice={previewInvoice}
                  profile={profile}
                  settings={settings}
                  onBack={() => setPreviewInvoice(null)}
                  onUpdateSettings={async (updated) => {
                    await handleSaveSettings({ ...settings, ...updated });
                  }}
                />
              ) : (
                <>
                  {currentTab === 'dashboard' && (
                    <DashboardView
                      profile={profile}
                      bookings={bookings}
                      clients={clients}
                      invoices={invoices}
                      onNavigate={handleTabChange}
                      onSelectBooking={handleSelectBookingFromAnywhere}
                    />
                  )}

                  {currentTab === 'bookings' && (
                    <BookingsView
                      bookings={bookings}
                      clients={clients}
                      vendors={vendors}
                      profile={profile}
                      onCreateBooking={handleCreateBooking}
                      onUpdateBooking={handleUpdateBooking}
                      onDeleteBooking={handleDeleteBooking}
                      onAssignVendor={handleAssignVendor}
                      onRemoveVendor={handleRemoveVendor}
                      onCreateInvoiceFromBooking={handleCreateInvoiceFromBooking}
                      selectedBookingForDetail={selectedBookingForDetail}
                      onCloseDetail={() => setSelectedBookingForDetail(null)}
                    />
                  )}

                  {currentTab === 'calendar' && (
                    <CalendarView
                      bookings={bookings}
                      profile={profile}
                      onSelectBooking={handleSelectBookingFromAnywhere}
                      onNewBooking={() => setCurrentTab('bookings')}
                    />
                  )}

                  {currentTab === 'clients' && (
                    <ClientsView
                      clients={clients}
                      bookings={bookings}
                      invoices={invoices}
                      profile={profile}
                      onCreateClient={handleCreateClient}
                      onUpdateClient={handleUpdateClient}
                      onDeleteClient={handleDeleteClient}
                      onSelectBooking={handleSelectBookingFromAnywhere}
                      onSelectInvoice={(inv) => setPreviewInvoice(inv)}
                      onNewBookingForClient={(client) => {
                        setCurrentTab('bookings');
                      }}
                      onNewInvoiceForClient={(client) => {
                        setCurrentTab('invoices');
                      }}
                    />
                  )}

                  {currentTab === 'vendors' && (
                    <VendorsView
                      vendors={vendors}
                      bookings={bookings}
                      profile={profile}
                      onCreateVendor={handleCreateVendor}
                      onUpdateVendor={handleUpdateVendor}
                      onDeleteVendor={handleDeleteVendor}
                      onSelectBooking={handleSelectBookingFromAnywhere}
                    />
                  )}

                  {currentTab === 'invoices' && (
                    <InvoicesView
                      invoices={invoices}
                      clients={clients}
                      bookings={bookings}
                      profile={profile}
                      settings={settings}
                      onCreateInvoice={handleCreateInvoice}
                      onUpdateInvoice={handleUpdateInvoice}
                      onDeleteInvoice={handleDeleteInvoice}
                      onDuplicateInvoice={handleDuplicateInvoice}
                      onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
                      onCreateClient={handleCreateClient}
                    />
                  )}

                  {(currentTab === 'settings-profile' ||
                    currentTab === 'settings-invoice' ||
                    (currentTab as string) === 'settings') && (
                    <SettingsView
                      profile={profile}
                      settings={settings}
                      initialTab={currentTab === 'settings-invoice' ? 'invoice' : 'profile'}
                      onSaveProfile={handleSaveProfile}
                      onSaveSettings={handleSaveSettings}
                    />
                  )}
                </>
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

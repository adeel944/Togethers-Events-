import React, { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  CalendarCheck2,
  Edit2,
  Trash2,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { Client, Booking, Invoice, BusinessProfile } from '../../types';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { initialBusinessProfile } from '../../services/mockData';

interface ClientsViewProps {
  clients?: Client[];
  bookings?: Booking[];
  invoices?: Invoice[];
  profile?: BusinessProfile;
  onCreateClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<Client>;
  onDeleteClient: (id: string) => Promise<boolean>;
  onSelectBooking: (booking: Booking) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onNewBookingForClient: (client: Client) => void;
  onNewInvoiceForClient: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients: inputClients = [],
  bookings: inputBookings = [],
  invoices: inputInvoices = [],
  profile: inputProfile,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onSelectBooking,
  onSelectInvoice,
  onNewBookingForClient,
  onNewInvoiceForClient,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const clients = Array.isArray(inputClients) ? inputClients : [];
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const invoices = Array.isArray(inputInvoices) ? inputInvoices : [];
  const formatMoney = (amount: number) =>
    `${profile.currencySymbol}${Number(amount || 0).toLocaleString()}`;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);

  // Modal form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsApp: '',
    email: '',
    billingAddress: '',
    city: '',
    country: 'Pakistan',
    notes: '',
  });

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      fullName: '',
      phone: '',
      whatsApp: '',
      email: '',
      billingAddress: '',
      city: '',
      country: 'Pakistan',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      fullName: client.fullName,
      phone: client.phone,
      whatsApp: client.whatsApp,
      email: client.email,
      billingAddress: client.billingAddress,
      city: client.city,
      country: client.country,
      notes: client.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      const updated = await onUpdateClient(editingClient.id, formData);
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient(updated);
      }
    } else {
      const created = await onCreateClient(formData);
      setSelectedClient(created);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      await onDeleteClient(id);
      if (selectedClient?.id === id) {
        setSelectedClient(clients.find((c) => c.id !== id) || null);
      }
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Metrics for selected client
  const clientBookings = selectedClient
    ? bookings.filter((b) => b.clientId === selectedClient.id)
    : [];
  const clientInvoices = selectedClient
    ? invoices.filter((i) => i.clientId === selectedClient.id)
    : [];

  const totalBilled = clientInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPaid = clientInvoices.reduce((acc, inv) => acc + (inv.advancePaid || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Client directory, booking histories, billing statements and balances
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-sm font-semibold shadow-xl shadow-slate-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Main Two-Column Layout (List on Left, Details on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Client List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients by name, phone, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <EmptyState
              title="No clients found"
              description="Add your client contact information to auto-populate invoices and event bookings."
              icon={Users}
              actionLabel="Add Client"
              onAction={openAddModal}
            />
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white/80 hover:bg-white border-slate-200/80 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm leading-tight">{client.fullName}</h3>
                        <p
                          className={`text-xs mt-1 ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {client.phone || client.email || 'No contact'}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {client.city || 'Pakistan'}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className={isSelected ? 'text-slate-300' : 'text-slate-400'}>
                        {[client.billingAddress].filter(Boolean).join(', ') || 'No address'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(client);
                          }}
                          className={`p-1 rounded ${
                            isSelected
                              ? 'text-slate-300 hover:text-white hover:bg-white/10'
                              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(client.id);
                          }}
                          className={`p-1 rounded ${
                            isSelected
                              ? 'text-rose-300 hover:text-rose-100 hover:bg-white/10'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Client Detailed Dossier (7 cols) */}
        <div className="lg:col-span-7">
          {selectedClient ? (
            <div className="space-y-6">
              {/* Client Profile Header Card */}
              <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-[#0f172a]">{selectedClient.fullName}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Client ID: <span className="font-mono">{selectedClient.id}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNewBookingForClient(selectedClient)}
                      className="px-3.5 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-semibold hover:bg-slate-800 shadow-md transition-all active:scale-95"
                    >
                      + New Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedClient)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedClient.phone || 'No Phone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedClient.email || 'No Email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {[selectedClient.city, selectedClient.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>

                {selectedClient.billingAddress && (
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <strong className="text-[#0f172a]">Billing Address: </strong>
                    {selectedClient.billingAddress}
                  </p>
                )}

                {selectedClient.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-[#0f172a] block mb-0.5">Preferences & Notes:</span>
                    {selectedClient.notes}
                  </div>
                )}
              </div>

              {/* Financial Balance Overview Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card stat-card p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Total Billed
                  </span>
                  <p className="text-lg font-bold text-[#0f172a] mt-1">{formatMoney(totalBilled)}</p>
                </div>
                <div className="glass-card stat-card p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Total Paid
                  </span>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{formatMoney(totalPaid)}</p>
                </div>
                <div className="glass-card stat-card p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Outstanding
                  </span>
                  <p className="text-lg font-bold text-orange-500 mt-1">
                    {formatMoney(outstandingBalance)}
                  </p>
                </div>
              </div>

              {/* Booking History for Client */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck2 className="w-4 h-4 text-slate-500" />
                    <span>Booking History ({clientBookings.length})</span>
                  </h3>
                </div>

                {clientBookings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No bookings recorded for this client yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 mt-2">
                    {clientBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => onSelectBooking(b)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 p-2 rounded-xl cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{b.eventType}</span>
                            <span className="text-xs text-slate-500">({b.eventDate})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{b.venue || 'Venue TBA'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 text-xs">{formatMoney(b.totalAmount)}</p>
                          <div className="mt-1">
                            <StatusBadge status={b.bookingStatus} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice History for Client */}
              <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Invoice History ({clientInvoices.length})</span>
                  </h3>
                </div>

                {clientInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No invoices issued to this client yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 mt-2">
                    {clientInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => onSelectInvoice(inv)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 p-2 rounded-xl cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            #{inv.invoiceNumber}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">{inv.issueDate}</span>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {inv.eventType} Event
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 text-xs">{formatMoney(inv.totalAmount)}</p>
                          <div className="mt-1">
                            <StatusBadge status={inv.paymentStatus} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm bg-white/60 rounded-2xl border border-slate-200/60">
              Select a client to inspect booking and billing records.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClient ? 'Edit Client Details' : 'Add New Client'}
        subtitle="Saved details will automatically populate invoices and bookings"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name / Couple Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah & Farhan Ahmed"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={formData.whatsApp}
                onChange={(e) => setFormData({ ...formData, whatsApp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="client@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Billing Address
            </label>
            <input
              type="text"
              placeholder="House #, Street, Sector"
              value={formData.billingAddress}
              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Lahore, Bahawalpur"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes & Preferences
            </label>
            <textarea
              rows={2}
              placeholder="Design themes, dietary guidelines, VIP family contacts..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs"
            >
              {editingClient ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

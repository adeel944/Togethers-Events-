import React, { useState } from 'react';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  CalendarCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { Vendor, VendorCategory, Booking, BusinessProfile } from '../../types';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { initialBusinessProfile } from '../../services/mockData';

interface VendorsViewProps {
  vendors?: Vendor[];
  bookings?: Booking[];
  profile?: BusinessProfile;
  onCreateVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => Promise<Vendor>;
  onUpdateVendor: (id: string, vendor: Partial<Vendor>) => Promise<Vendor>;
  onDeleteVendor: (id: string) => Promise<boolean>;
  onSelectBooking: (booking: Booking) => void;
}

const VENDOR_CATEGORIES: VendorCategory[] = [
  'Decorator',
  'Caterer',
  'Photographer',
  'Videographer',
  'Makeup Artist',
  'Mehndi Artist',
  'DJ / Sound',
  'Florist',
  'Venue',
  'Furniture',
  'Lighting',
  'Transport',
  'Other',
];

export const VendorsView: React.FC<VendorsViewProps> = ({
  vendors: inputVendors = [],
  bookings: inputBookings = [],
  profile: inputProfile,
  onCreateVendor,
  onUpdateVendor,
  onDeleteVendor,
  onSelectBooking,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const vendors = Array.isArray(inputVendors) ? inputVendors : [];
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(vendors[0] || null);

  // Modal form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    vendorName: '',
    category: 'Decorator' as VendorCategory,
    contactPerson: '',
    phone: '',
    whatsApp: '',
    email: '',
    address: '',
    services: '',
    paymentTerms: '',
    notes: '',
  });

  const openAddModal = () => {
    setEditingVendor(null);
    setFormData({
      vendorName: '',
      category: 'Decorator',
      contactPerson: '',
      phone: '',
      whatsApp: '',
      email: '',
      address: '',
      services: '',
      paymentTerms: '50% advance, 50% on event completion',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendorName: vendor.vendorName,
      category: vendor.category,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      whatsApp: vendor.whatsApp,
      email: vendor.email,
      address: vendor.address,
      services: vendor.services,
      paymentTerms: vendor.paymentTerms,
      notes: vendor.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      const updated = await onUpdateVendor(editingVendor.id, formData);
      if (selectedVendor?.id === editingVendor.id) {
        setSelectedVendor(updated);
      }
    } else {
      const created = await onCreateVendor(formData);
      setSelectedVendor(created);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      await onDeleteVendor(id);
      if (selectedVendor?.id === id) {
        setSelectedVendor(vendors.find((v) => v.id !== id) || null);
      }
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.services.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Find bookings this vendor is assigned to
  const assignedBookings = selectedVendor
    ? bookings.filter((b) =>
        b.assignedVendors.some((bv) => bv.vendorId === selectedVendor.id)
      )
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Vendors & Partners</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Caterers, decorators, cinematographers, sound artists and event suppliers
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-sm font-semibold shadow-xl shadow-slate-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendors by name, contact person, services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-white/60 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="All">All Categories</option>
          {VENDOR_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Two Column Layout: List (5) and Dossier (7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vendor Cards List */}
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto pr-1">
          {filteredVendors.length === 0 ? (
            <EmptyState
              title="No vendors found"
              description="Add vendors to your directory to assign them to bookings and track agreed payouts."
              icon={Building2}
              actionLabel="Add Vendor"
              onAction={openAddModal}
            />
          ) : (
            filteredVendors.map((vendor) => {
              const isSelected = selectedVendor?.id === vendor.id;
              return (
                <div
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white/80 hover:bg-white border-slate-200/80 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{vendor.vendorName}</h3>
                      <p
                        className={`text-xs mt-1 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Contact: {vendor.contactPerson || 'Direct'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {vendor.category}
                    </span>
                  </div>

                  <p
                    className={`text-xs mt-2 line-clamp-1 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {vendor.services || 'General Services'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                      {vendor.phone || vendor.email || 'No contact'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(vendor);
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
                          handleDelete(vendor.id);
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
            })
          )}
        </div>

        {/* Right Column: Selected Vendor Profile & Assigned Events */}
        <div className="lg:col-span-7">
          {selectedVendor ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#0f172a]">{selectedVendor.vendorName}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                        {selectedVendor.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Contact: <strong className="text-slate-700">{selectedVendor.contactPerson}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedVendor)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Vendor</span>
                  </button>
                </div>

                {/* Contact grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Phone: {selectedVendor.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Email: {selectedVendor.email || 'N/A'}</span>
                  </div>
                  {selectedVendor.whatsApp && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        WA
                      </span>
                      <span>WhatsApp: {selectedVendor.whatsApp}</span>
                    </div>
                  )}
                  {selectedVendor.address && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedVendor.address}</span>
                    </div>
                  )}
                </div>

                {/* Services & Payment terms */}
                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Offered Services:</span>
                    <p className="text-slate-600">{selectedVendor.services || 'Not listed'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Payment Terms:</span>
                    <p className="text-slate-600">{selectedVendor.paymentTerms || 'Standard'}</p>
                  </div>
                  {selectedVendor.notes && (
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Internal Notes:</span>
                      <p className="text-slate-500 italic">{selectedVendor.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bookings this vendor is assigned to */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-[#0f172a] pb-3 border-b border-slate-100 flex items-center gap-2">
                  <CalendarCheck2 className="w-4 h-4 text-slate-500" />
                  <span>Assigned Events ({assignedBookings.length})</span>
                </h3>

                {assignedBookings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    This vendor is not currently assigned to any scheduled event.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 mt-2">
                    {assignedBookings.map((b) => {
                      const assignment = b.assignedVendors.find(
                        (bv) => bv.vendorId === selectedVendor.id
                      );
                      return (
                        <div
                          key={b.id}
                          onClick={() => onSelectBooking(b)}
                          className="py-3 flex items-center justify-between hover:bg-slate-50/80 p-2 rounded-xl cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">
                                {b.clientName}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {b.eventType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {b.eventDate} • {b.venue || 'Venue TBA'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-900 text-xs">
                              {profile.currencySymbol}
                              {assignment?.agreedAmount?.toLocaleString() || 0}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {assignment?.paymentStatus || 'Pending'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm bg-white/60 rounded-2xl border border-slate-200/60">
              Select a vendor to view details and assigned event engagements.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingVendor ? 'Edit Vendor Information' : 'Add New Vendor'}
        subtitle="Catalog suppliers, caterers, photographers and contracted specialists"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Vendor / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Royal Flora & Decors"
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as VendorCategory })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="Manager / Lead"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone
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
                WhatsApp
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
              Email
            </label>
            <input
              type="email"
              placeholder="vendor@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Address / Studio Location
            </label>
            <input
              type="text"
              placeholder="Commercial area, City"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Services Offered
            </label>
            <input
              type="text"
              placeholder="e.g. Stage design, fresh flower centerpieces, drone filming"
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Terms
            </label>
            <input
              type="text"
              placeholder="e.g. 50% booking, 50% post-event"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="Reliability, crew quality, backup contacts..."
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
              {editingVendor ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

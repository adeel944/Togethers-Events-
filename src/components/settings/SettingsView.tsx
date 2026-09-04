import React, { useState, useEffect } from 'react';
import {
  Building,
  Sliders,
  Upload,
  Check,
  CreditCard,
  FileText,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BusinessProfile,
  InvoiceSettings,
  TextScale
} from '../../types';
import { initialBusinessProfile, initialInvoiceSettings } from '../../services/mockData';

interface SettingsViewProps {
  profile?: BusinessProfile;
  settings?: InvoiceSettings;
  initialTab?: 'profile' | 'invoice';
  onSaveProfile: (profile: BusinessProfile) => Promise<BusinessProfile>;
  onSaveSettings: (settings: InvoiceSettings) => Promise<InvoiceSettings>;
}

const CURRENCY_PRESETS = [
  { code: 'PKR', symbol: 'Rs ' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'AED', symbol: 'AED ' },
  { code: 'SAR', symbol: 'SAR ' },
  { code: 'INR', symbol: '₹' },
  { code: 'CAD', symbol: 'C$' },
];

const TEMPLATES = [
  { id: 'modern', label: '1. Modern' },
  { id: 'classic', label: '2. Classic' },
  { id: 'minimal', label: '3. Minimal' },
  { id: 'clean', label: '4. Clean' },
  { id: 'professional', label: '5. Professional' },
  { id: 'elegant', label: '6. Elegant' },
  { id: 'compact', label: '7. Compact' },
  { id: 'corporate', label: '8. Corporate' },
  { id: 'simple-lines', label: '9. Simple Lines' },
  { id: 'premium-minimal', label: '10. Premium Minimal' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  settings,
  initialTab,
  onSaveProfile,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'invoice'>(initialTab || 'profile');

  // Form states with fallback
  const [profileForm, setProfileForm] = useState<BusinessProfile>({
    ...initialBusinessProfile,
    ...(profile || {}),
  });
  const [settingsForm, setSettingsForm] = useState<InvoiceSettings>({
    ...initialInvoiceSettings,
    ...(settings || {}),
  });
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (profile) {
      setProfileForm((prev) => ({ ...initialBusinessProfile, ...prev, ...profile }));
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setSettingsForm((prev) => ({ ...initialInvoiceSettings, ...prev, ...settings }));
    }
  }, [settings]);

  const handleCurrencySelect = (code: string, symbol: string) => {
    setProfileForm({
      ...profileForm,
      currency: code,
      currencySymbol: symbol,
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveProfile(profileForm);
    setSaveSuccessMessage('Business profile saved successfully!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(settingsForm);
    setSaveSuccessMessage('Invoice styling preferences saved successfully!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({
          ...profileForm,
          logoUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({
          ...profileForm,
          signatureUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure your event firm profile, banking coordinates, and invoice styling defaults
          </p>
        </div>

        {saveSuccessMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoice')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoice'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Invoice Settings & Templates</span>
        </button>
      </div>

      {/* Business Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6 text-sm">
          {/* Core Business Identity */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Business Identity & Contact</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.businessName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, businessName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Owner / Contact Person
                </label>
                <input
                  type="text"
                  value={profileForm.ownerName}
                  onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={profileForm.whatsApp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsApp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Office / Studio Address
              </label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Currency Configuration */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Currency Settings</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURRENCY_PRESETS.map((cur) => {
                const isSelected =
                  profileForm.currency === cur.code &&
                  profileForm.currencySymbol === cur.symbol;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => handleCurrencySelect(cur.code, cur.symbol)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs">{cur.code}</span>
                    <span className="text-sm font-semibold">{cur.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank & Payment Details */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Bank Payment Instructions (Appears on Invoices)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={profileForm.bankDetails.bankName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      bankDetails: { ...profileForm.bankDetails, bankName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Account Title
                </label>
                <input
                  type="text"
                  value={profileForm.bankDetails.accountTitle}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      bankDetails: { ...profileForm.bankDetails, accountTitle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={profileForm.bankDetails.accountNumber}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      bankDetails: { ...profileForm.bankDetails, accountNumber: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  IBAN / Swift
                </label>
                <input
                  type="text"
                  value={profileForm.bankDetails.iban}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      bankDetails: { ...profileForm.bankDetails, iban: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Logo & Signature Uploads */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Brand Assets (Logo & Signature)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo Card */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {profileForm.logoUrl ? (
                    <img
                      src={profileForm.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                      No Logo
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">PNG, JPG or SVG (Transparent recommended)</p>
                  </div>
                </div>
              </div>

              {/* Signature Card */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Authorized Signature
                </label>
                <div className="flex items-center gap-4">
                  {profileForm.signatureUrl ? (
                    <img
                      src={profileForm.signatureUrl}
                      alt="Signature"
                      className="h-12 max-w-[140px] object-contain rounded-lg border border-slate-200 bg-white p-1"
                    />
                  ) : (
                    <div className="h-12 w-28 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                      No Signature
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Signature</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">Digital stamp or sign png</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Default Terms & Conditions */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Default Terms & Conditions</span>
            </h2>
            <textarea
              rows={4}
              value={profileForm.defaultTerms}
              onChange={(e) => setProfileForm({ ...profileForm, defaultTerms: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Invoice Settings Tab */}
      {activeTab === 'invoice' && (
        <form onSubmit={handleSettingsSubmit} className="space-y-6 text-sm">
          {/* Document Title Customizer */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Document Title & Branding</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Document Title (Default on Invoices & Confirmations)
                </label>
                <input
                  type="text"
                  value={settingsForm.documentTitle ?? 'BOOKING CONFIRMATION'}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, documentTitle: e.target.value })
                  }
                  placeholder="e.g. BOOKING CONFIRMATION"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: <strong className="text-slate-800">BOOKING CONFIRMATION</strong>. You can change this to <em>EVENT BOOKING CONFIRMATION</em>, <em>SERVICE INVOICE</em>, etc.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Name (Header Brand)
                </label>
                <input
                  type="text"
                  value={profileForm.businessName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setProfileForm({ ...profileForm, businessName: newName });
                    onSaveProfile({ ...profileForm, businessName: newName });
                  }}
                  placeholder="e.g. Together Events"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Appears at the top center/header of all generated documents and invoices.
                </p>
              </div>
            </div>
          </div>

          {/* Default Template Choice */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Default Invoice Template</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select which of the 10 professional invoice designs is used automatically for all new bookings and invoices:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TEMPLATES.map((tmpl) => {
                const isSelected = settingsForm.defaultTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() =>
                      setSettingsForm({ ...settingsForm, defaultTemplate: tmpl.id })
                    }
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-xs">{tmpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Display Elements on Printed Invoices</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  setSettingsForm({ ...settingsForm, showLogo: !settingsForm.showLogo })
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              >
                <span className="font-semibold">Show Business Logo</span>
                {settingsForm.showLogo ? (
                  <CheckSquare className="w-4 h-4 text-slate-900" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettingsForm({
                    ...settingsForm,
                    showSignature: !settingsForm.showSignature,
                  })
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              >
                <span className="font-semibold">Show Authorized Signature</span>
                {settingsForm.showSignature ? (
                  <CheckSquare className="w-4 h-4 text-slate-900" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettingsForm({
                    ...settingsForm,
                    showBusinessAddress: !settingsForm.showBusinessAddress,
                  })
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              >
                <span className="font-semibold">Show Business Address</span>
                {settingsForm.showBusinessAddress ? (
                  <CheckSquare className="w-4 h-4 text-slate-900" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettingsForm({ ...settingsForm, showPhone: !settingsForm.showPhone })
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              >
                <span className="font-semibold">Show Phone & WhatsApp</span>
                {settingsForm.showPhone ? (
                  <CheckSquare className="w-4 h-4 text-slate-900" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettingsForm({ ...settingsForm, showEmail: !settingsForm.showEmail })
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
              >
                <span className="font-semibold">Show Email</span>
                {settingsForm.showEmail ? (
                  <CheckSquare className="w-4 h-4 text-slate-900" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>
            </div>
          </div>

          {/* Typography Sizes */}
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Default Typography Scaling</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Heading Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as TextScale[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, headingSize: size })}
                      className={`py-2 text-xs font-semibold rounded-xl capitalize border transition-all ${
                        settingsForm.headingSize === size
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Body Text Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as TextScale[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, bodySize: size })}
                      className={`py-2 text-xs font-semibold rounded-xl capitalize border transition-all ${
                        settingsForm.bodySize === size
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Invoice Preferences</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

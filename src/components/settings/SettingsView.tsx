import React, { useEffect, useState } from 'react';
import { Building, Sliders, Upload, Check, CreditCard, FileText, Save, CheckSquare, Square } from 'lucide-react';
import { BusinessProfile, InvoiceSettings, TextScale } from '../../types';
import { initialBusinessProfile, initialInvoiceSettings } from '../../services/mockData';

interface SettingsViewProps {
  profile?: BusinessProfile;
  settings?: InvoiceSettings;
  initialTab?: 'profile' | 'invoice';
  onSaveProfile: (profile: BusinessProfile) => Promise<BusinessProfile>;
  onSaveSettings: (settings: InvoiceSettings) => Promise<InvoiceSettings>;
}

const TEMPLATES = [
  ['modern', '1. Modern'], ['classic', '2. Classic'], ['minimal', '3. Minimal'], ['clean', '4. Clean'],
  ['professional', '5. Professional'], ['elegant', '6. Elegant'], ['compact', '7. Compact'], ['corporate', '8. Corporate'],
  ['simple-lines', '9. Simple Lines'], ['premium-minimal', '10. Premium Minimal'],
];

// Keep uploaded assets small enough for reliable database persistence while retaining good invoice quality.
const optimizeImage = (file: File, maxSize = 900, quality = 0.82): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not process image'));
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Image canvas unavailable'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, settings, initialTab, onSaveProfile, onSaveSettings }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'invoice'>(initialTab || 'profile');
  const [profileForm, setProfileForm] = useState<BusinessProfile>({ ...initialBusinessProfile, ...(profile || {}), defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ' });
  const [settingsForm, setSettingsForm] = useState<InvoiceSettings>({ ...initialInvoiceSettings, ...(settings || {}) });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (profile) setProfileForm(prev => ({ ...initialBusinessProfile, ...prev, ...profile, defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ' })); }, [profile]);
  useEffect(() => { if (settings) setSettingsForm(prev => ({ ...initialInvoiceSettings, ...prev, ...settings })); }, [settings]);

  const setField = (key: keyof BusinessProfile, value: any) => setProfileForm(prev => ({ ...prev, [key]: value }));
  const setBank = (key: string, value: string) => setProfileForm(prev => ({ ...prev, bankDetails: { bankName: '', accountTitle: '', accountNumber: '', iban: '', ...(prev.bankDetails || {}), [key]: value } }));

  const upload = async (file: File | undefined, field: 'logoUrl' | 'signatureUrl') => {
    if (!file) return;
    try {
      const value = await optimizeImage(file, field === 'logoUrl' ? 1000 : 900, 0.84);
      setField(field, value);
      setMessage(`${field === 'logoUrl' ? 'Logo' : 'Signature'} uploaded. Click Save Business Profile to keep it.`);
      setTimeout(() => setMessage(null), 3500);
    } catch { setMessage('Image could not be processed. Please try PNG or JPG.'); setTimeout(() => setMessage(null), 3500); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const saved = await onSaveProfile({ ...profileForm, defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ' });
      setProfileForm(saved); setMessage('Business profile saved successfully.');
    } catch (err: any) { setMessage(err?.message || 'Could not save business profile.'); }
    finally { setSaving(false); setTimeout(() => setMessage(null), 3500); }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { const saved = await onSaveSettings(settingsForm); setSettingsForm(saved); setMessage('Invoice preferences saved successfully.'); }
    catch (err: any) { setMessage(err?.message || 'Could not save invoice preferences.'); }
    finally { setSaving(false); setTimeout(() => setMessage(null), 3500); }
  };

  return <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1><p className="text-slate-500 text-sm mt-0.5">Configure your business profile, payment details and invoice preferences.</p></div>{message && <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200"><Check className="w-4 h-4" />{message}</div>}</div>
    <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3"><button type="button" onClick={() => setActiveTab('profile')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'profile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}><Building className="w-4 h-4" />Business Profile</button><button type="button" onClick={() => setActiveTab('invoice')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'invoice' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}><Sliders className="w-4 h-4" />Invoice Settings & Templates</button></div>

    {activeTab === 'profile' && <form onSubmit={saveProfile} className="space-y-6 text-sm">
      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Business Identity & Contact</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([['businessName','Business Name',true],['tagline','Tagline / Subtitle',false],['ownerName','Owner / Contact Person',false],['phone','Phone Number',false],['whatsApp','WhatsApp Number',false],['email','Email',false],['city','City',false],['country','Country',false]] as const).map(([key,label,required]) => <div key={key}><label className="block text-xs font-semibold text-slate-700 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</label><input required={required} type={key === 'email' ? 'email' : key === 'phone' || key === 'whatsApp' ? 'tel' : 'text'} value={(profileForm as any)[key] || ''} onChange={e => setField(key as keyof BusinessProfile, e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div>)}
      </div><div><label className="block text-xs font-semibold text-slate-700 mb-1">Office / Studio Address</label><input value={profileForm.address || ''} onChange={e => setField('address', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div></section>

      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-500" />Bank Payment Instructions</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{([['bankName','Bank Name'],['accountTitle','Account Title'],['accountNumber','Account Number'],['iban','IBAN / Swift']] as const).map(([key,label]) => <div key={key}><label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label><input value={(profileForm.bankDetails as any)?.[key] || ''} onChange={e => setBank(key,e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" /></div>)}</div></section>

      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-slate-500" />Brand Assets</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50"><label className="block text-xs font-bold text-slate-700 mb-3">Company Logo</label><div className="flex items-center gap-4">{profileForm.logoUrl ? <img src={profileForm.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg border bg-white p-1" /> : <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-slate-400">No Logo</div>}<label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"><Upload className="w-3.5 h-3.5" />Upload Logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => void upload(e.target.files?.[0], 'logoUrl')} className="hidden" /></label></div><p className="text-[11px] text-slate-400 mt-2">Upload, then press Save Business Profile.</p></div>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50"><label className="block text-xs font-bold text-slate-700 mb-3">Authorized Signature</label><div className="flex items-center gap-4">{profileForm.signatureUrl ? <img src={profileForm.signatureUrl} alt="Signature" className="h-12 max-w-[140px] object-contain rounded-lg border bg-white p-1" /> : <div className="h-12 w-28 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-slate-400">No Signature</div>}<label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"><Upload className="w-3.5 h-3.5" />Upload Signature<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0], 'signatureUrl')} className="hidden" /></label></div><p className="text-[11px] text-slate-400 mt-2">Upload, then press Save Business Profile.</p></div>
      </div></section>

      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-3"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />Default Terms & Conditions</h2><textarea rows={5} value={profileForm.defaultTerms || ''} onChange={e => setField('defaultTerms', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" /></section>
      <div className="flex justify-end"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Business Profile'}</button></div>
    </form>}

    {activeTab === 'invoice' && <form onSubmit={saveSettings} className="space-y-6 text-sm">
      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Document Title & Branding</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold mb-1">Document Title</label><input value={settingsForm.documentTitle || 'BOOKING CONFIRMATION'} onChange={e => setSettingsForm({...settingsForm,documentTitle:e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200" /></div><div><label className="block text-xs font-semibold mb-1">Business Name (Header Brand)</label><input value={profileForm.businessName || ''} onChange={e => setProfileForm({...profileForm,businessName:e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200" /><p className="text-[11px] text-slate-500 mt-1">Saved together with Business Profile.</p></div></div></section>
      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Default Invoice Template</h2><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{TEMPLATES.map(([id,label]) => <button key={id} type="button" onClick={() => setSettingsForm({...settingsForm,defaultTemplate:id})} className={`p-3 rounded-xl border text-xs ${settingsForm.defaultTemplate === id ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-white border-slate-200'}`}>{label}</button>)}</div></section>
      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Display Elements on Printed Invoices</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{([['showLogo','Show Business Logo'],['showSignature','Show Authorized Signature'],['showBusinessAddress','Show Business Address'],['showPhone','Show Phone & WhatsApp'],['showEmail','Show Email']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => setSettingsForm({...settingsForm,[key]:!(settingsForm as any)[key]})} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold"><span>{label}</span>{(settingsForm as any)[key] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}</button>)}</div></section>
      <section className="p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4"><h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Default Typography Scaling</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{([['headingSize','Heading Size'],['bodySize','Body Text Size']] as const).map(([key,label]) => <div key={key}><label className="block text-xs font-semibold mb-2">{label}</label><div className="grid grid-cols-3 gap-2">{(['small','medium','large'] as TextScale[]).map(size => <button key={size} type="button" onClick={() => setSettingsForm({...settingsForm,[key]:size})} className={`py-2 text-xs font-semibold rounded-xl border capitalize ${((settingsForm as any)[key]) === size ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border-slate-200'}`}>{size}</button>)}</div></div>)}</div></section>
      <div className="flex justify-end"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Invoice Preferences'}</button></div>
    </form>}
  </div>;
};

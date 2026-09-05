import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  Mail,
  Sliders,
  Type,
  Check,
  Eye,
  CheckSquare,
  Square,
  FileText
} from 'lucide-react';
import {
  Invoice,
  BusinessProfile,
  InvoiceSettings,
  TextScale
} from '../../types';
import { InvoiceDocument } from './InvoiceDocument';
import {
  printInvoice,
  downloadInvoicePdf,
  generateWhatsAppUrl,
  generateEmailMailto
} from '../../utils/invoiceActions';

interface InvoicePreviewViewProps {
  invoice: Invoice;
  profile: BusinessProfile;
  settings: InvoiceSettings;
  onBack: () => void;
  onUpdateSettings: (newSettings: Partial<InvoiceSettings>) => void;
}

const TEMPLATES = [
  { id: 'modern', label: '1. Modern', desc: 'Sleek asymmetric header & accent totals' },
  { id: 'classic', label: '2. Classic', desc: 'Traditional serif header & double border' },
  { id: 'minimal', label: '3. Minimal', desc: 'Airy typography with hairline rules' },
  { id: 'clean', label: '4. Clean', desc: 'Soft rounded cards & zebra item rows' },
  { id: 'professional', label: '5. Professional', desc: 'Navy corporate accent banner & borders' },
  { id: 'elegant', label: '6. Elegant', desc: 'Luxury event planner serif layout' },
  { id: 'compact', label: '7. Compact', desc: 'Space-efficient condensed single sheet' },
  { id: 'corporate', label: '8. Corporate', desc: 'High-contrast grid & formal statement' },
  { id: 'simple-lines', label: '9. Simple Lines', desc: 'Pure horizontal dividers & Scandinavian feel' },
  { id: 'premium-minimal', label: '10. Premium Minimal', desc: 'Double-padded gallery style layout' },
];

export const InvoicePreviewView: React.FC<InvoicePreviewViewProps> = ({
  invoice,
  profile,
  settings,
  onBack,
  onUpdateSettings,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(invoice.templateId || settings.defaultTemplate || 'modern');
  const [isDownloading, setIsDownloading] = useState(false);
  const [localSettings, setLocalSettings] = useState<InvoiceSettings>({ ...settings });

  const handleToggle = (key: keyof InvoiceSettings) => {
    const updated = { ...localSettings, [key]: !localSettings[key as keyof InvoiceSettings] };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleSizeChange = (key: 'headingSize' | 'bodySize', val: TextScale) => {
    const updated = { ...localSettings, [key]: val };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    onUpdateSettings({ defaultTemplate: templateId });
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadInvoicePdf('printable-invoice-document', invoice.invoiceNumber);
    } catch (err) {
      console.error('PDF export error:', err);
      const message = err instanceof Error ? err.message : 'PDF export failed. Please try again.';
      window.alert(`PDF save failed: ${message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 no-print">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-xl font-bold text-slate-900">Invoice #{invoice.invoiceNumber}</h1><span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">{invoice.paymentStatus}</span></div>
            <p className="text-xs text-slate-500">{invoice.clientName} • {invoice.eventType} ({invoice.eventDate})</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button type="button" onClick={() => { const url = generateWhatsAppUrl(invoice, profile, localSettings); window.open(url, '_blank'); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold shadow-2xs transition-colors" title="Share invoice summary on WhatsApp"><Share2 className="w-3.5 h-3.5" /><span>WhatsApp</span></button>
          <button type="button" onClick={() => { const mailto = generateEmailMailto(invoice, profile, localSettings); window.location.href = mailto; }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold shadow-2xs transition-colors" title="Compose Email to client"><Mail className="w-3.5 h-3.5" /><span>Email</span></button>
          <button type="button" onClick={handleDownload} disabled={isDownloading} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"><Download className="w-3.5 h-3.5 text-slate-600" /><span>{isDownloading ? 'Generating...' : 'Download PDF'}</span></button>
          <button type="button" onClick={printInvoice} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"><Printer className="w-3.5 h-3.5" /><span>Print Invoice</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-3"><div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100"><FileText className="w-4 h-4 text-slate-500" /><span>Document Title</span></div><div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Main Title (Live Preview)</label><input type="text" value={localSettings.documentTitle ?? 'BOOKING CONFIRMATION'} onChange={(e) => { const updated = { ...localSettings, documentTitle: e.target.value }; setLocalSettings(updated); onUpdateSettings({ documentTitle: e.target.value }); }} placeholder="e.g. BOOKING CONFIRMATION" className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-2xs" /><p className="text-[10px] text-slate-400 mt-1">Updates document title instantly on the preview sheet.</p></div></div>
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-3"><div className="flex items-center justify-between pb-2 border-b border-slate-100"><div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm"><Sliders className="w-4 h-4 text-slate-500" /><span>Invoice Templates (10)</span></div><span className="text-[10px] text-slate-400 font-mono">A4 Ready</span></div><div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">{TEMPLATES.map((tmpl) => { const isSelected = selectedTemplate === tmpl.id; return <button key={tmpl.id} type="button" onClick={() => handleTemplateSelect(tmpl.id)} className={`w-full p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-800'}`}><div><span className="font-semibold text-xs block">{tmpl.label}</span><span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{tmpl.desc}</span></div>{isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}</button>; })}</div></div>
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4"><div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100"><Type className="w-4 h-4 text-slate-500" /><span>Typography Controls</span></div><div><span className="block text-xs font-semibold text-slate-600 mb-1.5">Invoice Heading Size</span><div className="grid grid-cols-3 gap-1.5">{(['small', 'medium', 'large'] as TextScale[]).map((size) => <button key={size} type="button" onClick={() => handleSizeChange('headingSize', size)} className={`py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${localSettings.headingSize === size ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{size}</button>)}</div></div><div><span className="block text-xs font-semibold text-slate-600 mb-1.5">Invoice Body Size</span><div className="grid grid-cols-3 gap-1.5">{(['small', 'medium', 'large'] as TextScale[]).map((size) => <button key={size} type="button" onClick={() => handleSizeChange('bodySize', size)} className={`py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${localSettings.bodySize === size ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{size}</button>)}</div></div></div>
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-3"><div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100"><Eye className="w-4 h-4 text-slate-500" /><span>Display & Elements</span></div><div className="space-y-2 text-xs">{(['showLogo','showSignature','showBusinessAddress','showPhone','showEmail'] as const).map((key) => <button key={key} type="button" onClick={() => handleToggle(key)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700"><span>{key === 'showLogo' ? 'Show Business Logo' : key === 'showSignature' ? 'Show Authorized Signature' : key === 'showBusinessAddress' ? 'Show Business Address' : key === 'showPhone' ? 'Show Phone & WhatsApp' : 'Show Email'}</span>{localSettings[key] ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4 text-slate-300" />}</button>)}</div></div>
        </div>

        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-slate-200/90 shadow-md bg-white"><div className="p-3 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500 no-print"><span className="font-mono">Live A4 Paper Preview ({selectedTemplate})</span><span className="italic text-[11px]">Print margins calibrated for standard A4 portrait</span></div><div id="printable-invoice-document" className="p-4 sm:p-6 bg-white overflow-x-auto"><InvoiceDocument invoice={invoice} profile={profile} settings={localSettings} overrideTemplate={selectedTemplate} /></div></div>
      </div>
    </div>
  );
};
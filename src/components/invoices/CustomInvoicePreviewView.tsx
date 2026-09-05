import React, { useState } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Invoice, BusinessProfile, InvoiceSettings } from '../../types';
import { CustomInvoiceDocument } from './CustomInvoiceDocument';
import { downloadInvoicePdf, printInvoice } from '../../utils/invoiceActions';

interface Props { invoice: Invoice; profile: BusinessProfile; settings: InvoiceSettings; onBack: () => void; }

export const CustomInvoicePreviewView: React.FC<Props> = ({ invoice, profile, settings, onBack }) => {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    try { setDownloading(true); await downloadInvoicePdf('printable-custom-invoice-document', invoice.invoiceNumber); }
    finally { setDownloading(false); }
  };
  return <div className="space-y-5 animate-in fade-in duration-150">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 no-print">
      <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></button><div><h1 className="text-xl font-bold text-slate-900">Invoice #{invoice.invoiceNumber}</h1><p className="text-xs text-slate-500">Custom A4 Template • {invoice.clientName}</p></div></div>
      <div className="flex gap-2"><button type="button" onClick={download} disabled={downloading} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"><Download className="w-3.5 h-3.5" />{downloading ? 'Generating...' : 'Download PDF'}</button><button type="button" onClick={printInvoice} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"><Printer className="w-3.5 h-3.5" />Print Invoice</button></div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-8 overflow-auto">
      <div id="printable-custom-invoice-document" className="mx-auto bg-white shadow-xl" style={{ width: '210mm', maxWidth: '100%' }}><CustomInvoiceDocument invoice={invoice} profile={profile} settings={settings} /></div>
    </div>
  </div>;
};

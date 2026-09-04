import React from 'react';
import { Invoice, BusinessProfile, InvoiceSettings } from '../../types';

interface Props { invoice: Invoice; profile: BusinessProfile; settings: InvoiceSettings; className?: string; }

export const PersonalInvoiceDocument: React.FC<Props> = ({ invoice, profile, settings, className='' }) => {
  const money = (n:number) => `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;
  const address = [profile.address, profile.city, profile.country].filter(Boolean).join(', ');
  const terms = invoice.termsAndConditions || profile.defaultTerms || '';
  return <div className={`bg-white text-slate-900 max-w-4xl mx-auto p-7 sm:p-10 print-container ${className}`}>
    <div className="text-center border-b-2 border-slate-900 pb-3">
      {settings.showLogo && profile.logoUrl ? <img src={profile.logoUrl} alt={profile.businessName} className="h-14 max-w-[190px] object-contain mx-auto mb-1"/> : null}
      <h1 className="text-base sm:text-lg font-extrabold tracking-tight">{profile.businessName || 'Together Events'}</h1>
      {profile.tagline && <p className="text-[10px] text-slate-500">{profile.tagline}</p>}
      <p className="text-[9px] text-slate-500 mt-1">{settings.showPhone && profile.phone ? `Phone: ${profile.phone}` : ''}{settings.showPhone && profile.whatsApp ? `  |  WhatsApp: ${profile.whatsApp}` : ''}{settings.showEmail && profile.email ? `  |  Email: ${profile.email}` : ''}</p>
      {settings.showBusinessAddress && address && <p className="text-[9px] text-slate-500">{address}</p>}
    </div>

    <div className="text-center py-2 border-b border-slate-300"><h2 className="text-sm font-extrabold uppercase tracking-wide">{invoice.documentTitle || settings.documentTitle || 'BOOKING CONFIRMATION'}</h2></div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-4 border-b border-slate-200">
      <div><h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bill To</h3><p className="font-bold text-sm">{invoice.clientName}</p>{invoice.billingAddress&&<p className="text-[10px] text-slate-600">{invoice.billingAddress}</p>}{invoice.clientPhone&&<p className="text-[10px] text-slate-600">Phone: {invoice.clientPhone}</p>}{invoice.clientWhatsApp&&<p className="text-[10px] text-slate-600">WhatsApp: {invoice.clientWhatsApp}</p>}</div>
      <div className="sm:text-right"><h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoice Details</h3><p className="text-[10px]">Invoice No: <b>{invoice.invoiceNumber}</b></p><p className="text-[10px]">Date: <b>{invoice.issueDate}</b></p>{invoice.dueDate&&<p className="text-[10px]">Due Date: <b>{invoice.dueDate}</b></p>}{invoice.eventTime&&<p className="text-[10px]">Time: <b>{invoice.eventTime}</b></p>}</div>
    </div>

    <div className="py-3 border-b border-slate-300"><h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Events Details</h3><p className="text-xs font-bold">{invoice.eventType || 'Event'}{invoice.venue ? ` — ${invoice.venue}` : ''}</p><p className="text-[10px] text-slate-600">{invoice.eventDate}{invoice.eventTime ? ` • ${invoice.eventTime}` : ''}</p></div>

    <table className="w-full text-left border-collapse mt-3 text-[10px]"><thead><tr className="border-y border-slate-900"><th className="py-2 px-2">#</th><th className="py-2 px-2">Events Details</th><th className="py-2 px-2 text-right">Price</th><th className="py-2 px-2 text-right">Discount</th><th className="py-2 px-2 text-right">Amount</th></tr></thead><tbody>{invoice.items.map((item,i)=><tr key={item.id||i} className="border-b border-slate-200"><td className="py-2 px-2">{i+1}</td><td className="py-2 px-2 font-semibold">{item.description}</td><td className="py-2 px-2 text-right">{money(item.unitPrice)}</td><td className="py-2 px-2 text-right">—</td><td className="py-2 px-2 text-right font-bold">{money(item.total || item.quantity*item.unitPrice)}</td></tr>)}</tbody></table>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4"><div><h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoice Amount In Words</h3><p className="text-[10px]">Total: <b>{money(invoice.totalAmount)}</b></p><p className="text-[9px] text-slate-500 mt-1">Payment Status: {invoice.paymentStatus}</p></div><div className="sm:text-right text-[10px] space-y-1"><p>Sub Total: <b>{money(invoice.subtotal)}</b></p>{invoice.discount>0&&<p>Discount: <b>-{money(invoice.discount)}</b></p>}<p className="border-t border-slate-300 pt-1">Total: <b>{money(invoice.totalAmount)}</b></p><p>Received: <b>{money(invoice.advancePaid)}</b></p><p className="border-t border-slate-300 pt-1">Balance: <b>{money(invoice.remainingBalance)}</b></p></div></div>

    {terms && <div className="mt-5 pt-3 border-t border-slate-300"><h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Terms and Conditions</h3><div className="whitespace-pre-line text-[9px] leading-relaxed text-slate-600">{terms}</div></div>}
    {profile.invoiceFooterText && <p className="text-[9px] text-slate-500 mt-4">{profile.invoiceFooterText}</p>}
    {settings.showSignature && <div className="flex justify-end mt-7"><div className="w-48 text-center">{profile.signatureUrl&&<img src={profile.signatureUrl} alt="Authorized Signature" className="h-14 max-w-full object-contain mx-auto"/>}<div className="border-t border-slate-400 pt-1 text-[9px] font-bold">Authorized Signatory</div><p className="text-[9px] text-slate-500">{profile.businessName}</p></div></div>}
  </div>;
};
import React from 'react';
import { Invoice, BusinessProfile, InvoiceSettings } from '../../types';
import { getCustomInvoiceLayout, CustomInvoiceBlock } from '../settings/InvoiceTemplateStudio';

interface Props { invoice: Invoice; profile: BusinessProfile; settings: InvoiceSettings; className?: string; }

export const CustomInvoiceDocument: React.FC<Props> = ({ invoice, profile, settings, className = '' }) => {
  const blocks = getCustomInvoiceLayout();
  const money = (n: number) => `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;
  const render = (b: CustomInvoiceBlock) => {
    const base = 'w-full h-full overflow-hidden text-slate-900';
    switch (b.type) {
      case 'logo': return profile.logoUrl ? <img src={profile.logoUrl} alt={profile.businessName} className={`${base} object-contain`} /> : <div className={`${base} flex items-center justify-center bg-slate-100 text-lg font-bold`}>{profile.businessName?.charAt(0) || 'T'}</div>;
      case 'business': return <div className={base}><div className="font-bold">{profile.businessName}</div><div className="text-[9px] text-slate-500 mt-1">{profile.tagline}</div><div className="text-[9px] text-slate-500 mt-1">{[profile.phone, profile.whatsApp, profile.email].filter(Boolean).join(' • ')}</div></div>;
      case 'title': return <div className={`${base} text-right`}><div className="font-bold uppercase tracking-wide">{invoice.documentTitle || settings.documentTitle || 'BOOKING CONFIRMATION'}</div><div className="text-[10px] text-slate-500 mt-1">#{invoice.invoiceNumber}</div><div className="text-[9px] text-slate-500">{invoice.issueDate}</div></div>;
      case 'client': return <div className={`${base} p-2 bg-slate-50 rounded border border-slate-100`}><div className="text-[8px] uppercase tracking-widest font-bold text-slate-400">Bill To</div><div className="font-semibold mt-1">{invoice.clientName}</div><div className="text-[9px] text-slate-500 mt-1">{invoice.clientPhone}</div><div className="text-[9px] text-slate-500">{invoice.clientEmail}</div></div>;
      case 'event': return <div className={`${base} p-2 bg-slate-50 rounded border border-slate-100`}><div className="text-[8px] uppercase tracking-widest font-bold text-slate-400">Event Details</div><div className="font-semibold mt-1">{invoice.eventType}</div><div className="text-[9px] text-slate-500">{invoice.eventDate}{invoice.eventTime ? ` • ${invoice.eventTime}` : ''}</div><div className="text-[9px] text-slate-500">{invoice.venue}</div></div>;
      case 'items': return <div className={`${base} border border-slate-200 rounded`}><div className="grid grid-cols-[1fr_42px_72px] px-2 py-1.5 bg-slate-100 text-[8px] font-bold uppercase"><span>Description</span><span className="text-center">Qty</span><span className="text-right">Total</span></div>{invoice.items.map((it, i) => <div key={it.id || i} className="grid grid-cols-[1fr_42px_72px] px-2 py-1.5 border-t border-slate-100 text-[8px]"><span>{it.description}</span><span className="text-center">{it.quantity}</span><span className="text-right">{money(it.total || it.quantity * it.unitPrice)}</span></div>)}</div>;
      case 'totals': return <div className={`${base} text-right space-y-1`}><div>Subtotal: {money(invoice.subtotal)}</div>{invoice.discount > 0 && <div>Discount: -{money(invoice.discount)}</div>}<div className="font-bold border-t border-slate-300 pt-1">Total: {money(invoice.totalAmount)}</div><div>Advance: {money(invoice.advancePaid)}</div><div className="font-bold bg-slate-100 rounded px-2 py-1">Balance: {money(invoice.remainingBalance)}</div></div>;
      case 'terms': return <div className={`${base}`}><div className="text-[8px] uppercase tracking-widest font-bold text-slate-400">Terms & Conditions</div><div className="text-[8px] whitespace-pre-line text-slate-500 mt-1">{invoice.termsAndConditions || profile.defaultTerms}</div></div>;
      case 'bank': return <div className={`${base} p-2 bg-slate-50 rounded`}><div className="text-[8px] uppercase tracking-widest font-bold text-slate-400">Bank Payment Instructions</div><div className="text-[8px] text-slate-600 mt-1">{profile.bankDetails?.bankName}<br />{profile.bankDetails?.accountTitle}<br />{profile.bankDetails?.accountNumber}{profile.bankDetails?.iban ? ` • ${profile.bankDetails.iban}` : ''}</div></div>;
      case 'signature': return <div className={`${base} text-center flex flex-col justify-end`}>{settings.showSignature && profile.signatureUrl && <img src={profile.signatureUrl} alt="Authorized Signature" className="h-12 max-w-full object-contain mx-auto" />}<div className="border-t border-slate-300 pt-1 mt-1 text-[8px] font-bold">AUTHORIZED SIGNATURE</div><div className="text-[8px] text-slate-500">{profile.ownerName || profile.businessName}</div></div>;
      default: return <div className={`${base} whitespace-pre-wrap`}>{b.text}</div>;
    }
  };

  return <div className={`relative bg-white text-slate-900 overflow-hidden ${className}`} style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%', aspectRatio: '210 / 297' }}>
    {blocks.map((b) => <div key={b.id} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, fontSize: `${b.fontSize}px`, fontWeight: b.bold ? 700 : 400 }}>{render(b)}</div>)}
  </div>;
};

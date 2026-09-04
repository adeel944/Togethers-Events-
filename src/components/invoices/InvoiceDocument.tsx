import React from 'react';
import { Invoice, BusinessProfile, InvoiceSettings } from '../../types';
import { initialBusinessProfile, initialInvoiceSettings } from '../../services/mockData';

interface InvoiceDocumentProps {
  invoice: Invoice;
  profile?: BusinessProfile;
  settings?: InvoiceSettings;
  overrideTemplate?: string;
  className?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  profile: inputProfile,
  settings: inputSettings,
  overrideTemplate,
  className = '',
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const settings = inputSettings || initialInvoiceSettings;
  const template = overrideTemplate || invoice.templateId || settings.defaultTemplate || 'modern';

  // Currency formatter
  const formatMoney = (amount: number) => {
    return `${profile.currencySymbol}${Number(amount || 0).toLocaleString()}`;
  };

  // Font scale classes
  const getHeadingScale = () => {
    switch (settings.headingSize) {
      case 'small':
        return 'text-lg sm:text-xl font-bold';
      case 'large':
        return 'text-2xl sm:text-3xl font-bold';
      default:
        return 'text-xl sm:text-2xl font-bold';
    }
  };

  const getBodyScale = () => {
    switch (settings.bodySize) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const getTitleScale = () => {
    switch (settings.headingSize) {
      case 'small':
        return 'text-xl font-semibold';
      case 'large':
        return 'text-3xl font-bold';
      default:
        return 'text-2xl font-bold';
    }
  };

  const docTitle = invoice.documentTitle || settings.documentTitle || 'BOOKING CONFIRMATION';

  const statusColors: Record<string, string> = {
    Paid: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    Pending: 'text-rose-700 bg-rose-50 border border-rose-200',
  };

  // Reusable components inside the templates
  const renderLogoOrPlaceholder = () => {
    if (!settings.showLogo) return null;
    if (profile.logoUrl) {
      return (
        <img
          src={profile.logoUrl}
          alt={profile.businessName}
          className="h-14 max-w-[180px] object-contain"
        />
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider">
          {profile.businessName ? profile.businessName.charAt(0).toUpperCase() : 'T'}
        </div>
        <div>
          <span className="font-bold tracking-tight text-slate-900 text-lg leading-tight block">
            {profile.businessName}
          </span>
          {profile.tagline && (
            <span className="text-xs text-slate-500 font-medium block">
              {profile.tagline}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderBusinessContact = () => (
    <div className={`text-slate-600 ${getBodyScale()} space-y-0.5`}>
      {settings.showBusinessAddress && (profile.address || profile.city) && (
        <p>
          {[profile.address, profile.city, profile.country].filter(Boolean).join(', ')}
        </p>
      )}
      {settings.showPhone && profile.phone && <p>Phone: {profile.phone}</p>}
      {settings.showPhone && profile.whatsApp && (
        <p>WhatsApp: {profile.whatsApp}</p>
      )}
      {settings.showEmail && profile.email && <p>Email: {profile.email}</p>}
      {profile.website && <p className="text-slate-500">{profile.website}</p>}
      {profile.taxNumber && (
        <p className="text-xs text-slate-400">NTN / Tax ID: {profile.taxNumber}</p>
      )}
    </div>
  );

  const renderClientInfo = () => (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5">
        Bill To
      </h3>
      <p className="font-semibold text-slate-900 text-base">{invoice.clientName}</p>
      <div className={`text-slate-600 mt-1 space-y-0.5 ${getBodyScale()}`}>
        {invoice.billingAddress && <p>{invoice.billingAddress}</p>}
        {invoice.clientPhone && <p>Phone: {invoice.clientPhone}</p>}
        {invoice.clientWhatsApp && <p>WhatsApp: {invoice.clientWhatsApp}</p>}
        {invoice.clientEmail && <p>Email: {invoice.clientEmail}</p>}
      </div>
    </div>
  );

  const renderEventDetails = () => (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5">
        Event Details
      </h3>
      <div className={`text-slate-700 space-y-1 ${getBodyScale()}`}>
        <p>
          <span className="font-medium text-slate-500">Event: </span>
          <span className="font-semibold text-slate-900">{invoice.eventType}</span>
        </p>
        <p>
          <span className="font-medium text-slate-500">Date: </span>
          <span className="font-medium text-slate-900">{invoice.eventDate}{invoice.eventTime ? ` (${invoice.eventTime})` : ''}</span>
        </p>
        <p>
          <span className="font-medium text-slate-500">Venue: </span>
          <span className="text-slate-800">{invoice.venue || 'TBA'}</span>
        </p>
      </div>
    </div>
  );

  const renderItemsTable = (styleType: 'classic' | 'modern' | 'minimal' | 'striped' | 'bordered') => (
    <div className="my-6 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr
            className={
              styleType === 'modern'
                ? 'bg-slate-100/90 text-slate-800 border-y border-slate-200'
                : styleType === 'classic'
                ? 'border-y-2 border-slate-900 text-slate-900 font-serif'
                : styleType === 'bordered'
                ? 'border border-slate-300 bg-slate-50 text-slate-700'
                : 'border-b border-slate-200 text-slate-500'
            }
          >
            <th className="py-2.5 px-3 font-semibold text-xs tracking-wider uppercase">
              Description
            </th>
            <th className="py-2.5 px-3 font-semibold text-xs tracking-wider uppercase text-center w-20">
              Qty
            </th>
            <th className="py-2.5 px-3 font-semibold text-xs tracking-wider uppercase text-right w-32">
              Unit Price
            </th>
            <th className="py-2.5 px-3 font-semibold text-xs tracking-wider uppercase text-right w-36">
              Total
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y divide-slate-100 ${getBodyScale()}`}>
          {invoice.items.map((item, index) => (
            <tr
              key={item.id || index}
              className={
                styleType === 'striped' && index % 2 === 1
                  ? 'bg-slate-50/70'
                  : styleType === 'bordered'
                  ? 'border-b border-slate-200'
                  : ''
              }
            >
              <td className="py-3 px-3 text-slate-800 font-medium align-top">
                {item.description}
              </td>
              <td className="py-3 px-3 text-slate-600 text-center align-top">
                {item.quantity}
              </td>
              <td className="py-3 px-3 text-slate-600 text-right align-top">
                {formatMoney(item.unitPrice)}
              </td>
              <td className="py-3 px-3 text-slate-900 font-semibold text-right align-top">
                {formatMoney(item.total || item.quantity * item.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTotalsSummary = () => (
    <div className="flex justify-end my-4">
      <div className={`w-72 space-y-2 text-slate-700 ${getBodyScale()}`}>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Subtotal:</span>
          <span className="font-medium text-slate-800">{formatMoney(invoice.subtotal)}</span>
        </div>

        {invoice.discount > 0 && (
          <div className="flex justify-between py-1 text-emerald-600 border-b border-slate-100">
            <span>Discount:</span>
            <span>-{formatMoney(invoice.discount)}</span>
          </div>
        )}

        {invoice.tax > 0 && (
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Tax / VAT:</span>
            <span className="font-medium text-slate-800">{formatMoney(invoice.tax)}</span>
          </div>
        )}

        <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b-2 border-slate-900">
          <span>Total Amount:</span>
          <span>{formatMoney(invoice.totalAmount)}</span>
        </div>

        <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
          <span>Advance Paid:</span>
          <span className="font-medium">{formatMoney(invoice.advancePaid)}</span>
        </div>

        <div className="flex justify-between py-2 font-bold text-slate-950 bg-slate-100/80 px-3 rounded-lg">
          <span>Remaining Balance:</span>
          <span className="text-base text-slate-900">{formatMoney(invoice.remainingBalance)}</span>
        </div>
      </div>
    </div>
  );

  const renderTermsAndSignature = () => (
    <div className="pt-6 mt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
      <div>
        {invoice.termsAndConditions && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Terms & Conditions
            </h4>
            <div className={`text-slate-600 whitespace-pre-line leading-relaxed ${getBodyScale()}`}>
              {invoice.termsAndConditions}
            </div>
          </div>
        )}
        {profile.invoiceFooterText && (
          <p className="text-xs text-slate-400 italic mt-4">{profile.invoiceFooterText}</p>
        )}
      </div>

      <div className="flex flex-col items-end text-right">
        {settings.showSignature && (
          <div className="w-56 text-center">
            {profile.signatureUrl ? (
              <img
                src={profile.signatureUrl}
                alt="Authorized Signature"
                className="h-16 max-w-[200px] mx-auto object-contain mb-1"
              />
            ) : (
              <div className="h-14 border-b border-dashed border-slate-300 flex items-end justify-center pb-1 text-slate-400 text-xs italic">
                {profile.ownerName || profile.businessName}
              </div>
            )}
            <div className="border-t border-slate-400 pt-1 mt-1">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Authorized Signature
              </p>
              <p className="text-[11px] text-slate-500">
                {profile.ownerName ? `${profile.ownerName} - ` : ''}{profile.businessName}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 10 Distinct Template Layouts:
  switch (template) {
    case 'classic':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border border-slate-200 shadow-sm rounded-none max-w-4xl mx-auto print-container ${className}`}
        >
          {/* Classic Center Title with Serif */}
          <div className="text-center pb-6 border-b-2 border-slate-900">
            {renderLogoOrPlaceholder()}
            <div className="mt-3">{renderBusinessContact()}</div>
          </div>

          <div className="py-4 flex justify-between items-center border-b border-slate-300">
            <div>
              <span className="font-serif text-2xl font-bold tracking-wide text-slate-900">
                {docTitle.toUpperCase()}
              </span>
              <p className="text-xs text-slate-500 font-mono mt-0.5">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Date: <span className="font-semibold text-slate-900">{invoice.issueDate}</span></p>
              {invoice.dueDate && (
                <p>Due Date: <span className="font-semibold text-slate-900">{invoice.dueDate}</span></p>
              )}
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  statusColors[invoice.paymentStatus] || 'bg-slate-100 text-slate-800'
                }`}
              >
                {invoice.paymentStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 my-6">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('classic')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'minimal':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-start mb-8">
            <div>{renderLogoOrPlaceholder()}</div>
            <div className="text-right">
              <span className="text-xs tracking-widest text-slate-400 uppercase font-mono">{docTitle.toUpperCase()}</span>
              <h2 className="text-xl font-mono font-semibold text-slate-800">#{invoice.invoiceNumber}</h2>
              <p className="text-xs text-slate-500 mt-1">{invoice.issueDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-t border-b border-slate-100">
            <div>{renderClientInfo()}</div>
            <div>{renderEventDetails()}</div>
          </div>

          {renderItemsTable('minimal')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'clean':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border border-slate-200/80 rounded-xl shadow-xs max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-start pb-6 border-b border-slate-100">
            <div>
              {renderLogoOrPlaceholder()}
              <div className="mt-2">{renderBusinessContact()}</div>
            </div>
            <div className="text-right">
              <h1 className={`${getTitleScale()} text-slate-900`}>{docTitle.toUpperCase()}</h1>
              <p className="font-mono text-sm font-semibold text-slate-600">#{invoice.invoiceNumber}</p>
              <div className="mt-2 text-xs text-slate-500">
                <p>Issue Date: {invoice.issueDate}</p>
                {invoice.dueDate && <p>Due Date: {invoice.dueDate}</p>}
              </div>
              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[invoice.paymentStatus]
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-slate-50/70 rounded-xl border border-slate-100">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('striped')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'professional':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border border-slate-300 max-w-4xl mx-auto print-container ${className}`}
        >
          {/* Top Navy Accent Bar */}
          <div className="h-2.5 bg-slate-900 -mx-8 sm:-mx-12 -mt-8 sm:-mt-12 mb-8" />
          <div className="flex justify-between items-start pb-6">
            <div>
              {renderLogoOrPlaceholder()}
              <div className="mt-3">{renderBusinessContact()}</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                {docTitle.toUpperCase()}
              </span>
              <h2 className="text-2xl font-bold font-mono text-slate-900">
                {invoice.invoiceNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Date: {invoice.issueDate}</p>
              <div className="mt-2">
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded ${
                    statusColors[invoice.paymentStatus]
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-5 border-t-2 border-slate-900 border-b border-slate-200">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('bordered')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'elegant':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border border-amber-900/15 max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="text-center pb-8 border-b border-slate-200">
            <div className="flex justify-center mb-2">{renderLogoOrPlaceholder()}</div>
            <p className="text-xs tracking-widest uppercase font-serif text-slate-500 mt-1">
              Event Planning & Production
            </p>
            <div className="mt-2 text-xs text-slate-500 flex justify-center gap-4 flex-wrap">
              {profile.phone && <span>{profile.phone}</span>}
              {profile.email && <span>{profile.email}</span>}
              {profile.website && <span>{profile.website}</span>}
            </div>
          </div>

          <div className="flex justify-between items-center py-4 border-b border-slate-100">
            <span className="font-serif italic text-xl text-slate-800">
              {docTitle} #{invoice.invoiceNumber}
            </span>
            <div className="text-right text-xs text-slate-500">
              <span>Date: {invoice.issueDate}</span>
              <span className="ml-3 font-semibold text-slate-700">[{invoice.paymentStatus}]</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 my-6">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('classic')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'compact':
      return (
        <div
          className={`bg-white p-6 sm:p-8 text-slate-900 border border-slate-200 max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {renderLogoOrPlaceholder()}
            </div>
            <div className="text-right text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{docTitle.toUpperCase()}</p>
              <span className="font-mono font-bold text-slate-900 text-sm">
                #{invoice.invoiceNumber}
              </span>
              <p className="text-slate-500">{invoice.issueDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 text-xs border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-400 uppercase">From:</span>
              <p className="font-medium text-slate-800">{profile.businessName}</p>
              <p className="text-slate-500">{profile.phone}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase">To:</span>
              <p className="font-medium text-slate-800">{invoice.clientName}</p>
              <p className="text-slate-500">{invoice.clientPhone}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase">Event:</span>
              <p className="font-medium text-slate-800">{invoice.eventType} • {invoice.eventDate}</p>
              <p className="text-slate-500">{invoice.venue}</p>
            </div>
          </div>

          {renderItemsTable('modern')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'corporate':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border-2 border-slate-800 max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-start pb-6 border-b-2 border-slate-800">
            <div>
              {renderLogoOrPlaceholder()}
              <div className="mt-2">{renderBusinessContact()}</div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{docTitle.toUpperCase()}</h1>
              <div className="mt-2 font-mono text-xs space-y-0.5 text-slate-600">
                <p>DOC NO: <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
                <p>DATE: {invoice.issueDate}</p>
                {invoice.dueDate && <p>DUE: {invoice.dueDate}</p>}
                <p>STATUS: <span className="font-bold uppercase">{invoice.paymentStatus}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 my-6">
            <div className="border-l-4 border-slate-900 pl-4">
              {renderClientInfo()}
            </div>
            <div className="border-l-4 border-slate-400 pl-4">
              {renderEventDetails()}
            </div>
          </div>

          {renderItemsTable('bordered')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'simple-lines':
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-end pb-4 border-b border-slate-900">
            <div>{renderLogoOrPlaceholder()}</div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400">{docTitle.toUpperCase()}</p>
              <h2 className="text-xl font-light text-slate-900 font-mono">#{invoice.invoiceNumber}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-200">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('minimal')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'premium-minimal':
      return (
        <div
          className={`bg-white p-10 sm:p-14 text-slate-900 border border-slate-200/90 rounded-2xl shadow-xs max-w-4xl mx-auto print-container ${className}`}
        >
          <div className="flex justify-between items-start pb-8 border-b border-slate-100">
            <div>
              {renderLogoOrPlaceholder()}
              <div className="mt-3">{renderBusinessContact()}</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                {docTitle.toUpperCase()}
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                #{invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-1">{invoice.issueDate}</p>
              <div className="mt-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[invoice.paymentStatus]
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 my-8">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {renderItemsTable('striped')}
          {renderTotalsSummary()}
          {renderTermsAndSignature()}
        </div>
      );

    case 'modern':
    default:
      return (
        <div
          className={`bg-white p-8 sm:p-12 text-slate-900 border border-slate-200/90 rounded-2xl shadow-xs max-w-4xl mx-auto print-container ${className}`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              {renderLogoOrPlaceholder()}
              <div className="mt-3">{renderBusinessContact()}</div>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-md uppercase tracking-wider mb-2">
                {docTitle.toUpperCase()}
              </div>
              <h1 className={`${getHeadingScale()} text-slate-900 font-mono`}>
                #{invoice.invoiceNumber}
              </h1>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>
                  <span className="text-slate-400">Date:</span> {invoice.issueDate}
                </p>
                {invoice.dueDate && (
                  <p>
                    <span className="text-slate-400">Due:</span> {invoice.dueDate}
                  </p>
                )}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[invoice.paymentStatus] || 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Billing and Event Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            {renderClientInfo()}
            {renderEventDetails()}
          </div>

          {/* Items */}
          {renderItemsTable('modern')}

          {/* Totals */}
          {renderTotalsSummary()}

          {/* Terms and Signature */}
          {renderTermsAndSignature()}
        </div>
      );
  }
};

import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => window.print();

const waitForInvoiceAssets = async (element: HTMLElement) => {
  if (document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  })));
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');

  const invoiceSheet = source.querySelector<HTMLElement>('.print-container') || source;
  await waitForInvoiceAssets(invoiceSheet);

  // Use the browser's native print engine instead of html2canvas/jsPDF.
  // This preserves the exact CSS layout shown in the invoice preview and
  // avoids unsupported oklab()/oklch() parsing entirely.
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!printWindow) throw new Error('Please allow pop-ups for this site to save the invoice as PDF.');

  const doc = printWindow.document;
  const title = `Invoice-${String(invoiceNumber || 'invoice').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'invoice'}`;

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pdf-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; box-sizing: border-box; }
    .pdf-page img { max-width: 100%; }
    @media print {
      html, body { width: 210mm; }
      .pdf-page { width: 210mm; min-height: 297mm; }
    }
  </style>
</head>
<body>
  <div class="pdf-page">${invoiceSheet.outerHTML}</div>
</body>
</html>`);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else printWindow.addEventListener('load', () => resolve(), { once: true });
  });

  await new Promise<void>((resolve) => {
    if (doc.fonts?.ready) {
      doc.fonts.ready.then(() => resolve()).catch(() => resolve());
    } else resolve();
  });

  const images = Array.from(doc.images);
  await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  })));

  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
    window.setTimeout(() => printWindow.close(), 1000);
  }, 100);
};

export const generateWhatsAppUrl = (invoice: Invoice, profile: BusinessProfile): string => {
  const cleanPhone = (invoice.clientWhatsApp || invoice.clientPhone || '').replace(/[^0-9]/g, '');
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const message = [
    `Dear ${invoice.clientName},`,
    `Greetings from ${profile.businessName}!`,
    ``,
    `Please find your invoice details for the upcoming *${invoice.eventType}* event:`,
    `• *Invoice No:* #${invoice.invoiceNumber}`,
    `• *Total Amount:* ${formattedTotal}`,
    `• *Advance Paid:* ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}`,
    `• *Remaining Balance:* ${formattedRemaining}`,
    `• *Payment Status:* ${invoice.paymentStatus}`,
    invoice.eventDate ? `• *Event Date:* ${invoice.eventDate}` : '',
    ``,
    `Thank you for choosing ${profile.businessName}. Please let us know if you have any questions.`,
  ].filter(Boolean).join('\n');
  if (cleanPhone) return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const generateEmailMailto = (invoice: Invoice, profile: BusinessProfile): string => {
  const subject = `Invoice #${invoice.invoiceNumber} from ${profile.businessName}`;
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const body = `Dear ${invoice.clientName},\n\nPlease find your invoice details below from ${profile.businessName}:\n\nInvoice Number: #${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nEvent: ${invoice.eventType}\nEvent Date: ${invoice.eventDate}\nVenue: ${invoice.venue || 'TBA'}\n\nTotal Amount: ${formattedTotal}\nAdvance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}\nRemaining Balance: ${formattedRemaining}\nPayment Status: ${invoice.paymentStatus}\n\nTerms & Conditions:\n${invoice.termsAndConditions || profile.defaultTerms}\n\n${profile.invoiceFooterText || 'Thank you for your business!'}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;
  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

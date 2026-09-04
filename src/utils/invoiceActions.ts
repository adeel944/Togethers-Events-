import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => {
  window.print();
};

export const downloadInvoicePdf = async (
  elementId: string,
  invoiceNumber: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Invoice preview element not found');
  }

  // Create canvas with high scale for crisp vector-like text rendering
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));

  // If content is longer than 1 A4 page, add pages
  let heightLeft = pdfHeight - 297;
  let position = -297;
  while (heightLeft > 0) {
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= 297;
    position -= 297;
  }

  pdf.save(`Invoice-${invoiceNumber}.pdf`);
};

export const generateWhatsAppUrl = (
  invoice: Invoice,
  profile: BusinessProfile
): string => {
  const cleanPhone = (invoice.clientWhatsApp || invoice.clientPhone || '').replace(
    /[^0-9]/g,
    ''
  );
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(
    invoice.remainingBalance
  ).toLocaleString()}`;

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
  ]
    .filter(Boolean)
    .join('\n');

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const generateEmailMailto = (
  invoice: Invoice,
  profile: BusinessProfile
): string => {
  const subject = `Invoice #${invoice.invoiceNumber} from ${profile.businessName}`;
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(
    invoice.remainingBalance
  ).toLocaleString()}`;

  const body = `Dear ${invoice.clientName},

Please find your invoice details below from ${profile.businessName}:

Invoice Number: #${invoice.invoiceNumber}
Issue Date: ${invoice.issueDate}
Event: ${invoice.eventType}
Event Date: ${invoice.eventDate}
Venue: ${invoice.venue || 'TBA'}

Total Amount: ${formattedTotal}
Advance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}
Remaining Balance: ${formattedRemaining}
Payment Status: ${invoice.paymentStatus}

Terms & Conditions:
${invoice.termsAndConditions || profile.defaultTerms}

${profile.invoiceFooterText || 'Thank you for your business!'}

Warm regards,
${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}
${profile.phone || ''}
${profile.email || ''}
${profile.website || ''}`;

  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

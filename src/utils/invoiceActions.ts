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
  const preview = document.getElementById(elementId);
  if (!preview) {
    throw new Error('Invoice preview element not found');
  }

  // Capture the actual invoice sheet, not the surrounding preview/scroll container.
  const invoiceElement = preview.querySelector<HTMLElement>('.print-container');
  if (!invoiceElement) {
    throw new Error('Invoice document element not found');
  }

  // Give the browser a frame to finish fonts/images/layout before capturing.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const canvas = await html2canvas(invoiceElement, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 15000,
    removeContainer: true,
    scrollX: 0,
    scrollY: -window.scrollY,
    width: invoiceElement.scrollWidth,
    height: invoiceElement.scrollHeight,
    windowWidth: Math.max(document.documentElement.clientWidth, invoiceElement.scrollWidth),
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Invoice rendered to an empty canvas');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Keep the invoice's proportions and fit it to the A4 page width.
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/png', 1.0);
  let remainingHeight = imageHeight;
  let offsetY = 0;
  let pageIndex = 0;

  while (remainingHeight > 0) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      imgData,
      'PNG',
      0,
      -offsetY,
      imageWidth,
      imageHeight,
      undefined,
      'FAST'
    );

    remainingHeight -= pageHeight;
    offsetY += pageHeight;
    pageIndex += 1;
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

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** html2canvas 1.x cannot parse modern CSS color functions such as oklch().
 * Copy the browser's resolved RGB colors onto the export clone so the renderer
 * never has to parse the original OKLCH declarations from Tailwind/global CSS.
 */
const normalizeExportColors = (root: HTMLElement) => {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const colorProps = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'columnRuleColor',
    'caretColor',
  ] as const;

  for (const node of nodes) {
    const computed = window.getComputedStyle(node);
    for (const prop of colorProps) {
      const value = computed[prop];
      if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
        node.style[prop] = value;
      }
    }

    const shadow = computed.boxShadow;
    if (shadow && shadow !== 'none') node.style.boxShadow = shadow;

    const textShadow = computed.textShadow;
    if (textShadow && textShadow !== 'none') node.style.textShadow = textShadow;
  }
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');

  await waitForInvoiceAssets(source);
  await nextFrame();

  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute('data-pdf-export', 'true');
  clone.style.position = 'fixed';
  clone.style.left = '-100000px';
  clone.style.top = '0';
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.background = '#ffffff';
  clone.style.boxSizing = 'border-box';
  clone.style.zIndex = '-1';
  document.body.appendChild(clone);

  try {
    await waitForInvoiceAssets(clone);
    normalizeExportColors(clone);
    await nextFrame();

    const width = Math.max(clone.scrollWidth, clone.clientWidth, 794);
    const height = Math.max(clone.scrollHeight, clone.clientHeight, 1);
    const maxCanvasDimension = 9000;
    const scale = Math.max(1, Math.min(2, maxCanvasDimension / Math.max(width, height)));

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      width,
      height,
      windowWidth: width,
      windowHeight: Math.max(height, 900),
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDocument) => {
        const clonedRoot = clonedDocument.querySelector('[data-pdf-export="true"]') as HTMLElement | null;
        if (clonedRoot) normalizeExportColors(clonedRoot);
      },
    });

    if (!canvas.width || !canvas.height) throw new Error('Could not render invoice for PDF.');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const pageCanvasHeight = Math.max(1, Math.floor((canvas.width * pdfPageHeight) / pdfWidth));

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < canvas.height) {
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - offsetY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not prepare PDF page.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (pageIndex > 0) pdf.addPage();
      const pageHeightMm = (sliceHeight * pdfWidth) / canvas.width;
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfWidth, pageHeightMm, undefined, 'FAST');

      offsetY += sliceHeight;
      pageIndex += 1;
    }

    const safeNumber = String(invoiceNumber || 'invoice').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'invoice';
    const filename = `Invoice-${safeNumber}.pdf`;
    const blob = pdf.output('blob');
    if (!blob || blob.size < 1000) throw new Error('The generated PDF is empty.');

    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } finally {
    clone.remove();
  }
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

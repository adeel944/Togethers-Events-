import jsPDF from 'jspdf';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => window.print();

const waitForInvoiceAssets = async (element: HTMLElement, doc: Document = document) => {
  if (doc.fonts?.ready) await doc.fonts.ready;
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  })));
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const getSafeFilename = (invoiceNumber: string) => {
  const safeNumber = String(invoiceNumber || 'invoice').replace(/[\\/:*?"<>|]+/g, '-').trim();
  return `Invoice-${safeNumber || 'invoice'}.pdf`;
};

/**
 * Collect the app CSS as text where possible. This is intentionally used by the
 * browser's SVG renderer rather than html2canvas, so modern CSS colors such as
 * oklab()/oklch() are handled by the browser itself.
 */
const collectStylesheetText = (): string => {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      if (rules.length) chunks.push(rules.map((rule) => rule.cssText).join('\n'));
    } catch {
      // Cross-origin stylesheets cannot expose cssRules. The original stylesheet
      // is still copied below as a <link>, which works for same-origin app assets.
      if (sheet.href) {
        chunks.push(`@import url(${JSON.stringify(sheet.href)});`);
      }
    }
  }

  return chunks.join('\n');
};

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const renderInvoiceToCanvas = async (invoiceSheet: HTMLElement): Promise<HTMLCanvasElement> => {
  await waitForInvoiceAssets(invoiceSheet);
  await nextFrame();

  const WIDTH = 794;
  const exportClone = invoiceSheet.cloneNode(true) as HTMLElement;
  exportClone.removeAttribute('id');

  // Force the same A4-width coordinate system every time. Typography remains
  // driven by the invoice's real CSS classes instead of being scaled by an
  // arbitrary screenshot width.
  exportClone.style.width = `${WIDTH}px`;
  exportClone.style.minWidth = `${WIDTH}px`;
  exportClone.style.maxWidth = `${WIDTH}px`;
  exportClone.style.margin = '0';
  exportClone.style.boxSizing = 'border-box';
  exportClone.style.background = '#ffffff';
  exportClone.style.overflow = 'visible';

  const styles = collectStylesheetText();

  // Put the clone in a real browser document first so we can measure the exact
  // rendered height before creating the SVG snapshot.
  const measurer = document.createElement('div');
  measurer.style.position = 'fixed';
  measurer.style.left = '-100000px';
  measurer.style.top = '0';
  measurer.style.width = `${WIDTH}px`;
  measurer.style.minWidth = `${WIDTH}px`;
  measurer.style.maxWidth = `${WIDTH}px`;
  measurer.style.background = '#fff';
  measurer.style.overflow = 'visible';
  measurer.appendChild(exportClone);
  document.body.appendChild(measurer);

  try {
    await waitForInvoiceAssets(exportClone);
    await nextFrame();

    const height = Math.max(exportClone.scrollHeight, exportClone.getBoundingClientRect().height, 1);
    const safeHeight = Math.ceil(height);
    const cloneMarkup = exportClone.outerHTML;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${safeHeight}" viewBox="0 0 ${WIDTH} ${safeHeight}">
  <foreignObject x="0" y="0" width="${WIDTH}" height="${safeHeight}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;min-width:${WIDTH}px;max-width:${WIDTH}px;background:#ffffff;box-sizing:border-box;">
      <style>${styles}</style>
      <style>
        html, body { margin:0 !important; padding:0 !important; width:${WIDTH}px !important; min-width:${WIDTH}px !important; max-width:${WIDTH}px !important; background:#ffffff !important; }
        *, *::before, *::after { box-sizing:border-box; }
        .print-container { width:${WIDTH}px !important; min-width:${WIDTH}px !important; max-width:${WIDTH}px !important; margin:0 !important; }
        img { max-width:100%; }
        body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      </style>
      ${cloneMarkup}
    </div>
  </foreignObject>
</svg>`;

    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const image = new Image();
      image.decoding = 'sync';

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not render invoice for PDF export.'));
        image.src = svgUrl;
      });

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH * scale;
      canvas.height = safeHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create PDF canvas.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0, WIDTH, safeHeight);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      return canvas;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  } finally {
    measurer.remove();
  }
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');

  const invoiceSheet = source.querySelector<HTMLElement>('.print-container') || source;
  const canvas = await renderInvoiceToCanvas(invoiceSheet);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();

  // The canvas is 794 CSS px wide = A4 width at the browser's 96 CSS-DPI
  // coordinate system. Slice vertically into A4 pages without changing scale.
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
    ctx.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    if (pageIndex > 0) pdf.addPage();
    const pageHeightMm = (sliceHeight * pdfWidth) / canvas.width;
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      pdfWidth,
      pageHeightMm,
      undefined,
      'FAST',
    );

    offsetY += sliceHeight;
    pageIndex += 1;
  }

  const filename = getSafeFilename(invoiceNumber);
  pdf.save(filename);
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

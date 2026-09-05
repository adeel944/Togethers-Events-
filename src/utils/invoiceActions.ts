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

const nextFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const getSafeFilename = (invoiceNumber: string) => {
  const safeNumber = String(invoiceNumber || 'invoice')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim();
  return `Invoice-${safeNumber || 'invoice'}.pdf`;
};

const legacyColorContext = document.createElement('canvas').getContext('2d');

const toLegacyColor = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'none') return raw;
  if (!legacyColorContext) return raw;

  try {
    legacyColorContext.fillStyle = '#000000';
    legacyColorContext.fillStyle = raw;
    return legacyColorContext.fillStyle || raw;
  } catch {
    return raw;
  }
};

const containsUnsupportedColorFunction = (value: string) =>
  /(?:oklch|oklab|color)\s*\(/i.test(value || '');

/**
 * Freeze the invoice's already-rendered appearance into inline CSS.
 * html2canvas then has no app stylesheet to parse, which prevents modern
 * oklab()/oklch() CSS from reaching its CSS parser.
 */
const freezeComputedStyles = (source: HTMLElement, clone: HTMLElement) => {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  const count = Math.min(sourceNodes.length, cloneNodes.length);

  for (let i = 0; i < count; i += 1) {
    const sourceNode = sourceNodes[i];
    const cloneNode = cloneNodes[i];
    const computed = window.getComputedStyle(sourceNode);

    cloneNode.removeAttribute('class');
    cloneNode.removeAttribute('style');

    for (let p = 0; p < computed.length; p += 1) {
      const property = computed.item(p);
      if (!property || property.startsWith('--')) continue;

      let value = computed.getPropertyValue(property);
      if (!value) continue;

      if (property === 'background-image' || property === 'mask-image' || property === 'border-image-source') {
        if (containsUnsupportedColorFunction(value)) value = 'none';
      } else if (property.endsWith('color') || property === 'color' || property === 'caret-color') {
        if (value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') value = toLegacyColor(value);
      } else if (containsUnsupportedColorFunction(value)) {
        // Keep the layout property but remove an unsupported color-bearing effect.
        if (property.includes('shadow')) value = 'none';
        else continue;
      }

      try {
        cloneNode.style.setProperty(property, value, computed.getPropertyPriority(property));
      } catch {
        // Some browser-generated/read-only values cannot be reapplied inline.
      }
    }

    // Pseudo-elements are not available as DOM nodes. Most invoice templates do
    // not depend on them; disabling them avoids stylesheet parsing altogether.
    cloneNode.style.setProperty('background-image',
      containsUnsupportedColorFunction(cloneNode.style.backgroundImage) ? 'none' : cloneNode.style.backgroundImage);
  }
};

const renderInvoiceToCanvas = async (invoiceSheet: HTMLElement) => {
  await waitForInvoiceAssets(invoiceSheet);
  await nextFrame();

  const rect = invoiceSheet.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || invoiceSheet.scrollWidth || 794));

  const clone = invoiceSheet.cloneNode(true) as HTMLElement;
  clone.setAttribute('data-pdf-export', 'true');
  clone.style.position = 'fixed';
  clone.style.left = '-100000px';
  clone.style.top = '0';
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.height = 'auto';
  clone.style.margin = '0';
  clone.style.overflow = 'visible';
  clone.style.background = '#ffffff';
  clone.style.boxSizing = 'border-box';

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-100000px';
  holder.style.top = '0';
  holder.style.width = `${width}px`;
  holder.style.minWidth = `${width}px`;
  holder.style.maxWidth = `${width}px`;
  holder.style.padding = '0';
  holder.style.margin = '0';
  holder.style.background = '#ffffff';
  holder.style.overflow = 'visible';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    // Read the actual on-screen invoice appearance before stripping stylesheets.
    const sourceNodes = [invoiceSheet, ...Array.from(invoiceSheet.querySelectorAll<HTMLElement>('*'))];
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    const sourceHeight = Math.max(
      invoiceSheet.scrollHeight,
      invoiceSheet.getBoundingClientRect().height,
      1,
    );

    freezeComputedStyles(invoiceSheet, clone);

    // html2canvas gets only this isolated, inline-styled clone. No stylesheet
    // containing Tailwind's oklab/oklch values is present in the export tree.
    await nextFrame();

    const height = Math.max(
      Math.ceil(sourceHeight),
      Math.ceil(clone.scrollHeight),
      Math.ceil(clone.getBoundingClientRect().height),
      1,
    );

    const renderScale = 2;
    const canvas = await html2canvas(clone, {
      scale: renderScale,
      width,
      height,
      windowWidth: width,
      windowHeight: Math.max(height, 1000),
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      removeContainer: true,
      onclone: (clonedDocument) => {
        // Remove every stylesheet from html2canvas's cloned document. All visible
        // appearance is already frozen as inline styles above.
        clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
        const root = clonedDocument.querySelector('[data-pdf-export="true"]') as HTMLElement | null;
        if (root) {
          root.style.position = 'static';
          root.style.left = 'auto';
          root.style.top = 'auto';
          root.style.transform = 'none';
        }
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('Could not render invoice for PDF export.');
    }

    return canvas;
  } finally {
    holder.remove();
  }
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');

  const invoiceSheet = source.querySelector<HTMLElement>('.print-container') || source;
  const canvas = await renderInvoiceToCanvas(invoiceSheet);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imageWidthPx = canvas.width;
  const imageHeightPx = canvas.height;

  // Fit the rendered invoice to the A4 page without distorting the layout.
  // The same proportional scale is used for every page, so text and spacing
  // remain consistent with the preview.
  const cssWidth = Math.max(1, invoiceSheet.getBoundingClientRect().width || 794);
  const cssHeight = Math.max(1, imageHeightPx / 2);
  const scaleToPage = pdfWidth / (cssWidth * 25.4 / 96);
  const pageHeightFromCanvas = cssHeight * 25.4 / 96 * scaleToPage;

  if (pageHeightFromCanvas <= pdfHeight + 0.5) {
    const imageHeightMm = Math.min(pdfHeight, Math.max(1, pageHeightFromCanvas));
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      pdfWidth,
      imageHeightMm,
      undefined,
      'FAST',
    );
  } else {
    // Multi-page invoices: crop the source canvas vertically at exact A4 page
    // boundaries while keeping the same horizontal scale on every page.
    const pageCanvasHeight = Math.max(
      1,
      Math.floor((imageHeightPx * pdfHeight) / pageHeightFromCanvas),
    );

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < imageHeightPx) {
      const sliceHeight = Math.min(pageCanvasHeight, imageHeightPx - offsetY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imageWidthPx;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not prepare PDF page.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        offsetY,
        imageWidthPx,
        sliceHeight,
        0,
        0,
        imageWidthPx,
        sliceHeight,
      );

      if (pageIndex > 0) pdf.addPage();
      const sliceHeightMm = (sliceHeight / imageHeightPx) * pageHeightFromCanvas;
      pdf.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        0,
        0,
        pdfWidth,
        sliceHeightMm,
        undefined,
        'FAST',
      );

      offsetY += sliceHeight;
      pageIndex += 1;
    }
  }

  pdf.save(getSafeFilename(invoiceNumber));
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

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

const nextFrame = (win: Window = window) => new Promise<void>((resolve) => {
  win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
});

const getSafeFilename = (invoiceNumber: string) => {
  const safeNumber = String(invoiceNumber || 'invoice')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim();
  return `Invoice-${safeNumber || 'invoice'}.pdf`;
};

const legacyColorContext = document.createElement('canvas').getContext('2d');
const unsupportedColorPattern = /(?:oklch|oklab|color)\s*\(/i;

const toLegacyColor = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'none') return raw;
  if (!legacyColorContext) return '#000000';

  try {
    legacyColorContext.fillStyle = '#000000';
    legacyColorContext.fillStyle = raw;
    return legacyColorContext.fillStyle || '#000000';
  } catch {
    return '#000000';
  }
};

const isColorProperty = (property: string) =>
  property === 'color' || property === 'caret-color' || property.endsWith('color');

const sanitizeComputedValue = (property: string, value: string, computed: CSSStyleDeclaration) => {
  if (!unsupportedColorPattern.test(value)) return value;

  if (isColorProperty(property)) return toLegacyColor(value);

  if (property.includes('shadow') ||
      property === 'background-image' ||
      property === 'mask-image' ||
      property === 'mask-border-source' ||
      property === 'border-image-source' ||
      property === 'filter' ||
      property === 'backdrop-filter') {
    return 'none';
  }

  if (property === 'background') {
    return toLegacyColor(computed.backgroundColor);
  }

  return null;
};

/**
 * Rebuild the invoice using only inline, browser-computed CSS values.
 * The isolated iframe has no application stylesheets, which prevents Tailwind
 * color functions such as oklab()/oklch() from reaching html2canvas's parser.
 */
const buildIsolatedInvoice = (source: HTMLElement) => {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const clone = source.cloneNode(true) as HTMLElement;
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

      const rawValue = computed.getPropertyValue(property);
      if (!rawValue) continue;

      const safeValue = sanitizeComputedValue(property, rawValue, computed);
      if (safeValue === null) continue;

      try {
        cloneNode.style.setProperty(property, safeValue, computed.getPropertyPriority(property));
      } catch {
        // Ignore browser-generated declarations that cannot be reapplied.
      }
    }

    const colorPairs: Array<[string, string]> = [
      ['color', computed.color],
      ['background-color', computed.backgroundColor],
      ['border-top-color', computed.borderTopColor],
      ['border-right-color', computed.borderRightColor],
      ['border-bottom-color', computed.borderBottomColor],
      ['border-left-color', computed.borderLeftColor],
      ['outline-color', computed.outlineColor],
      ['text-decoration-color', computed.textDecorationColor],
    ];

    for (const [property, value] of colorPairs) {
      if (!value || value === 'transparent') continue;
      try {
        cloneNode.style.setProperty(property, toLegacyColor(value));
      } catch {
        // Ignore individual color declarations that fail in the browser.
      }
    }

    // Presentation attributes can also carry CSS colors (notably SVG content).
    // Convert/remove those explicitly so html2canvas never sees oklab/oklch here.
    for (const attribute of [
      'fill',
      'stroke',
      'stop-color',
      'flood-color',
      'lighting-color',
      'color',
    ]) {
      const value = cloneNode.getAttribute(attribute);
      if (value && unsupportedColorPattern.test(value)) {
        cloneNode.setAttribute(attribute, toLegacyColor(value));
      }
    }
  }

  clone.style.position = 'static';
  clone.style.left = 'auto';
  clone.style.top = 'auto';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxSizing = 'border-box';

  return clone;
};

const renderInvoiceToCanvas = async (invoiceSheet: HTMLElement) => {
  await waitForInvoiceAssets(invoiceSheet);
  await nextFrame();

  const rect = invoiceSheet.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || invoiceSheet.scrollWidth || 794));
  const isolated = buildIsolatedInvoice(invoiceSheet);
  isolated.style.width = `${width}px`;
  isolated.style.minWidth = `${width}px`;
  isolated.style.maxWidth = `${width}px`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-100000px';
  iframe.style.top = '0';
  iframe.style.width = `${width}px`;
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const isolatedDocument = iframe.contentDocument;
    const isolatedWindow = iframe.contentWindow;
    if (!isolatedDocument || !isolatedWindow) {
      throw new Error('Could not create isolated PDF rendering document.');
    }

    isolatedDocument.open();
    isolatedDocument.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}"></head><body></body></html>`);
    isolatedDocument.close();

    isolatedDocument.documentElement.style.margin = '0';
    isolatedDocument.documentElement.style.padding = '0';
    isolatedDocument.body.style.margin = '0';
    isolatedDocument.body.style.padding = '0';
    isolatedDocument.body.style.width = `${width}px`;
    isolatedDocument.body.style.minWidth = `${width}px`;
    isolatedDocument.body.style.background = '#ffffff';
    isolatedDocument.body.style.overflow = 'visible';

    isolatedDocument.body.appendChild(isolated);

    // The iframe has no stylesheet, so wait for local assets only.
    await waitForInvoiceAssets(isolated, isolatedDocument);
    await nextFrame(isolatedWindow);

    const height = Math.max(
      1,
      Math.ceil(isolated.scrollHeight),
      Math.ceil(isolated.getBoundingClientRect().height),
    );

    isolated.style.height = `${height}px`;
    isolated.style.minHeight = `${height}px`;

    // Final defensive sweep for any CSS-bearing attribute that may have survived.
    isolated.querySelectorAll<HTMLElement>('[style]').forEach((node) => {
      if (unsupportedColorPattern.test(node.getAttribute('style') || '')) {
        node.removeAttribute('style');
      }
    });

    await nextFrame(isolatedWindow);

    const canvas = await html2canvas(isolated, {
      scale: 2,
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
      foreignObjectRendering: true,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('Could not render invoice for PDF export.');
    }

    return canvas;
  } finally {
    iframe.remove();
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
  const imageHeightMm = (imageHeightPx * pdfWidth) / imageWidthPx;

  if (imageHeightMm <= pdfHeight + 0.01) {
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
    const pageCanvasHeight = Math.max(1, Math.floor((imageWidthPx * pdfHeight) / pdfWidth));
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
      ctx.drawImage(canvas, 0, offsetY, imageWidthPx, sliceHeight, 0, 0, imageWidthPx, sliceHeight);

      if (pageIndex > 0) pdf.addPage();
      const sliceHeightMm = (sliceHeight * pdfWidth) / imageWidthPx;
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

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile, InvoiceSettings } from '../types';

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
  const safeNumber = String(invoiceNumber || 'invoice').replace(/[\\/:*?"<>|]+/g, '-').trim();
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

const isColorProperty = (property: string) => property === 'color' || property === 'caret-color' || property.endsWith('color');

const sanitizeComputedValue = (property: string, value: string, computed: CSSStyleDeclaration) => {
  if (!unsupportedColorPattern.test(value)) return value;
  if (isColorProperty(property)) return toLegacyColor(value);
  if (property.includes('shadow') || property === 'background-image' || property === 'mask-image' || property === 'mask-border-source' || property === 'border-image-source' || property === 'filter' || property === 'backdrop-filter') return 'none';
  if (property === 'background') return toLegacyColor(computed.backgroundColor);
  return null;
};

const buildDesktopInvoice = async (source: HTMLElement, doc: Document, win: Window, width: number) => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.style.position = 'static';
  clone.style.left = 'auto';
  clone.style.top = 'auto';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxSizing = 'border-box';

  for (const node of Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))) {
    doc.head.appendChild(node.cloneNode(true));
  }

  doc.body.appendChild(clone);
  await waitForInvoiceAssets(clone, doc);
  await nextFrame(win);

  // Freeze the desktop computed layout so responsive/mobile rules cannot
  // change the PDF, while converting every modern color function to a legacy
  // color that html2canvas can parse safely.
  const nodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  for (const node of nodes) {
    const computed = win.getComputedStyle(node);
    const properties: Array<[string, string]> = [];

    for (let p = 0; p < computed.length; p += 1) {
      const property = computed.item(p);
      if (!property || property.startsWith('--')) continue;
      const rawValue = computed.getPropertyValue(property);
      if (!rawValue) continue;
      const safeValue = sanitizeComputedValue(property, rawValue, computed);
      if (safeValue !== null) properties.push([property, safeValue]);
    }

    node.removeAttribute('class');
    node.removeAttribute('style');

    for (const [property, value] of properties) {
      try { node.style.setProperty(property, value); } catch { /* ignore */ }
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
      try { node.style.setProperty(property, toLegacyColor(value)); } catch { /* ignore */ }
    }

    for (const attribute of ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color']) {
      const value = node.getAttribute(attribute);
      if (value && unsupportedColorPattern.test(value)) node.setAttribute(attribute, toLegacyColor(value));
    }
  }

  // Prevent any descendant from extending the capture area horizontally.
  // This is important for invoice tables/long text on desktop and mobile.
  for (const node of [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]) {
    node.style.maxWidth = '100%';
    node.style.boxSizing = 'border-box';
    if (node.tagName === 'TABLE') {
      node.style.width = '100%';
      node.style.minWidth = '0';
    }
    if (node.tagName === 'IMG') node.style.maxWidth = '100%';
  }

  clone.style.position = 'static';
  clone.style.margin = '0';
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.height = 'auto';
  clone.style.minHeight = '0';
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxSizing = 'border-box';
  return clone;
};

const renderInvoiceToCanvas = async (invoiceSheet: HTMLElement) => {
  await waitForInvoiceAssets(invoiceSheet);
  await nextFrame();

  const DESKTOP_CSS_WIDTH = 896;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-100000px';
  iframe.style.top = '0';
  iframe.style.width = `${DESKTOP_CSS_WIDTH}px`;
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const isolatedDocument = iframe.contentDocument;
    const isolatedWindow = iframe.contentWindow;
    if (!isolatedDocument || !isolatedWindow) throw new Error('Could not create isolated PDF rendering document.');

    isolatedDocument.open();
    isolatedDocument.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}"></head><body></body></html>`);
    isolatedDocument.close();
    isolatedDocument.documentElement.style.margin = '0';
    isolatedDocument.documentElement.style.padding = '0';
    isolatedDocument.body.style.margin = '0';
    isolatedDocument.body.style.padding = '0';
    isolatedDocument.body.style.width = `${DESKTOP_CSS_WIDTH}px`;
    isolatedDocument.body.style.minWidth = `${DESKTOP_CSS_WIDTH}px`;
    isolatedDocument.body.style.background = '#ffffff';
    isolatedDocument.body.style.overflow = 'visible';

    const isolated = await buildDesktopInvoice(invoiceSheet, isolatedDocument, isolatedWindow, DESKTOP_CSS_WIDTH);
    await nextFrame(isolatedWindow);

    const rect = isolated.getBoundingClientRect();
    const height = Math.max(1, Math.ceil(isolated.scrollHeight), Math.ceil(rect.height));
    isolated.style.height = `${height}px`;
    isolated.style.minHeight = `${height}px`;
    isolated.style.overflow = 'visible';
    await nextFrame(isolatedWindow);

    const canvas = await html2canvas(isolated, {
      scale: 2,
      width: DESKTOP_CSS_WIDTH,
      height,
      windowWidth: DESKTOP_CSS_WIDTH,
      windowHeight: Math.max(height, 1200),
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
      foreignObjectRendering: false,
    });
    if (!canvas.width || !canvas.height) throw new Error('Could not render invoice for PDF export.');
    return { canvas, cssWidth: DESKTOP_CSS_WIDTH, cssHeight: height };
  } finally {
    iframe.remove();
  }
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');
  const invoiceSheet = source.querySelector<HTMLElement>('.print-container') || source;
  const { canvas, cssWidth, cssHeight } = await renderInvoiceToCanvas(invoiceSheet);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const cssPxToMm = 25.4 / 96;
  const sidePaddingMm = 4;
  const maxWidthMm = pageWidth - sidePaddingMm * 2;
  const naturalWidthMm = cssWidth * cssPxToMm;
  const scale = Math.min(1, maxWidthMm / naturalWidthMm);
  const imageWidthMm = naturalWidthMm * scale;
  const imageHeightMm = cssHeight * cssPxToMm * scale;
  const leftMargin = Math.max(0, (pageWidth - imageWidthMm) / 2);

  // The canvas already represents the complete invoice width. Never crop it
  // horizontally; only split the image vertically when it needs more than one
  // A4 page.
  const imageData = canvas.toDataURL('image/jpeg', 0.95);

  if (imageHeightMm <= pageHeight) {
    pdf.addImage(imageData, 'JPEG', leftMargin, 0, imageWidthMm, imageHeightMm, undefined, 'FAST');
  } else {
    const pageCssHeight = pageHeight / cssPxToMm / scale;
    const pageCanvasHeight = Math.max(1, Math.floor(pageCssHeight * 2));
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
      const sliceHeightMm = (sliceHeight / 2) * cssPxToMm * scale;
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', leftMargin, 0, imageWidthMm, sliceHeightMm, undefined, 'FAST');

      offsetY += sliceHeight;
      pageIndex += 1;
    }
  }

  pdf.save(getSafeFilename(invoiceNumber));
};

const DEFAULT_WHATSAPP_MESSAGE = 'Dear {{client_name}},\n\nThank you for choosing {{business_name}}. Please find your invoice details below for your {{event_type}} event.\n\nThank you!';
const DEFAULT_EMAIL_MESSAGE = 'Dear {{client_name}},\n\nThank you for choosing {{business_name}}. Please find your invoice details below for your {{event_type}} event.\n\nPlease contact us if you have any questions.';

const interpolateMessage = (template: string, invoice: Invoice, profile: BusinessProfile) => template
  .replace(/{{\s*client_name\s*}}/gi, invoice.clientName || '')
  .replace(/{{\s*business_name\s*}}/gi, profile.businessName || '')
  .replace(/{{\s*event_type\s*}}/gi, invoice.eventType || '')
  .replace(/{{\s*invoice_number\s*}}/gi, invoice.invoiceNumber || '')
  .replace(/{{\s*event_date\s*}}/gi, invoice.eventDate || '')
  .replace(/{{\s*event_time\s*}}/gi, invoice.eventTime || '')
  .replace(/{{\s*venue\s*}}/gi, invoice.venue || 'TBA')
  .replace(/{{\s*total_amount\s*}}/gi, `${profile.currencySymbol}${Number(invoice.totalAmount || 0).toLocaleString()}`)
  .replace(/{{\s*advance_paid\s*}}/gi, `${profile.currencySymbol}${Number(invoice.advancePaid || 0).toLocaleString()}`)
  .replace(/{{\s*remaining_balance\s*}}/gi, `${profile.currencySymbol}${Number(invoice.remainingBalance || 0).toLocaleString()}`)
  .replace(/{{\s*payment_status\s*}}/gi, invoice.paymentStatus || 'Pending');

const buildInvoiceDetails = (invoice: Invoice, profile: BusinessProfile, email = false) => {
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount || 0).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance || 0).toLocaleString()}`;
  const lines = [email ? 'Invoice Details' : '*Invoice Details*', `Invoice No: #${invoice.invoiceNumber}`, `Event: ${invoice.eventType}`, `Event Date: ${invoice.eventDate}${invoice.eventTime ? ` (${invoice.eventTime})` : ''}`, `Venue: ${invoice.venue || 'TBA'}`, `Total Amount: ${formattedTotal}`, `Advance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid || 0).toLocaleString()}`, `Remaining Balance: ${formattedRemaining}`, `Payment Status: ${invoice.paymentStatus}`];
  if (invoice.guestCount) lines.push(`Guests: ${invoice.guestCount}`);
  return lines.join('\n');
};

const getTemplateMessage = (template: string | undefined, fallback: string, invoice: Invoice, profile: BusinessProfile) => interpolateMessage((template || fallback).trim(), invoice, profile).trim();

export const generateWhatsAppUrl = (invoice: Invoice, profile: BusinessProfile, settings?: InvoiceSettings): string => {
  const cleanPhone = (invoice.clientWhatsApp || invoice.clientPhone || '').replace(/[^0-9]/g, '');
  const intro = getTemplateMessage(settings?.whatsappMessageTemplate, DEFAULT_WHATSAPP_MESSAGE, invoice, profile);
  const message = `${intro}${intro ? '\n\n' : ''}${buildInvoiceDetails(invoice, profile, false)}${profile.invoiceFooterText ? `\n\n${profile.invoiceFooterText}` : ''}`;
  if (cleanPhone) return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const generateEmailMailto = (invoice: Invoice, profile: BusinessProfile, settings?: InvoiceSettings): string => {
  const subject = `Invoice #${invoice.invoiceNumber} from ${profile.businessName}`;
  const intro = getTemplateMessage(settings?.emailMessageTemplate, DEFAULT_EMAIL_MESSAGE, invoice, profile);
  const details = buildInvoiceDetails(invoice, profile, true);
  const terms = invoice.termsAndConditions || profile.defaultTerms || '';
  const footer = profile.invoiceFooterText || 'Thank you for your business!';
  const body = `${intro}${intro ? '\n\n' : ''}${details}${terms ? `\n\nTerms & Conditions:\n${terms}` : ''}\n\n${footer}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;
  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
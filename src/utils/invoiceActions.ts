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
      try { cloneNode.style.setProperty(property, safeValue, computed.getPropertyPriority(property)); } catch { /* ignore unsupported browser declarations */ }
    }

    const colorPairs: Array<[string, string]> = [
      ['color', computed.color], ['background-color', computed.backgroundColor], ['border-top-color', computed.borderTopColor],
      ['border-right-color', computed.borderRightColor], ['border-bottom-color', computed.borderBottomColor], ['border-left-color', computed.borderLeftColor],
      ['outline-color', computed.outlineColor], ['text-decoration-color', computed.textDecorationColor],
    ];
    for (const [property, value] of colorPairs) {
      if (!value || value === 'transparent') continue;
      try { cloneNode.style.setProperty(property, toLegacyColor(value)); } catch { /* ignore */ }
    }

    for (const attribute of ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color']) {
      const value = cloneNode.getAttribute(attribute);
      if (value && unsupportedColorPattern.test(value)) cloneNode.setAttribute(attribute, toLegacyColor(value));
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
  const sourceRect = invoiceSheet.getBoundingClientRect();
  const width = Math.max(1, Math.round(sourceRect.width || invoiceSheet.scrollWidth || 794));
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
    if (!isolatedDocument || !isolatedWindow) throw new Error('Could not create isolated PDF rendering document.');
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

    await waitForInvoiceAssets(isolated, isolatedDocument);
    await nextFrame(isolatedWindow);
    const height = Math.max(1, Math.ceil(isolated.scrollHeight), Math.ceil(isolated.getBoundingClientRect().height));
    isolated.style.height = `${height}px`;
    isolated.style.minHeight = `${height}px`;
    await nextFrame(isolatedWindow);

    const canvas = await html2canvas(isolated, {
      scale: 2,
      width,
      height,
      windowWidth: width,
      windowHeight: Math.max(height, 1000),
      x: 0, y: 0, scrollX: 0, scrollY: 0,
      backgroundColor: '#ffffff',
      useCORS: true, allowTaint: false, imageTimeout: 15000, logging: false,
      removeContainer: true, foreignObjectRendering: true,
    });
    if (!canvas.width || !canvas.height) throw new Error('Could not render invoice for PDF export.');
    return { canvas, cssWidth: width, cssHeight: height };
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
  const imageWidthMm = cssWidth * cssPxToMm;
  const imageHeightMm = cssHeight * cssPxToMm;
  const leftMargin = Math.max(0, (pageWidth - imageWidthMm) / 2);

  if (imageHeightMm <= pageHeight) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', leftMargin, 0, imageWidthMm, imageHeightMm, undefined, 'FAST');
  } else {
    const pageCanvasHeight = Math.max(1, Math.floor(pageHeight / cssPxToMm * 2));
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
      const sliceHeightMm = (sliceHeight / 2) * cssPxToMm;
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
  const lines = [
    email ? 'Invoice Details' : `*Invoice Details*`,
    `Invoice No: #${invoice.invoiceNumber}`,
    `Event: ${invoice.eventType}`,
    `Event Date: ${invoice.eventDate}${invoice.eventTime ? ` (${invoice.eventTime})` : ''}`,
    `Venue: ${invoice.venue || 'TBA'}`,
    `Total Amount: ${formattedTotal}`,
    `Advance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid || 0).toLocaleString()}`,
    `Remaining Balance: ${formattedRemaining}`,
    `Payment Status: ${invoice.paymentStatus}`,
  ];
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
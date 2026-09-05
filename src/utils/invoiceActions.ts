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

/**
 * html2canvas 1.x cannot parse modern CSS color functions such as oklch()/oklab().
 * The important detail is that html2canvas can still inspect CSS rules from the
 * cloned document, so changing only inline colors is not sufficient. We build a
 * fully self-contained export clone: copy computed styles inline, remove stylesheets,
 * and drop any remaining property whose value contains an unsupported color function.
 */
const legacyColorContext = document.createElement('canvas').getContext('2d');

const isModernColor = (value: string) => /\b(?:oklch|oklab|color)\s*\(/i.test(String(value || ''));

const toLegacyColor = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'none') return raw;
  if (!legacyColorContext) return raw;

  try {
    legacyColorContext.fillStyle = '#000000';
    legacyColorContext.fillStyle = raw;
    const resolved = legacyColorContext.fillStyle;
    return resolved || raw;
  } catch {
    return raw;
  }
};

const COLOR_PROPS = new Set([
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  'caret-color',
  'accent-color',
  'fill',
  'stroke',
]);

const RISKY_COLOR_PROPS = new Set([
  'background',
  'background-image',
  'border-image',
  'border-image-source',
  'box-shadow',
  'text-shadow',
  'filter',
  'backdrop-filter',
  'mask',
  'mask-image',
  'mask-border',
  'clip-path',
]);

const copyComputedStylesSafely = (source: HTMLElement, target: HTMLElement) => {
  const computed = window.getComputedStyle(source);
  target.removeAttribute('class');

  for (let i = 0; i < computed.length; i += 1) {
    const property = computed[i];
    const value = computed.getPropertyValue(property);
    if (!property || value === '') continue;

    const normalizedProperty = property.toLowerCase();

    if (COLOR_PROPS.has(normalizedProperty)) {
      target.style.setProperty(property, toLegacyColor(value));
      continue;
    }

    if (isModernColor(value)) {
      // html2canvas may parse these even when they come from a non-color shorthand.
      // For gradients/shadows/masks, dropping the decoration is safer than failing
      // the entire PDF. The underlying layout and solid colors remain intact.
      if (RISKY_COLOR_PROPS.has(normalizedProperty)) {
        if (normalizedProperty === 'background' || normalizedProperty === 'background-image') {
          target.style.setProperty('background-image', 'none');
        } else if (normalizedProperty === 'box-shadow' || normalizedProperty === 'text-shadow') {
          target.style.setProperty(normalizedProperty, 'none');
        } else {
          target.style.setProperty(normalizedProperty, 'none');
        }
      }
      continue;
    }

    // Avoid copying browser-owned/internal properties that cannot be reassigned.
    try {
      target.style.setProperty(property, value);
    } catch {
      // Ignore an individual CSS property and continue exporting.
    }
  }

  target.style.setProperty('animation', 'none');
  target.style.setProperty('transition', 'none');
}

const normalizeExportTree = (root: HTMLElement) => {
  const sourceNodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const targetNodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (let i = 0; i < targetNodes.length; i += 1) {
    if (sourceNodes[i] && targetNodes[i]) copyComputedStylesSafely(sourceNodes[i], targetNodes[i]);
  }
};

const stripStylesheets = (doc: Document) => {
  doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const source = document.getElementById(elementId) as HTMLElement | null;
  if (!source) throw new Error('Invoice preview element not found.');

  await waitForInvoiceAssets(source);
  await nextFrame();

  // Capture only a fixed A4-like width, not the horizontally scrollable UI wrapper.
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
    normalizeExportTree(clone);
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
        if (!clonedRoot) return;
        stripStylesheets(clonedDocument);
        normalizeExportTree(clonedRoot);
        clonedRoot.style.setProperty('width', '794px');
        clonedRoot.style.setProperty('max-width', '794px');
        clonedRoot.style.setProperty('overflow', 'visible');
        clonedRoot.style.setProperty('background', '#ffffff');
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

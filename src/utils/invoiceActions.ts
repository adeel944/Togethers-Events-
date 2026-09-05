import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => {
  window.print();
};

const hasModernColorFunction = (value: string): boolean =>
  /\b(?:oklch|oklab)\s*\(/i.test(value);

const parseNumber = (value: string, fallback = 0): number => {
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) ? n : fallback;
};

const parseLightness = (value: string): number => {
  const trimmed = value.trim();
  return trimmed.endsWith('%') ? parseNumber(trimmed) / 100 : parseNumber(trimmed);
};

const parseChroma = (value: string): number => {
  const trimmed = value.trim();
  return trimmed.endsWith('%') ? (parseNumber(trimmed) / 100) * 0.4 : parseNumber(trimmed);
};

const parseAlpha = (value?: string): number => {
  if (!value) return 1;
  const trimmed = value.trim();
  const alpha = trimmed.endsWith('%') ? parseNumber(trimmed) / 100 : parseNumber(trimmed);
  return Math.min(1, Math.max(0, alpha));
};

const gammaEncode = (value: number): number => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
};

const oklabToCssRgb = (L: number, a: number, b: number, alpha = 1): string => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = 4.076741661347994 * l - 3.3077115913 * m + 0.230969929981 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const R = Math.round(gammaEncode(r) * 255);
  const G = Math.round(gammaEncode(g) * 255);
  const B = Math.round(gammaEncode(blue) * 255);

  return alpha < 0.999
    ? `rgba(${R}, ${G}, ${B}, ${Number(alpha.toFixed(4))})`
    : `rgb(${R}, ${G}, ${B})`;
};

const replaceModernColors = (value: string): string => {
  let result = value;

  result = result.replace(
    /oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\)]+))?\s*\)/gi,
    (_match, lightness, chroma, hue, alpha) => {
      const L = parseLightness(lightness);
      const C = parseChroma(chroma);
      const H = (parseNumber(hue) * Math.PI) / 180;
      return oklabToCssRgb(L, C * Math.cos(H), C * Math.sin(H), parseAlpha(alpha));
    }
  );

  result = result.replace(
    /oklab\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\)]+))?\s*\)/gi,
    (_match, lightness, a, b, alpha) => {
      return oklabToCssRgb(
        parseLightness(lightness),
        parseChroma(a),
        parseChroma(b),
        parseAlpha(alpha)
      );
    }
  );

  return result;
};

const normalizeClonedColors = (
  source: HTMLElement,
  clonedDocument: Document,
  clonedElement: HTMLElement
): void => {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>('*'))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;

    const styles = getComputedStyle(sourceNode);
    for (let i = 0; i < styles.length; i += 1) {
      const property = styles.item(i);
      const value = styles.getPropertyValue(property);
      if (!value || !hasModernColorFunction(value)) continue;

      const normalized = replaceModernColors(value);
      if (normalized !== value) {
        try {
          cloneNode.style.setProperty(property, normalized, styles.getPropertyPriority(property));
        } catch {
          // Ignore an individual unsupported CSS property.
        }
      }
    }
  });

  // Normalize the CSS variables as well, so inherited Tailwind color tokens
  // cannot reintroduce OKLCH values while html2canvas renders the clone.
  const styleSheets = Array.from(clonedDocument.querySelectorAll<HTMLStyleElement>('style'));
  styleSheets.forEach((style) => {
    if (!style.textContent || !hasModernColorFunction(style.textContent)) return;
    style.textContent = replaceModernColors(style.textContent);
  });
};

const waitForImages = async (root: HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          window.setTimeout(done, 15000);
        })
    )
  );
};

export const downloadInvoicePdf = async (
  elementId: string,
  invoiceNumber: string
): Promise<void> => {
  const preview = document.getElementById(elementId);
  if (!preview) throw new Error('Invoice preview element not found');

  const invoiceElement = preview.querySelector<HTMLElement>('.print-container');
  if (!invoiceElement) throw new Error('Invoice document element not found');

  try {
    await document.fonts?.ready;
    await waitForImages(invoiceElement);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const rect = invoiceElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error('Invoice has invalid dimensions');
    }

    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      removeContainer: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      windowWidth: Math.max(document.documentElement.clientWidth, Math.ceil(rect.width)),
      windowHeight: Math.max(window.innerHeight, Math.ceil(rect.height)),
      onclone: (clonedDocument, clonedElement) => {
        normalizeClonedColors(invoiceElement, clonedDocument, clonedElement as HTMLElement);
      },
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
    const margin = 8;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png', 1.0);

    let remainingHeight = imageHeight;
    let offsetY = 0;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin - offsetY,
        imageWidth,
        imageHeight,
        undefined,
        'FAST'
      );

      remainingHeight -= pageHeight - margin * 2;
      offsetY += pageHeight - margin * 2;
      pageIndex += 1;
    }

    pdf.save(`Invoice-${invoiceNumber}.pdf`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown PDF export error');
    throw new Error(`PDF export failed: ${message}`);
  }
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
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;

  const body = `Dear ${invoice.clientName},\n\nPlease find your invoice details below from ${profile.businessName}:\n\nInvoice Number: #${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nEvent: ${invoice.eventType}\nEvent Date: ${invoice.eventDate}\nVenue: ${invoice.venue || 'TBA'}\n\nTotal Amount: ${formattedTotal}\nAdvance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}\nRemaining Balance: ${formattedRemaining}\nPayment Status: ${invoice.paymentStatus}\n\nTerms & Conditions:\n${invoice.termsAndConditions || profile.defaultTerms}\n\n${profile.invoiceFooterText || 'Thank you for your business!'}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;

  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

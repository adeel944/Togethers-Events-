import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => {
  window.print();
};

const replaceModernColors = (value: string): string => {
  if (!value || !/\b(?:oklch|oklab)\s*\(/i.test(value)) return value;

  const parse = (v: string, fallback = 0) => {
    const n = Number.parseFloat(v.trim());
    return Number.isFinite(n) ? n : fallback;
  };
  const light = (v: string) => v.trim().endsWith('%') ? parse(v) / 100 : parse(v);
  const chroma = (v: string) => v.trim().endsWith('%') ? (parse(v) / 100) * 0.4 : parse(v);
  const alpha = (v?: string) => v ? Math.max(0, Math.min(1, v.trim().endsWith('%') ? parse(v) / 100 : parse(v))) : 1;
  const gamma = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  const rgb = (L: number, a: number, b: number, A = 1) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const r = 4.076741661347994 * l - 3.3077115913 * m + 0.230969929981 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const R = Math.round(gamma(r) * 255);
    const G = Math.round(gamma(g) * 255);
    const B = Math.round(gamma(bl) * 255);
    return A < 0.999 ? `rgba(${R}, ${G}, ${B}, ${Number(A.toFixed(4))})` : `rgb(${R}, ${G}, ${B})`;
  };

  let result = value.replace(/oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\)]+))?\s*\)/gi,
    (_m, L, C, H, A) => {
      const hue = (parse(H) * Math.PI) / 180;
      return rgb(light(L), chroma(C) * Math.cos(hue), chroma(C) * Math.sin(hue), alpha(A));
    });

  result = result.replace(/oklab\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\)]+))?\s*\)/gi,
    (_m, L, a, b, A) => rgb(light(L), chroma(a), chroma(b), alpha(A)));

  return result;
};

const normalizeClonedStyles = (source: HTMLElement, clone: HTMLElement): void => {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;
    const styles = getComputedStyle(sourceNode);

    // Copy only the color-related computed properties. Keep the DOM, classes,
    // spacing, sizing and typography untouched so the visible design remains identical.
    const colorProperties = [
      'color', 'background-color', 'border-top-color', 'border-right-color',
      'border-bottom-color', 'border-left-color', 'outline-color',
      'text-decoration-color', 'column-rule-color', 'caret-color',
    ];

    colorProperties.forEach((property) => {
      const value = styles.getPropertyValue(property);
      if (!value) return;
      const normalized = replaceModernColors(value);
      if (normalized !== value) {
        cloneNode.style.setProperty(property, normalized);
      }
    });
  });
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
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const rect = invoiceElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) throw new Error('Invoice has invalid dimensions');

    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      removeContainer: true,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      width: Math.ceil(invoiceElement.scrollWidth),
      height: Math.ceil(invoiceElement.scrollHeight),
      windowWidth: document.documentElement.clientWidth,
      windowHeight: window.innerHeight,
      onclone: (_doc, clonedElement) => {
        normalizeClonedStyles(invoiceElement, clonedElement as HTMLElement);
      },
    });

    if (canvas.width === 0 || canvas.height === 0) throw new Error('Invoice rendered to an empty canvas');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 0;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    // Scale the captured screen invoice proportionally onto A4 without altering its layout.
    let remaining = imageHeight;
    let y = margin;
    let page = 0;
    const contentHeight = pageHeight - margin * 2;
    while (remaining > 0) {
      if (page > 0) {
        pdf.addPage();
        y = margin - (imageHeight - remaining);
      }
      pdf.addImage(imgData, 'PNG', margin, y, imageWidth, imageHeight, undefined, 'FAST');
      remaining -= contentHeight;
      page += 1;
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
  const cleanPhone = (invoice.clientWhatsApp || invoice.clientPhone || '').replace(/[^0-9]/g, '');
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const message = [
    `Dear ${invoice.clientName}`,
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
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const generateEmailMailto = (
  invoice: Invoice,
  profile: BusinessProfile
): string => {
  const subject = `Invoice #${invoice.invoiceNumber} from ${profile.businessName}`;
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const body = `Dear ${invoice.clientName},\n\nPlease find your invoice details below from ${profile.businessName}:\n\nInvoice Number: #${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nEvent: ${invoice.eventType}\nEvent Date: ${invoice.eventDate}\nVenue: ${invoice.venue || 'TBA'}\n\nTotal Amount: ${formattedTotal}\nAdvance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}\nRemaining Balance: ${formattedRemaining}\nPayment Status: ${invoice.paymentStatus}\n\nTerms & Conditions:\n${invoice.termsAndConditions || profile.defaultTerms}\n\n${profile.invoiceFooterText || 'Thank you for your business!'}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;
  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
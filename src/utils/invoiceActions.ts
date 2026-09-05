import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => {
  window.print();
};

const hasUnsupportedColor = (value: string): boolean => /\b(?:oklch|oklab|color\()/i.test(value);

const resolveColor = (value: string): string => {
  if (!value || value === 'transparent') return value;
  const probe = document.createElement('span');
  probe.style.color = value;
  if (!probe.style.color) return 'rgb(0, 0, 0)';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || 'rgb(0, 0, 0)';
};

const copyComputedStyles = (source: Element, target: Element): void => {
  const sourceStyles = getComputedStyle(source);
  const targetStyle = (target as HTMLElement).style;
  for (let i = 0; i < sourceStyles.length; i += 1) {
    const property = sourceStyles.item(i);
    const value = sourceStyles.getPropertyValue(property);
    if (!value || hasUnsupportedColor(value)) continue;
    try { targetStyle.setProperty(property, value); } catch { /* ignore */ }
  }

  const colorProperties = [
    'color', 'background-color', 'border-top-color', 'border-right-color',
    'border-bottom-color', 'border-left-color', 'outline-color',
    'text-decoration-color', 'column-rule-color', 'caret-color', 'accent-color',
  ];
  colorProperties.forEach((property) => {
    const value = sourceStyles.getPropertyValue(property);
    if (!value || hasUnsupportedColor(value)) return;
    try { targetStyle.setProperty(property, resolveColor(value)); } catch { /* ignore */ }
  });

  ['background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'outline', 'text-decoration', 'box-shadow'].forEach((property) => targetStyle.removeProperty(property));
};

const buildIsolatedPdfFrame = (source: HTMLElement): HTMLIFrameElement => {
  const rect = source.getBoundingClientRect();
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed', left: '-100000px', top: '0',
    width: `${Math.ceil(rect.width)}px`, height: `${Math.ceil(rect.height)}px`,
    border: '0', opacity: '0', pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    iframe.remove();
    throw new Error('PDF export frame could not be initialized');
  }
  frameDocument.open();
  frameDocument.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  frameDocument.close();
  frameDocument.body.style.margin = '0';
  frameDocument.body.style.padding = '0';
  frameDocument.body.style.background = '#ffffff';
  frameDocument.body.style.overflow = 'visible';

  const clone = source.cloneNode(true) as HTMLElement;
  const sourceNodes = [source, ...Array.from(source.querySelectorAll('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';
  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (cloneNode) copyComputedStyles(sourceNode, cloneNode);
  });
  frameDocument.body.appendChild(clone);
  return iframe;
};

const waitForImages = async (root: HTMLElement): Promise<void> => {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map((img) =>
    new Promise<void>((resolve) => {
      if (img.complete) return resolve();
      const finish = () => resolve();
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      window.setTimeout(finish, 15000);
    })
  ));
};

export const downloadInvoicePdf = async (elementId: string, invoiceNumber: string): Promise<void> => {
  const preview = document.getElementById(elementId);
  if (!preview) throw new Error('Invoice preview element not found');
  const invoiceElement = preview.querySelector<HTMLElement>('.print-container');
  if (!invoiceElement) throw new Error('Invoice document element not found');
  let iframe: HTMLIFrameElement | null = null;

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    iframe = buildIsolatedPdfFrame(invoiceElement);
    const pdfElement = iframe.contentDocument?.body.firstElementChild as HTMLElement | null;
    if (!pdfElement) throw new Error('Invoice PDF clone could not be created');
    await waitForImages(pdfElement);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const rect = pdfElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) throw new Error('Invoice PDF clone has invalid dimensions');

    const canvas = await html2canvas(pdfElement, {
      scale: 2, useCORS: true, allowTaint: true, logging: false,
      backgroundColor: '#ffffff', imageTimeout: 15000, removeContainer: true,
      scrollX: 0, scrollY: 0, width: Math.ceil(rect.width), height: Math.ceil(rect.height),
      windowWidth: Math.ceil(rect.width), windowHeight: Math.ceil(rect.height),
    });
    if (canvas.width === 0 || canvas.height === 0) throw new Error('Invoice rendered to an empty canvas');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Add only the number of A4 pages actually needed by the rendered invoice.
    let offsetY = 0;
    let remainingHeight = imageHeight;
    let pageIndex = 0;
    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -offsetY, imageWidth, imageHeight, undefined, 'FAST');
      remainingHeight -= pageHeight;
      offsetY += pageHeight;
      pageIndex += 1;
    }
    pdf.save(`Invoice-${invoiceNumber}.pdf`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown PDF export error');
    throw new Error(`PDF export failed: ${message}`);
  } finally {
    iframe?.remove();
  }
};

export const generateWhatsAppUrl = (invoice: Invoice, profile: BusinessProfile): string => {
  const cleanPhone = (invoice.clientWhatsApp || invoice.clientPhone || '').replace(/[^0-9]/g, '');
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const message = [
    `Dear ${invoice.clientName},`, `Greetings from ${profile.businessName}!`, ``,
    `Please find your invoice details for the upcoming *${invoice.eventType}* event:`,
    `• *Invoice No:* #${invoice.invoiceNumber}`, `• *Total Amount:* ${formattedTotal}`,
    `• *Advance Paid:* ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}`,
    `• *Remaining Balance:* ${formattedRemaining}`, `• *Payment Status:* ${invoice.paymentStatus}`,
    invoice.eventDate ? `• *Event Date:* ${invoice.eventDate}` : '', ``,
    `Thank you for choosing ${profile.businessName}. Please let us know if you have any questions.`,
  ].filter(Boolean).join('\n');
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const generateEmailMailto = (invoice: Invoice, profile: BusinessProfile): string => {
  const subject = `Invoice #${invoice.invoiceNumber} from ${profile.businessName}`;
  const formattedTotal = `${profile.currencySymbol}${Number(invoice.totalAmount).toLocaleString()}`;
  const formattedRemaining = `${profile.currencySymbol}${Number(invoice.remainingBalance).toLocaleString()}`;
  const body = `Dear ${invoice.clientName},\n\nPlease find your invoice details below from ${profile.businessName}:\n\nInvoice Number: #${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nEvent: ${invoice.eventType}\nEvent Date: ${invoice.eventDate}\nVenue: ${invoice.venue || 'TBA'}\n\nTotal Amount: ${formattedTotal}\nAdvance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}\nRemaining Balance: ${formattedRemaining}\nPayment Status: ${invoice.paymentStatus}\n\nTerms & Conditions:\n${invoice.termsAndConditions || profile.defaultTerms}\n\n${profile.invoiceFooterText || 'Thank you for your business!'}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;
  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

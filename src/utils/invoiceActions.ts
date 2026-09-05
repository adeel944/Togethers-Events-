import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, BusinessProfile } from '../types';

export const printInvoice = () => {
  window.print();
};

const normalizeCssColor = (value: string): string => {
  if (!value) return value;
  const trimmed = value.trim();
  if (/^(rgb|rgba|hsl|hsla|hex|transparent|currentcolor|inherit|initial|unset)/i.test(trimmed)) {
    return trimmed;
  }

  const probe = document.createElement('span');
  probe.style.color = trimmed;
  if (!probe.style.color) return trimmed;

  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || trimmed;
};

const cloneForPdf = (source: HTMLElement): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${source.getBoundingClientRect().width}px`;
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '0';
  wrapper.style.margin = '0';
  wrapper.style.overflow = 'visible';
  wrapper.style.zIndex = '-1';

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${source.getBoundingClientRect().width}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';

  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];

  sourceNodes.forEach((sourceNode, index) => {
    const target = cloneNodes[index];
    if (!target) return;

    const styles = getComputedStyle(sourceNode);
    const colorProperties = [
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

    colorProperties.forEach((property) => {
      const value = styles[property];
      if (value) {
        target.style[property] = normalizeCssColor(value);
      }
    });

    target.style.fontFamily = styles.fontFamily;
    target.style.fontSize = styles.fontSize;
    target.style.fontWeight = styles.fontWeight;
    target.style.lineHeight = styles.lineHeight;
    target.style.letterSpacing = styles.letterSpacing;
    target.style.textAlign = styles.textAlign;
    target.style.opacity = styles.opacity;
    target.style.boxShadow = 'none';
    target.style.textShadow = styles.textShadow;
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return wrapper;
};

export const downloadInvoicePdf = async (
  elementId: string,
  invoiceNumber: string
): Promise<void> => {
  const preview = document.getElementById(elementId);
  if (!preview) {
    throw new Error('Invoice preview element not found');
  }

  const invoiceElement = preview.querySelector<HTMLElement>('.print-container');
  if (!invoiceElement) {
    throw new Error('Invoice document element not found');
  }

  let pdfWrapper: HTMLElement | null = null;

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    pdfWrapper = cloneForPdf(invoiceElement);
    const pdfElement = pdfWrapper.firstElementChild as HTMLElement | null;
    if (!pdfElement) {
      throw new Error('Invoice PDF clone could not be created');
    }

    const rect = pdfElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error('Invoice PDF clone has invalid dimensions');
    }

    const canvas = await html2canvas(pdfElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      removeContainer: true,
      scrollX: 0,
      scrollY: 0,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      windowWidth: Math.ceil(rect.width),
      windowHeight: Math.ceil(rect.height),
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
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png', 1.0);

    let offsetY = 0;
    let remainingHeight = imageHeight;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();

      pdf.addImage(
        imgData,
        'PNG',
        0,
        -offsetY,
        imageWidth,
        imageHeight,
        undefined,
        'FAST'
      );

      remainingHeight -= pageHeight;
      offsetY += pageHeight;
      pageIndex += 1;
    }

    pdf.save(`Invoice-${invoiceNumber}.pdf`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown PDF export error');
    throw new Error(`PDF export failed: ${message}`);
  } finally {
    pdfWrapper?.remove();
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
  const formattedRemaining = `${profile.currencySymbol}${Number(
    invoice.remainingBalance
  ).toLocaleString()}`;

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
  const formattedRemaining = `${profile.currencySymbol}${Number(
    invoice.remainingBalance
  ).toLocaleString()}`;

  const body = `Dear ${invoice.clientName},\n\nPlease find your invoice details below from ${profile.businessName}:\n\nInvoice Number: #${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nEvent: ${invoice.eventType}\nEvent Date: ${invoice.eventDate}\nVenue: ${invoice.venue || 'TBA'}\n\nTotal Amount: ${formattedTotal}\nAdvance Paid: ${profile.currencySymbol}${Number(invoice.advancePaid).toLocaleString()}\nRemaining Balance: ${formattedRemaining}\nPayment Status: ${invoice.paymentStatus}\n\nTerms & Conditions:\n${invoice.termsAndConditions || profile.defaultTerms}\n\n${profile.invoiceFooterText || 'Thank you for your business!'}\n\nWarm regards,\n${profile.ownerName ? `${profile.ownerName}\n` : ''}${profile.businessName}\n${profile.phone || ''}\n${profile.email || ''}\n${profile.website || ''}`;

  return `mailto:${invoice.clientEmail || ''}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

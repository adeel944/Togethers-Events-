import { Invoice, InvoiceItem } from '../types';
import { supabase } from '../lib/supabase';
import { businessService } from './businessService';
import { bookingService } from './bookingService';
import { clientService } from './clientService';

async function getBusinessId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('You must be signed in.');
  const { data, error } = await supabase.from('business_members').select('business_id').eq('user_id', authData.user.id).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.business_id) throw new Error('No business membership found.');
  return data.business_id;
}

const PROFESSIONAL_DEFAULT_TERMS = `1. A 30% non-refundable advance is required to confirm the booking and reserve the event date.
2. 50% of the remaining amount is payable 14 days before the event.
3. The outstanding balance must be cleared before the event begins.
4. Any changes to the agreed services, guest count, menu or setup must be communicated at least 7 days in advance and may affect the final charges.
5. Advance payments are non-refundable in case of cancellation by the client.
6. Final arrangements are subject to venue access, availability and the agreed event schedule.
7. Together Events is not responsible for delays or loss caused by weather, venue restrictions, natural events or circumstances beyond reasonable control.`;

function mapItem(row: any): InvoiceItem { return { id: row.id, description: row.description || '', quantity: Number(row.quantity || 0), unitPrice: Number(row.unit_price || 0), total: Number(row.total || 0) }; }
function mapInvoice(row: any, items: InvoiceItem[] = []): Invoice {
  const itemTotal = items.reduce((sum, item) => sum + Number(item.total || item.quantity * item.unitPrice || 0), 0);
  const storedSubtotal = Number(row.subtotal ?? 0);
  const subtotal = storedSubtotal > 0 ? storedSubtotal : itemTotal;
  const discount = Number(row.discount ?? 0);
  const tax = Number(row.tax ?? 0);
  const calculatedTotal = subtotal - discount + tax;
  const storedTotal = Number(row.total_amount ?? 0);
  const totalAmount = storedTotal > 0 ? storedTotal : Math.max(calculatedTotal, 0);
  const advancePaid = Number(row.advance_paid ?? 0);
  const storedRemaining = Number(row.remaining_balance ?? 0);
  const remainingBalance = storedRemaining || Math.max(totalAmount - advancePaid, 0);
  return { id: row.id, invoiceNumber: row.invoice_number, documentTitle: row.document_title || undefined, bookingId: row.booking_id || undefined, clientId: row.client_id, clientName: row.client_name || '', clientPhone: row.client_phone || '', clientWhatsApp: row.client_whatsapp || '', clientEmail: row.client_email || '', billingAddress: row.billing_address || '', eventType: row.event_type, eventDate: row.event_date, eventTime: row.event_time || undefined, venue: row.venue || '', issueDate: row.issue_date, dueDate: row.due_date || undefined, items, subtotal, discount, tax, totalAmount, advancePaid, remainingBalance, paymentStatus: row.payment_status === 'Paid' ? 'Paid' : 'Pending', notes: row.notes || '', termsAndConditions: row.terms_and_conditions || '', templateId: row.template_id || 'modern', createdAt: row.created_at };
}

async function loadItems(invoiceIds: string[]): Promise<Map<string, InvoiceItem[]>> {
  const map = new Map<string, InvoiceItem[]>(); if (!invoiceIds.length) return map;
  const { data, error } = await supabase.from('invoice_items').select('*').in('invoice_id', invoiceIds); if (error) throw error;
  for (const row of data || []) { const list = map.get(row.invoice_id) || []; list.push(mapItem(row)); map.set(row.invoice_id, list); } return map;
}
async function replaceItems(invoiceId: string, items: InvoiceItem[]) {
  const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId); if (deleteError) throw deleteError;
  if (!items.length) return;
  const rows = items.map((item) => ({ invoice_id: invoiceId, description: String(item.description || '').trim() || 'Custom Service', quantity: Math.max(1, Number(item.quantity) || 1), unit_price: Math.max(0, Number(item.unitPrice) || 0) }));
  const { error } = await supabase.from('invoice_items').insert(rows); if (error) throw error;
}

const DB_EVENT_TYPES = new Set(['Baraat', 'Walima', 'Mehendi', 'Nikkah', 'Birthday', 'Corporate', 'Other']);
function normalizeEventType(value: unknown): string { const eventType = String(value || '').trim(); return DB_EVENT_TYPES.has(eventType) ? eventType : 'Other'; }

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> { const businessId = await getBusinessId(); const { data, error } = await supabase.from('invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }); if (error) throw error; const rows = data || []; const itemMap = await loadItems(rows.map((row) => row.id)); return rows.map((row) => mapInvoice(row, itemMap.get(row.id) || [])); },
  async getInvoiceById(id: string): Promise<Invoice | null> { const businessId = await getBusinessId(); const { data, error } = await supabase.from('invoices').select('*').eq('id', id).eq('business_id', businessId).maybeSingle(); if (error) throw error; if (!data) return null; const itemMap = await loadItems([id]); return mapInvoice(data, itemMap.get(id) || []); },
  async generateNextInvoiceNumber(): Promise<string> { const profile = await businessService.getProfile(); const businessId = await getBusinessId(); const prefix = profile.invoicePrefix || 'TE-'; const startingNumber = profile.invoiceStartingNumber || 1001; const { data, error } = await supabase.from('invoices').select('invoice_number').eq('business_id', businessId); if (error) throw error; let maxNum = startingNumber - 1; for (const row of data || []) { const value = String(row.invoice_number || ''); if (value.startsWith(prefix)) { const num = parseInt(value.slice(prefix.length), 10); if (!Number.isNaN(num) && num > maxNum) maxNum = num; } } return `${prefix}${maxNum + 1}`; },
  async createInvoice(payload: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const businessId = await getBusinessId();
    const profile = await businessService.getProfile();
    const items = (payload.items || []).map((item) => ({ ...item, description: String(item.description || '').trim() || 'Custom Service', quantity: Math.max(1, Number(item.quantity) || 1), unitPrice: Math.max(0, Number(item.unitPrice) || 0) }));
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const discount = Math.max(0, Number(payload.discount) || 0);
    const tax = Math.max(0, Number(payload.tax) || 0);
    const advancePaid = Math.max(0, Number(payload.advancePaid) || 0);
    const today = new Date().toISOString().split('T')[0];
    const invoiceNumber = String(payload.invoiceNumber || '').trim();
    const clientId = String(payload.clientId || '').trim();
    const clientName = String(payload.clientName || '').trim();
    if (!invoiceNumber) throw new Error('Invoice number is required.');
    if (!clientId) throw new Error('Please select or create a client before saving the invoice.');
    if (!clientName) throw new Error('Client name is required.');
    if (!items.length) throw new Error('At least one invoice item is required.');
    const dbEventType = normalizeEventType(payload.eventType);
    const dbEventDate = String(payload.eventDate || '').trim() || String(payload.issueDate || today);
    const termsAndConditions = String(payload.termsAndConditions || '').trim() || String(profile.defaultTerms || '').trim() || PROFESSIONAL_DEFAULT_TERMS;
    const { data, error } = await supabase.from('invoices').insert({ business_id: businessId, invoice_number: invoiceNumber, document_title: payload.documentTitle || 'BOOKING CONFIRMATION', booking_id: payload.bookingId || null, client_id: clientId, client_name: clientName, client_phone: payload.clientPhone || '', client_whatsapp: payload.clientWhatsApp || '', client_email: payload.clientEmail || '', billing_address: payload.billingAddress || '', event_type: dbEventType, event_date: dbEventDate, event_time: payload.eventTime || '', venue: payload.venue || '', issue_date: payload.issueDate || today, due_date: payload.dueDate || null, subtotal, discount, tax, advance_paid: advancePaid, notes: payload.notes || '', terms_and_conditions: termsAndConditions, template_id: payload.templateId || 'modern' }).select('*').single();
    if (error) throw error;
    try { await replaceItems(data.id, items); } catch (itemError) { await supabase.from('invoices').delete().eq('id', data.id).eq('business_id', businessId); throw itemError; }
    const itemMap = await loadItems([data.id]); return mapInvoice(data, itemMap.get(data.id) || items);
  },
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const current = await this.getInvoiceById(id); if (!current) throw new Error('Invoice not found');
    const items = (updates.items || current.items).map((item) => ({ ...item, description: String(item.description || '').trim() || 'Custom Service', quantity: Math.max(1, Number(item.quantity) || 1), unitPrice: Math.max(0, Number(item.unitPrice) || 0) }));
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const discount = updates.discount !== undefined ? Math.max(0, Number(updates.discount) || 0) : current.discount;
    const tax = updates.tax !== undefined ? Math.max(0, Number(updates.tax) || 0) : current.tax;
    const advancePaid = updates.advancePaid !== undefined ? Math.max(0, Number(updates.advancePaid) || 0) : current.advancePaid;
    const businessId = await getBusinessId();
    const dbUpdates: Record<string, any> = { ...(updates.invoiceNumber !== undefined && { invoice_number: String(updates.invoiceNumber || '').trim() }), ...(updates.documentTitle !== undefined && { document_title: updates.documentTitle }), ...(updates.bookingId !== undefined && { booking_id: updates.bookingId || null }), ...(updates.clientId !== undefined && { client_id: updates.clientId || null }), ...(updates.clientName !== undefined && { client_name: updates.clientName || '' }), ...(updates.clientPhone !== undefined && { client_phone: updates.clientPhone || '' }), ...(updates.clientWhatsApp !== undefined && { client_whatsapp: updates.clientWhatsApp || '' }), ...(updates.clientEmail !== undefined && { client_email: updates.clientEmail || '' }), ...(updates.billingAddress !== undefined && { billing_address: updates.billingAddress || '' }), ...(updates.eventType !== undefined && { event_type: normalizeEventType(updates.eventType) }), ...(updates.eventDate !== undefined && { event_date: updates.eventDate || current.issueDate || new Date().toISOString().split('T')[0] }), ...(updates.eventTime !== undefined && { event_time: updates.eventTime || '' }), ...(updates.venue !== undefined && { venue: updates.venue || '' }), ...(updates.issueDate !== undefined && { issue_date: updates.issueDate || new Date().toISOString().split('T')[0] }), ...(updates.dueDate !== undefined && { due_date: updates.dueDate || null }), ...(updates.notes !== undefined && { notes: updates.notes || '' }), ...(updates.termsAndConditions !== undefined && { terms_and_conditions: updates.termsAndConditions || '' }), ...(updates.templateId !== undefined && { template_id: updates.templateId }), subtotal, discount, tax, advance_paid: advancePaid };
    const { data, error } = await supabase.from('invoices').update(dbUpdates).eq('id', id).eq('business_id', businessId).select('*').single(); if (error) throw error;
    if (updates.items !== undefined) await replaceItems(id, items);
    const itemMap = await loadItems([id]); return mapInvoice(data, itemMap.get(id) || items);
  },
  async deleteInvoice(id: string): Promise<boolean> { const businessId = await getBusinessId(); await supabase.from('invoice_items').delete().eq('invoice_id', id); const { error } = await supabase.from('invoices').delete().eq('id', id).eq('business_id', businessId); if (error) throw error; return true; },
  async duplicateInvoice(id: string): Promise<Invoice> { const original = await this.getInvoiceById(id); if (!original) throw new Error('Original invoice not found'); const nextInvoiceNumber = await this.generateNextInvoiceNumber(); const todayStr = new Date().toISOString().split('T')[0]; const { id: _id, createdAt: _createdAt, totalAmount: _totalAmount, remainingBalance: _remainingBalance, paymentStatus: _paymentStatus, ...payload } = original; return this.createInvoice({ ...payload, invoiceNumber: nextInvoiceNumber, issueDate: todayStr }); },
  async createInvoiceFromBooking(bookingId: string): Promise<Invoice> { const booking = await bookingService.getBookingById(bookingId); if (!booking) throw new Error('Booking not found'); const client = await clientService.getClientById(booking.clientId); const profile = await businessService.getProfile(); const settings = await businessService.getInvoiceSettings(); const nextInvoiceNumber = await this.generateNextInvoiceNumber(); const items: InvoiceItem[] = [{ id: 'item-' + Date.now(), description: `${booking.eventType} Event Management & Venue Setup (${booking.package || 'Custom Package'})`, quantity: 1, unitPrice: booking.totalAmount, total: booking.totalAmount }]; const todayStr = new Date().toISOString().split('T')[0]; return this.createInvoice({ invoiceNumber: nextInvoiceNumber, documentTitle: settings.documentTitle || 'BOOKING CONFIRMATION', bookingId: booking.id, clientId: booking.clientId, clientName: client?.fullName || booking.clientName, clientPhone: client?.phone || '', clientWhatsApp: client?.whatsApp || '', clientEmail: client?.email || '', billingAddress: client?.billingAddress || '', eventType: booking.eventType, eventDate: booking.eventDate, eventTime: booking.eventTime, venue: booking.venue, issueDate: todayStr, dueDate: booking.eventDate, items, subtotal: booking.totalAmount, discount: 0, tax: 0, totalAmount: booking.totalAmount, advancePaid: booking.advancePaid, remainingBalance: booking.remainingAmount, paymentStatus: booking.advancePaid >= booking.totalAmount && booking.totalAmount > 0 ? 'Paid' : 'Pending', termsAndConditions: profile.defaultTerms, notes: booking.notes || '', templateId: settings.defaultTemplate || 'modern' }); },
};
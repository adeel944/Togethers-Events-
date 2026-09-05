import { BusinessProfile, InvoiceSettings } from '../types';
import { initialBusinessProfile, initialInvoiceSettings } from './mockData';
import { supabase } from '../lib/supabase';

async function getBusinessId(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated. Please sign in again.');
  const { data, error } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.business_id) throw new Error('No business membership found for this account.');
  return data.business_id;
}

function mapProfile(row: any): BusinessProfile {
  return {
    businessName: row.business_name || '', tagline: row.tagline || '', ownerName: row.owner_name || '',
    phone: row.phone || '', whatsApp: row.whatsapp || '', email: row.email || '', website: row.website || '',
    address: row.address || '', city: row.city || '', country: row.country || '',
    taxNumber: row.tax_number || undefined, registrationNumber: row.registration_number || undefined,
    logoUrl: row.logo_url || undefined, signatureUrl: row.signature_url || undefined,
    invoiceFooterText: row.invoice_footer_text || '', defaultTerms: row.default_terms || '',
    defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ',
    invoicePrefix: row.invoice_prefix || 'TE-', invoiceStartingNumber: Number(row.invoice_starting_number || 1001),
    bankDetails: row.bank_details || { bankName: '', accountTitle: '', accountNumber: '', iban: '' },
  };
}

function mapInvoiceSettings(row: any): InvoiceSettings {
  return {
    documentTitle: row.document_title || 'BOOKING CONFIRMATION', defaultTemplate: row.default_template || 'modern',
    showLogo: row.show_logo ?? true, showSignature: row.show_signature ?? true,
    showBusinessAddress: row.show_business_address ?? true, showBillingAddress: row.show_billing_address ?? true,
    showContactInfo: row.show_contact_info ?? true, showPhone: row.show_phone ?? true, showEmail: row.show_email ?? true,
    fontSize: row.font_size || 'medium', bodySize: row.body_size || 'medium', headingSize: row.heading_size || 'large',
    dateFormat: row.date_format || 'DD/MM/YYYY',
  };
}

export const businessService = {
  async getProfile(): Promise<BusinessProfile> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).single();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : { ...initialBusinessProfile, defaultCurrency: 'PKR', currency: 'PKR', currencySymbol: 'Rs. ' };
  },

  async updateProfile(updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const businessId = await getBusinessId();
    const dbUpdates: Record<string, any> = {};
    const fields: Record<string, string> = {
      businessName: 'business_name', tagline: 'tagline', ownerName: 'owner_name', phone: 'phone', whatsApp: 'whatsapp',
      email: 'email', website: 'website', address: 'address', city: 'city', country: 'country', taxNumber: 'tax_number',
      registrationNumber: 'registration_number', logoUrl: 'logo_url', signatureUrl: 'signature_url', invoiceFooterText: 'invoice_footer_text',
      defaultTerms: 'default_terms', invoicePrefix: 'invoice_prefix', invoiceStartingNumber: 'invoice_starting_number', bankDetails: 'bank_details',
    };
    for (const [key, column] of Object.entries(fields)) if ((updates as any)[key] !== undefined) dbUpdates[column] = (updates as any)[key];
    // This application is PKR-only. Never persist an old AED/USD/etc. setting.
    dbUpdates.default_currency = 'PKR';
    dbUpdates.currency = 'PKR';
    dbUpdates.currency_symbol = 'Rs. ';
    const { data, error } = await supabase.from('businesses').update(dbUpdates).eq('id', businessId).select('*').single();
    if (error) throw new Error(error.message);
    const updated = mapProfile(data);
    window.dispatchEvent(new CustomEvent('business_profile_updated', { detail: updated }));
    return updated;
  },

  async saveProfile(profile: BusinessProfile): Promise<BusinessProfile> { return this.updateProfile(profile); },

  async getInvoiceSettings(): Promise<InvoiceSettings> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('invoice_settings').select('*').eq('business_id', businessId).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapInvoiceSettings(data) : { ...initialInvoiceSettings };
  },

  async updateInvoiceSettings(updates: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
    const businessId = await getBusinessId();
    const dbUpdates: Record<string, any> = {};
    const fields: Record<string, string> = {
      documentTitle: 'document_title', defaultTemplate: 'default_template', showLogo: 'show_logo', showSignature: 'show_signature',
      showBusinessAddress: 'show_business_address', showBillingAddress: 'show_billing_address', showContactInfo: 'show_contact_info',
      showPhone: 'show_phone', showEmail: 'show_email', fontSize: 'font_size', bodySize: 'body_size', headingSize: 'heading_size', dateFormat: 'date_format',
    };
    for (const [key, column] of Object.entries(fields)) if ((updates as any)[key] !== undefined) dbUpdates[column] = (updates as any)[key];
    const { data: existing, error: existingError } = await supabase.from('invoice_settings').select('id').eq('business_id', businessId).limit(1).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    let data: any; let error: any;
    if (existing?.id) {
      const result = await supabase.from('invoice_settings').update(dbUpdates).eq('id', existing.id).select('*').single(); data = result.data; error = result.error;
    } else {
      const result = await supabase.from('invoice_settings').insert({ business_id: businessId, ...dbUpdates }).select('*').single(); data = result.data; error = result.error;
    }
    if (error) throw new Error(error.message);
    const updated = mapInvoiceSettings(data);
    window.dispatchEvent(new CustomEvent('invoice_settings_updated', { detail: updated }));
    return updated;
  },

  async saveInvoiceSettings(settings: InvoiceSettings): Promise<InvoiceSettings> { return this.updateInvoiceSettings(settings); },
};

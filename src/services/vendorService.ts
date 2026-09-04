import { Vendor } from '../types';
import { supabase } from '../lib/supabase';

async function getBusinessId(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated. Please sign in again.');
  const { data, error } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.business_id) throw new Error('No business membership found for this account.');
  return data.business_id;
}

function mapVendor(row: any): Vendor {
  return { id: row.id, vendorName: row.vendor_name, category: row.category, contactPerson: row.contact_person || '', phone: row.phone || '', whatsApp: row.whatsapp || '', email: row.email || '', address: row.address || '', services: row.services || '', paymentTerms: row.payment_terms || '', notes: row.notes || '', createdAt: row.created_at };
}

export const vendorService = {
  async getVendors(): Promise<Vendor[]> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('vendors').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapVendor);
  },

  async getVendorById(id: string): Promise<Vendor | null> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('vendors').select('*').eq('id', id).eq('business_id', businessId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapVendor(data) : null;
  },

  async createVendor(payload: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('vendors').insert({ business_id: businessId, vendor_name: payload.vendorName, category: payload.category, contact_person: payload.contactPerson || null, phone: payload.phone || null, whatsapp: payload.whatsApp || null, email: payload.email || null, address: payload.address || null, services: payload.services || null, payment_terms: payload.paymentTerms || null, notes: payload.notes || null }).select('*').single();
    if (error) throw new Error(error.message);
    return mapVendor(data);
  },

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    const businessId = await getBusinessId();
    const dbUpdates: Record<string, any> = {};
    if (updates.vendorName !== undefined) dbUpdates.vendor_name = updates.vendorName;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.whatsApp !== undefined) dbUpdates.whatsapp = updates.whatsApp || null;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.address !== undefined) dbUpdates.address = updates.address || null;
    if (updates.services !== undefined) dbUpdates.services = updates.services || null;
    if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    const { data, error } = await supabase.from('vendors').update(dbUpdates).eq('id', id).eq('business_id', businessId).select('*').single();
    if (error) throw new Error(error.message);
    return mapVendor(data);
  },

  async deleteVendor(id: string): Promise<boolean> {
    const businessId = await getBusinessId();
    const { error } = await supabase.from('vendors').delete().eq('id', id).eq('business_id', businessId);
    if (error) throw new Error(error.message);
    return true;
  },
};

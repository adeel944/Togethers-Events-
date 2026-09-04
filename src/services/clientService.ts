import { Client } from '../types';
import { supabase } from '../lib/supabase';

async function getBusinessId(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not authenticated. Please sign in again.');
  const { data, error } = await supabase.from('business_members').select('business_id').eq('user_id', userData.user.id).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.business_id) throw new Error('No business membership found for this account.');
  return data.business_id;
}

function mapClient(row: any): Client {
  return { id: row.id, fullName: row.full_name, phone: row.phone || '', whatsApp: row.whatsapp || '', email: row.email || '', billingAddress: row.billing_address || '', city: row.city || '', country: row.country || '', notes: row.notes || '', createdAt: row.created_at };
}

export const clientService = {
  async getClients(): Promise<Client[]> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('clients').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapClient);
  },

  async getClientById(id: string): Promise<Client | null> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).eq('business_id', businessId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapClient(data) : null;
  },

  async createClient(payload: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const businessId = await getBusinessId();
    if (payload.phone || payload.whatsApp || payload.email) {
      const filters = [payload.phone ? `phone.eq.${payload.phone}` : '', payload.whatsApp ? `whatsapp.eq.${payload.whatsApp}` : '', payload.email ? `email.eq.${payload.email}` : ''].filter(Boolean).join(',');
      const { data: existing, error: duplicateError } = await supabase.from('clients').select('*').eq('business_id', businessId).or(filters).limit(1).maybeSingle();
      if (duplicateError) throw new Error(duplicateError.message);
      if (existing) return mapClient(existing);
    }
    const { data, error } = await supabase.from('clients').insert({
      business_id: businessId,
      full_name: payload.fullName,
      phone: payload.phone || '',
      whatsapp: payload.whatsApp || '',
      email: payload.email || '',
      billing_address: payload.billingAddress || '',
      city: payload.city || '',
      country: payload.country || '',
      notes: payload.notes || ''
    }).select('*').single();
    if (error) throw new Error(error.message);
    return mapClient(data);
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const businessId = await getBusinessId();
    const dbUpdates: Record<string, any> = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || '';
    if (updates.whatsApp !== undefined) dbUpdates.whatsapp = updates.whatsApp || '';
    if (updates.email !== undefined) dbUpdates.email = updates.email || '';
    if (updates.billingAddress !== undefined) dbUpdates.billing_address = updates.billingAddress || '';
    if (updates.city !== undefined) dbUpdates.city = updates.city || '';
    if (updates.country !== undefined) dbUpdates.country = updates.country || '';
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || '';
    const { data, error } = await supabase.from('clients').update(dbUpdates).eq('id', id).eq('business_id', businessId).select('*').single();
    if (error) throw new Error(error.message);
    return mapClient(data);
  },

  async deleteClient(id: string): Promise<boolean> {
    const businessId = await getBusinessId();
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('business_id', businessId);
    if (error) throw new Error(error.message);
    return true;
  },
};

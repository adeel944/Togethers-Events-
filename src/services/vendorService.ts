import { Vendor } from '../types';
import { initialVendors } from './mockData';

const VENDORS_KEY = 'together_events_vendors';

export const vendorService = {
  async getVendors(): Promise<Vendor[]> {
    try {
      const data = localStorage.getItem(VENDORS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    localStorage.setItem(VENDORS_KEY, JSON.stringify(initialVendors));
    return [...initialVendors];
  },

  async getVendorById(id: string): Promise<Vendor | null> {
    const vendors = await this.getVendors();
    return vendors.find((v) => v.id === id) || null;
  },

  async createVendor(payload: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> {
    const vendors = await this.getVendors();
    const newVendor: Vendor = {
      ...payload,
      id: 'ven-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newVendor, ...vendors];
    localStorage.setItem(VENDORS_KEY, JSON.stringify(updated));
    return newVendor;
  },

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    const vendors = await this.getVendors();
    const index = vendors.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error('Vendor not found');
    }
    const updatedVendor = { ...vendors[index], ...updates };
    vendors[index] = updatedVendor;
    localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
    return updatedVendor;
  },

  async deleteVendor(id: string): Promise<boolean> {
    const vendors = await this.getVendors();
    const filtered = vendors.filter((v) => v.id !== id);
    localStorage.setItem(VENDORS_KEY, JSON.stringify(filtered));
    return true;
  },
};

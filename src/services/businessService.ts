import { BusinessProfile, InvoiceSettings } from '../types';
import { initialBusinessProfile, initialInvoiceSettings } from './mockData';

const BUSINESS_KEY = 'together_events_business_profile';
const INVOICE_SETTINGS_KEY = 'together_events_invoice_settings';

export const businessService = {
  async getProfile(): Promise<BusinessProfile> {
    try {
      const data = localStorage.getItem(BUSINESS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return { ...initialBusinessProfile, ...parsed };
        }
      }
    } catch {
      // ignore
    }
    return { ...initialBusinessProfile };
  },

  async updateProfile(updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = await this.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(updated));
    // Trigger storage event so other components can react if needed
    window.dispatchEvent(new CustomEvent('business_profile_updated', { detail: updated }));
    return updated;
  },

  async saveProfile(profile: BusinessProfile): Promise<BusinessProfile> {
    return this.updateProfile(profile);
  },

  async getInvoiceSettings(): Promise<InvoiceSettings> {
    try {
      const data = localStorage.getItem(INVOICE_SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return { ...initialInvoiceSettings, ...parsed };
        }
      }
    } catch {
      // ignore
    }
    return { ...initialInvoiceSettings };
  },

  async updateInvoiceSettings(updates: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
    const current = await this.getInvoiceSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('invoice_settings_updated', { detail: updated }));
    return updated;
  },

  async saveInvoiceSettings(settings: InvoiceSettings): Promise<InvoiceSettings> {
    return this.updateInvoiceSettings(settings);
  },
};

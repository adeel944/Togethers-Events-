import { Client } from '../types';
import { initialClients } from './mockData';

const CLIENTS_KEY = 'together_events_clients';

export const clientService = {
  async getClients(): Promise<Client[]> {
    try {
      const data = localStorage.getItem(CLIENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // seed initial
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(initialClients));
    return [...initialClients];
  },

  async getClientById(id: string): Promise<Client | null> {
    const clients = await this.getClients();
    return clients.find((c) => c.id === id) || null;
  },

  async createClient(payload: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const clients = await this.getClients();
    const newClient: Client = {
      ...payload,
      id: 'cli-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newClient, ...clients];
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(updated));
    return newClient;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const clients = await this.getClients();
    const index = clients.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Client not found');
    }
    const updatedClient = { ...clients[index], ...updates };
    clients[index] = updatedClient;
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    return updatedClient;
  },

  async deleteClient(id: string): Promise<boolean> {
    const clients = await this.getClients();
    const filtered = clients.filter((c) => c.id !== id);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(filtered));
    return true;
  },
};

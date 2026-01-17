// api.ts - Zentrale Schnittstelle für Datenzugriff (Hybrid: IPC & HTTP)

// Typ-Definitionen (könnten wir später in types.d.ts auslagern)
export interface Customer {
  id?: number;
  firstName: string;
  lastName: string;
  address?: string;
  phone?: string;
  email?: string;
  vehicles?: any[];
}

// Wir prüfen, ob wir im Electron-Umfeld laufen
// @ts-ignore
const isElectron = window.electron !== undefined;

console.log(`[API] Initialisiert. Modus: ${isElectron ? 'ELECTRON (Desktop)' : 'WEB (Server/Mobile)'}`);

// Hilfsfunktion für HTTP Requests (wenn wir im Web-Modus sind)
const request = async (endpoint: string, method = 'GET', body?: any) => {
  // Wenn wir im Web-Browser sind, rufen wir die API relativ auf (z.B. /api/customers)
  const url = `/api/${endpoint}`;
  
  // Basic Auth Header holen (wenn vorhanden) für den Serverzugriff
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  // Optional: Auth Header mitschicken, wenn wir Anmeldedaten im LocalStorage haben
  const auth = localStorage.getItem('auth');
  if (auth) {
      headers['Authorization'] = auth;
  } else {
      // Fallback für Entwicklung/Setup (Terhaag:terhaag)
      headers['Authorization'] = 'Basic VGVyaGFhZzp0ZXJoYWFn'; 
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
};

export const api = {
  // --- KUNDEN (Customers) ---
  customers: {
    getAll: async () => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('get-customers');
      } else {
        return await request('customers');
      }
    },

    getOne: async (id: number) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('get-customer', id);
      } else {
        // Die API muss das unterstützen: GET /api/customers/:id
        return await request(`customers/${id}`);
      }
    },

    create: async (data: Customer) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('create-customer', data);
      } else {
        return await request('customers', 'POST', data);
      }
    },

    update: async (data: Customer) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('update-customer', data);
      } else {
        // API: PUT /api/customers/:id
        return await request(`customers/${data.id}`, 'PUT', data); // Wir müssen die Server Routes noch anpassen dafür!
      }
    },
    
    delete: async (id: number) => {
        if (isElectron) {
          // @ts-ignore
          return await window.electron.ipcRenderer.invoke('delete-customer', id);
        } else {
          return await request(`customers/${id}`, 'DELETE');
        }
      }
  },

  // --- FAHRZEUGE (Vehicles) ---
  // Das müssen wir noch im Server implementieren (todo)
  vehicles: {
    create: async (data: any) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('create-vehicle', data);
      } else {
        return await request('vehicles', 'POST', data);
      }
    },
    
    update: async (data: any) => {
        if (isElectron) {
          // @ts-ignore
          return await window.electron.ipcRenderer.invoke('update-vehicle', data);
        } else {
          return await request(`vehicles/${data.id}`, 'PUT', data);
        }
    },

    delete: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('delete-vehicle', id);
        } else {
            return await request(`vehicles/${id}`, 'DELETE');
        }
    }
  },

  // --- HISTORIE (History) ---
  history: {
    create: async (data: any) => {
        if (isElectron) {
          // @ts-ignore
          return await window.electron.ipcRenderer.invoke('add-history-entry', data);
        } else {
          return await request('history', 'POST', data);
        }
    },

    update: async (data: any) => {
        if (isElectron) {
          // @ts-ignore
          return await window.electron.ipcRenderer.invoke('update-history-entry', data);
        } else {
          return await request(`history/${data.id}`, 'PUT', data);
        }
    },

    delete: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('delete-history-entry', id);
        } else {
            return await request(`history/${id}`, 'DELETE');
        }
    }
  },

  // --- SERVICE VORLAGEN (Templates) ---
  templates: {
    getAll: async () => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('get-service-templates');
        } else {
            return await request('templates');
        }
    }
  },

  // --- EINSTELLUNGEN (Settings) ---
  settings: {
    get: async () => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('get-settings');
        } else {
             // Für Mobile können wir Dummy-Settings zurückgeben oder auch eine API bauen
             return { theme: 'dark' };
        }
    }
  }
};

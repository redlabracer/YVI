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
      },

  // --- TODOS ---
  todos: {
    getAll: async () => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('get-todos');
      } else {
        return await request('todos');
      }
    },
    create: async (data: any) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('create-todo', data);
      } else {
        return await request('todos', 'POST', data);
      }
    },
    update: async (data: any) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('update-todo', data);
      } else {
         return await request(`todos/${data.id}`, 'PUT', data);
      }
    },
    delete: async (id: number) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('delete-todo', id);
      } else {
        return await request(`todos/${id}`, 'DELETE');
      }
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
            return await request('settings');
        }
    },
    save: async (data: any) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('save-settings', data);
        } else {
            return await request('settings', 'POST', data);
        }
    }
  },

  // --- BETRIEB (Shop) ---
  shop: {
    getClosures: async (range?: { start: string, end: string }) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('get-shop-closures', range);
        } else {
            const params = range ? `?start=${range.start}&end=${range.end}` : '';
            return await request(`shop/closures${params}`); // Server route needs implementation
        }
    },
    createClosure: async (data: any) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('create-shop-closure', data);
        } else {
            return await request('shop/closures', 'POST', data);
        }
    },
    deleteClosure: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('delete-shop-closure', id);
        } else {
            return await request(`shop/closures/${id}`, 'DELETE');
        }
    }
  },

  // --- TERMINE (Appointments) ---
  appointments: {
    getAll: async (range?: { start: string, end: string }) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('get-appointments', range);
        } else {
            const params = range ? `?start=${range.start}&end=${range.end}` : '';
            return await request(`appointments${params}`);
        }
    },
    getOne: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('get-appointment', id);
        } else {
            return await request(`appointments/${id}`);
        }
    },
    create: async (data: any) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('create-appointment', data);
        } else {
            return await request('appointments', 'POST', data);
        }
    },
    update: async (data: any) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('update-appointment', data);
        } else {
            return await request(`appointments/${data.id}`, 'PUT', data);
        }
    },
    delete: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('delete-appointment', id);
        } else {
            return await request(`appointments/${id}`, 'DELETE');
        }
    },
    complete: async (data: { appointmentId: number, mileage?: number, description?: string, date: string }) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('complete-appointment', data);
        } else {
            return await request(`appointments/${data.appointmentId}/complete`, 'POST', data);
        }
    }
  },

  // --- DATEIEN (Files) ---
  files: {
      upload: async (file: File) => {
          if (isElectron) {
              // @ts-ignore
              // In Electron, File object has a 'path' property
              // We use IPC to copy it
              return await window.electron.ipcRenderer.invoke('upload-file', (file as any).path);
          } else {
              const formData = new FormData();
              formData.append('file', file);
              
              const auth = localStorage.getItem('auth') || 'Basic VGVyaGFhZzp0ZXJoYWFn';
              const response = await fetch('/api/upload', {
                  method: 'POST',
                  headers: {
                      'Authorization': auth
                  },
                  body: formData
              });
              
              if (!response.ok) throw new Error('Upload failed');
              const result = await response.json();
              return result.path;
          }
      }
  },

  // --- REIFENLAGER (Tires) ---
  tires: {
      getAll: async () => {
          if (isElectron) {
              // @ts-ignore
              return await window.electron.ipcRenderer.invoke('get-tire-spots');
          } else {
              return await request('tires');
          }
      },
      update: async (data: any) => {
          if (isElectron) {
              // @ts-ignore
              return await window.electron.ipcRenderer.invoke('update-tire-spot', data);
          } else {
              return await request(`tires/${data.id}`, 'PUT', data);
          }
      }
  },

  // --- TODOS ---
  todos: {
    getAll: async () => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('get-todos');
      } else {
        return await request('todos');
      }
    },
    create: async (data: any) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('create-todo', data);
      } else {
        return await request('todos', 'POST', data);
      }
    },
    update: async (data: any) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('update-todo', data);
      } else {
         return await request(`todos/${data.id}`, 'PUT', data);
      }
    },
    delete: async (id: number) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('delete-todo', id);
      } else {
        return await request(`todos/${id}`, 'DELETE');
      }
    }
  }
};

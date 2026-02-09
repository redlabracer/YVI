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
  tireStorageSpot?: string | null;
}

export interface CustomerCreateData extends Customer {
  // Vehicle data (optional, will create vehicle if provided)
  licensePlate?: string;
  make?: string;
  model?: string;
  vin?: string;
  hsn?: string;
  tsn?: string;
  firstRegistration?: string;
  // Documents (optional file paths)
  filePaths?: string[];
}

// Wir prüfen, ob wir im Electron-Umfeld laufen
// @ts-ignore
const isElectronEnv = window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');

// @ts-ignore
// Wenn "useRemote" true ist, tun wir so als wären wir im Web-Modus, damit wir die API Calls nutzen
const useRemote = localStorage.getItem('useRemote') === 'true';

// Check availability of IPC
// @ts-ignore
const hasIpc = window.electron !== undefined;

// @ts-ignore
const isElectron = hasIpc && !useRemote;

console.log(`[API] Initialisiert. Env: ${isElectronEnv ? 'Electron' : 'Web'}, hasIpc: ${hasIpc}, useRemote: ${useRemote} -> Mode: ${isElectron ? 'ELECTRON (Desktop)' : 'WEB/REMOTE (Server/Mobile)'}`);

// Hilfsfunktion für HTTP Requests (wenn wir im Web-Modus sind)
const request = async (endpoint: string, method = 'GET', body?: any) => {
  // Wenn wir im Web-Browser sind, rufen wir die API relativ auf (z.B. /api/customers)
  const rawServerUrl = localStorage.getItem('serverUrl');
  const serverUrl = rawServerUrl ? rawServerUrl.replace(/\/$/, '') : ''; // Remove trailing slash
  const url = serverUrl ? `${serverUrl}/api/${endpoint}` : `/api/${endpoint}`;
  
  // Basic Auth Header holen (wenn vorhanden) für den Serverzugriff
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  // Optional: Auth Header mitschicken, wenn wir Anmeldedaten im LocalStorage haben
  const auth = localStorage.getItem('auth');
  if (auth) {
      headers['Authorization'] = auth;
  }
  // Security: No fallback credentials - user must authenticate

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

export const setServerUrl = (url: string) => {
  localStorage.setItem('serverUrl', url);
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

    // Check for duplicate customers
    checkDuplicate: async (data: { firstName?: string; lastName?: string; phone?: string; email?: string; licensePlate?: string }) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('check-customer-duplicate', data);
      } else {
        return await request('customers/check-duplicate', 'POST', data);
      }
    },

    create: async (data: CustomerCreateData) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('create-customer', data);
      } else {
        return await request('customers', 'POST', data);
      }
    },

    update: async (data: Partial<Customer> & { id: number }) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('update-customer', data);
      } else {
        // API: PUT /api/customers/:id
        return await request(`customers/${data.id}`, 'PUT', data);
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
    
    // Search customers (for merge/transfer dialogs)
    search: async (query: string, excludeId?: number) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('search-customers', { query, excludeId });
      } else {
        const params = new URLSearchParams({ query });
        if (excludeId) params.append('excludeId', String(excludeId));
        return await request(`customers/search?${params.toString()}`);
      }
    },
    
    // Merge two customers
    merge: async (targetCustomerId: number, sourceCustomerId: number, keepTargetData: boolean = true) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('merge-customers', { targetCustomerId, sourceCustomerId, keepTargetData });
      } else {
        return await request('customers/merge', 'POST', { targetCustomerId, sourceCustomerId, keepTargetData });
      }
    },
    
    // Transfer vehicle to another customer
    transferVehicle: async (vehicleId: number, targetCustomerId: number) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('transfer-vehicle', { vehicleId, targetCustomerId });
      } else {
        return await request('customers/transfer-vehicle', 'POST', { vehicleId, targetCustomerId });
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
    },
    create: async (data: { title: string; description: string }) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('create-service-template', data);
        } else {
            return await request('templates', 'POST', data);
        }
    },
    update: async (data: { id: number; title?: string; description?: string }) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('update-service-template', data);
        } else {
            return await request(`templates/${data.id}`, 'PUT', data);
        }
    },
    delete: async (id: number) => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('delete-service-template', id);
        } else {
            return await request(`templates/${id}`, 'DELETE');
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
    },
    syncLexware: async () => {
        if (isElectron) {
            // @ts-ignore
            return await window.electron.ipcRenderer.invoke('sync-lexware');
        } else {
            return await request('settings/sync-lexware', 'POST');
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
              
              const rawServerUrl = localStorage.getItem('serverUrl');
              const serverUrl = rawServerUrl ? rawServerUrl.replace(/\/$/, '') : '';
              const url = serverUrl ? `${serverUrl}/api/upload` : '/api/upload';
              const auth = localStorage.getItem('auth') || 'Basic VGVyaGFhZzp0ZXJoYWFn';
              const response = await fetch(url, {
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

  // --- DOKUMENTE (Documents) ---
  documents: {
      // Analyze registration document with AI
      analyze: async (fileOrPath: File | string, extractCustomerData: boolean = false) => {
          if (isElectron) {
              // In Electron, use IPC with file path
              // If it's a string, use it directly; if it's a File, try to get path
              const filePath = typeof fileOrPath === 'string' 
                  ? fileOrPath 
                  : (fileOrPath as any).path || fileOrPath.name
              // @ts-ignore
              return await window.electron.ipcRenderer.invoke('analyze-registration-doc', { 
                  filePath, 
                  extractCustomerData 
              });
          } else {
              // Web mode requires File object
              if (typeof fileOrPath === 'string') {
                  throw new Error('File path not supported in web mode')
              }
              const formData = new FormData();
              formData.append('file', fileOrPath);
              formData.append('extractCustomerData', String(extractCustomerData));
              
              const rawServerUrl = localStorage.getItem('serverUrl');
              const serverUrl = rawServerUrl ? rawServerUrl.replace(/\/$/, '') : '';
              const url = serverUrl ? `${serverUrl}/api/documents/analyze` : '/api/documents/analyze';
              const auth = localStorage.getItem('auth') || 'Basic VGVyaGFhZzp0ZXJoYWFn';
              
              const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                      'Authorization': auth
                  },
                  body: formData
              });
              
              if (!response.ok) {
                  let errorMessage = 'Analyse fehlgeschlagen';
                  try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || errorMessage;
                  } catch (e) {
                    // Falls Antwort kein JSON ist (z.B. HTML Fehlerseite 413, 502, etc.)
                    console.error('Non-JSON Analysis Error:', response.status, response.statusText);
                    const text = await response.text();
                    // Wenn HTML, versuche Titel zu extrahieren oder nutze Status
                    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                        errorMessage = `Server Error (${response.status}): ${response.statusText}`;
                        if (response.status === 413) errorMessage = 'Datei ist zu groß für den Upload (413 Payload Too Large).';
                    } else {
                        errorMessage = text.substring(0, 100) || errorMessage;
                    }
                  }
                  throw new Error(errorMessage);
              }
              return response.json();
          }
      },
      
      // Add documents to a customer
      addToCustomer: async (customerId: number, files: File[]) => {
          if (isElectron) {
              // @ts-ignore - In Electron, use IPC with file paths
              const filePaths = files.map(f => (f as any).path);
              // @ts-ignore
              return await window.electron.ipcRenderer.invoke('add-customer-documents', { customerId, filePaths });
          } else {
              const formData = new FormData();
              formData.append('customerId', String(customerId));
              files.forEach(file => formData.append('files', file));
              
              const rawServerUrl = localStorage.getItem('serverUrl');
              const serverUrl = rawServerUrl ? rawServerUrl.replace(/\/$/, '') : '';
              const url = serverUrl ? `${serverUrl}/api/documents/customer` : '/api/documents/customer';
              const auth = localStorage.getItem('auth') || 'Basic VGVyaGFhZzp0ZXJoYWFn';
              
              const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                      'Authorization': auth
                  },
                  body: formData
              });
              
              if (!response.ok) throw new Error('Upload fehlgeschlagen');
              return response.json();
          }
      },
      
      // Get document URL for viewing
      getUrl: async (documentId: number) => {
          if (isElectron) {
              // In Electron, open file directly
              // @ts-ignore
              return { openLocally: true, id: documentId };
          } else {
              return await request(`documents/${documentId}/url`);
          }
      },
      
      // Open a document
      open: async (document: { id: number, path: string }) => {
          if (isElectron) {
              // @ts-ignore
              await window.electron.ipcRenderer.invoke('open-file', document.path);
          } else {
              // In browser, open the URL in a new tab
              const rawServerUrl = localStorage.getItem('serverUrl');
              const serverUrl = rawServerUrl ? rawServerUrl.replace(/\/$/, '') : '';
              
              if (document.path.startsWith('/uploads')) {
                  const url = serverUrl ? `${serverUrl}${document.path}` : document.path;
                  window.open(url, '_blank');
              } else {
                  alert('Dieses Dokument ist lokal auf einem anderen Gerät gespeichert und kann nicht remote geöffnet werden.');
              }
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

  // --- DASHBOARD ---
  dashboard: {
    getStats: async () => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('get-dashboard-stats');
      } else {
        return await request('dashboard/stats');
      }
    },
    search: async (query: string) => {
      if (isElectron) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke('global-search', query);
      } else {
        return await request(`dashboard/search?q=${encodeURIComponent(query)}`);
      }
    }
  }
};

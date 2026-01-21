import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import OpenAI from 'openai'
import { autoUpdater } from 'electron-updater'
import { startMobileServer, stopMobileServer } from './mobile-server'
import { logger, setupLoggerIPC } from './logger'
import { runMigrations } from './db'
import { PrismaClient } from '@prisma/client'

// ===== AUTO-UPDATER KONFIGURATION =====
autoUpdater.logger = logger
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Für private GitHub Repos: Token setzen (aus Umgebungsvariable oder hardcoded für interne Apps)
// HINWEIS: Für öffentliche Repos ist kein Token nötig
const GH_TOKEN = process.env.GH_TOKEN || ''
if (GH_TOKEN) {
  autoUpdater.requestHeaders = { 'Authorization': `token ${GH_TOKEN}` }
}

// Initialize Prisma with a fixed location for the DB in production
const dbPath = is.dev 
  ? 'file:./dev.db' 
  : `file:${join(app.getPath('userData'), 'database.db')}`

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ],
  datasources: {
    db: {
      url: dbPath
    }
  }
})

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', e)
})

prisma.$on('error', (e) => {
  logger.error('Prisma Error', e)
})

// IPC Handlers
ipcMain.handle('start-mobile-upload', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    return await startMobileServer(win)
  }
  throw new Error('Window not found')
})

ipcMain.handle('stop-mobile-upload', async () => {
  await stopMobileServer()
})

// ===== AUTO-UPDATER IPC HANDLERS =====
ipcMain.handle('check-for-updates', async () => {
  if (is.dev) {
    return { updateAvailable: false, message: 'Updates im Entwicklungsmodus deaktiviert' }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { 
      updateAvailable: result?.updateInfo?.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version
    }
  } catch (error) {
    return { updateAvailable: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url)
})

ipcMain.on('open-carparts-cat', async (_, query) => {
  console.log('IPC: open-carparts-cat called with query:', query)
  
  let username = ''
  let password = ''
  
  try {
    const settings = await prisma.settings.findFirst()
    username = settings?.carPartsUser || ''
    password = settings?.carPartsPass || ''
    console.log('CarParts credentials loaded:', username ? 'username set' : 'no username')
  } catch (err) {
    console.error('Error loading settings for CarParts:', err)
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.loadURL('https://tm1.carparts-cat.com/login/car')

  // Also try on did-navigate-in-page for SPA navigation
  const runLoginScript = () => {
    const script = `
      (function() {
        const query = "${query || ''}";
        const username = "${username}";
        const password = "${password}";
        
        console.log('CarParts AutoLogin: Starting with username:', username ? 'SET' : 'EMPTY');
        
        // Helper to force value update for React/Angular/Vue
        function setNativeValue(element, value) {
          const lastValue = element.value;
          element.value = value;
          const event = new Event('input', { bubbles: true });
          // Hack for React 15/16
          const tracker = element._valueTracker;
          if (tracker) {
            tracker.setValue(lastValue);
          }
          element.dispatchEvent(event);
        }

        function triggerEvents(element) {
          const events = ['input', 'change', 'blur', 'focus', 'keydown', 'keyup', 'keypress'];
          events.forEach(evt => {
            element.dispatchEvent(new Event(evt, { bubbles: true }));
          });
        }

        function tryLogin() {
          console.log('CarParts AutoLogin: tryLogin called');
          
          // Find ALL inputs on the page
          const allInputs = Array.from(document.querySelectorAll('input'));
          console.log('CarParts AutoLogin: Found', allInputs.length, 'inputs');
          
          // 1. Find Username field with broader matching
          let userInput = allInputs.find(i => {
            const attrs = (i.name + i.id + i.placeholder + i.className + (i.type || '')).toLowerCase();
            return attrs.includes('user') || attrs.includes('email') || attrs.includes('login') || attrs.includes('benutzer');
          });
          
          // Fallback: first text/email input that's not password
          if (!userInput) {
            userInput = allInputs.find(i => (i.type === 'text' || i.type === 'email' || !i.type) && i.type !== 'password' && i.type !== 'hidden');
          }

          // 2. Find Password field
          const passInput = allInputs.find(i => i.type === 'password');
          
          console.log('CarParts AutoLogin: userInput found:', !!userInput, 'passInput found:', !!passInput);

          if (username && userInput && userInput.value !== username) {
            console.log('CarParts AutoLogin: Setting username');
            setNativeValue(userInput, username);
            triggerEvents(userInput);
          }

          if (password && passInput && passInput.value !== password) {
            console.log('CarParts AutoLogin: Setting password');
            setNativeValue(passInput, password);
            triggerEvents(passInput);
          }

          // 3. Click Button - broader matching
          if ((username && userInput) || (password && passInput)) {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [type="submit"], .btn, .button'));
            console.log('CarParts AutoLogin: Found', buttons.length, 'buttons');
            
            const actionBtn = buttons.find(b => {
              const text = (b.innerText || b.textContent || b.value || '').toLowerCase();
              const attrs = (b.className || '').toLowerCase();
              return text.includes('weiter') || text.includes('login') || text.includes('anmelden') || 
                     text.includes('einloggen') || text.includes('submit') ||
                     attrs.includes('submit') || attrs.includes('login');
            });

            // Fallback: first visible button
            const fallbackBtn = actionBtn || buttons.find(b => b.offsetParent !== null);

            if (fallbackBtn) {
              console.log('CarParts AutoLogin: Clicking button:', fallbackBtn.innerText || fallbackBtn.value);
              setTimeout(() => fallbackBtn.click(), 500);
            }
          }
        }

        function trySearch() {
          // Only run if we are NOT on a login page
          const isLoginPage = document.querySelector('input[type="password"]') || 
                              Array.from(document.querySelectorAll('input')).some(i => i.placeholder && i.placeholder.toLowerCase().includes('benutzer'));

          if (!isLoginPage) {
             const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
             
             // 1. Target the specific "Fahrzeug" search box (based on screenshot placeholder)
             // Placeholder: "z.B. Golf 4 / KBA Nummer 0588 599"
             let targetInput = inputs.find(i => {
               const ph = (i.placeholder || '').toLowerCase();
               return ph.includes('golf') || ph.includes('kba') || ph.includes('0588');
             });

             // 2. Fallback: Look for VIN/FIN specific inputs
             if (!targetInput) {
               targetInput = inputs.find(i => {
                 const text = (i.name + i.id + i.placeholder).toLowerCase();
                 return text.includes('vin') || text.includes('fin') || text.includes('chassis');
               });
             }

             // 3. Fallback: General search
             if (!targetInput) {
                targetInput = inputs.find(i => {
                 const text = (i.name + i.id + i.placeholder).toLowerCase();
                 return text.includes('search') || text.includes('suche');
               });
             }

             if (targetInput && query) {
               // Focus and set value
               targetInput.focus();
               setNativeValue(targetInput, query);
               triggerEvents(targetInput);
               
               // Try to submit via Enter key (often required for search bars)
               const enterEvent = { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true };
               targetInput.dispatchEvent(new KeyboardEvent('keydown', enterEvent));
               targetInput.dispatchEvent(new KeyboardEvent('keypress', enterEvent));
               targetInput.dispatchEvent(new KeyboardEvent('keyup', enterEvent));

               // Also try to find and click the search button
               // Look for a button sibling or inside the same wrapper
               let searchBtn = targetInput.parentElement?.querySelector('button, [role="button"], .icon-search, i.fa-search');
               
               // If not found, look for global search buttons
               if (!searchBtn) {
                  searchBtn = document.querySelector('button[type="submit"], .search-button') ||
                              Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('suchen'));
               }

               if (searchBtn) {
                 setTimeout(() => searchBtn.click(), 500);
               }
               return true;
             }
          }
          return false;
        }

        // Run logic with retries
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          
          // Check if we are on login page
          const isLoginPage = document.querySelector('input[type="password"]') || 
                              Array.from(document.querySelectorAll('input')).some(i => i.placeholder && i.placeholder.toLowerCase().includes('benutzer'));

          if (isLoginPage) {
            tryLogin();
            // Don't clear interval immediately, as it might be a multi-step login
            if (attempts > 20) clearInterval(interval); 
          } else {
            // If not login page, try search
            if (trySearch()) {
              clearInterval(interval);
            } else if (attempts > 10) {
              clearInterval(interval);
            }
          }
        }, 800);
      })();
    `
    win.webContents.executeJavaScript(script).catch((err) => {
      console.error('CarParts script error:', err);
    });
  }
  
  win.webContents.on('did-finish-load', runLoginScript);
  win.webContents.on('did-navigate', runLoginScript);
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  })
  return result.filePaths
})

// Check for duplicate customers before creating
ipcMain.handle('check-customer-duplicate', async (_, data) => {
  const { firstName, lastName, phone, email, licensePlate } = data
  
  const conditions: any[] = []
  
  // Check by name (both first and last name must match)
  if (firstName && lastName) {
    conditions.push({
      AND: [
        { firstName: { equals: firstName, mode: 'insensitive' } },
        { lastName: { equals: lastName, mode: 'insensitive' } }
      ]
    })
  }
  
  // Check by phone
  if (phone && phone.length > 5) {
    conditions.push({ phone: { contains: phone.replace(/\s/g, '') } })
  }
  
  // Check by email
  if (email && email.length > 3) {
    conditions.push({ email: { equals: email, mode: 'insensitive' } })
  }
  
  // Check by license plate (via vehicle)
  if (licensePlate && licensePlate.length > 2) {
    const cleanPlate = licensePlate.replace(/\s/g, '').toUpperCase()
    const vehicleMatch = await prisma.vehicle.findFirst({
      where: { 
        licensePlate: cleanPlate
      },
      include: { customer: true }
    })
    
    // @ts-ignore - customer is included via relation
    if (vehicleMatch && vehicleMatch.customer) {
      // @ts-ignore
      const customer = vehicleMatch.customer
      return {
        isDuplicate: true,
        matches: [{
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          matchReason: 'Kennzeichen'
        }]
      }
    }
  }
  
  if (conditions.length === 0) {
    return { isDuplicate: false, matches: [] }
  }
  
  const duplicates = await prisma.customer.findMany({
    where: { OR: conditions },
    take: 5,
    include: { vehicles: true }
  })
  
  if (duplicates.length > 0) {
    const matches = duplicates.map(d => {
      let matchReason = ''
      if (firstName && lastName && 
          d.firstName?.toLowerCase() === firstName.toLowerCase() && 
          d.lastName?.toLowerCase() === lastName.toLowerCase()) {
        matchReason = 'Name'
      } else if (phone && d.phone?.includes(phone.replace(/\s/g, ''))) {
        matchReason = 'Telefon'
      } else if (email && d.email?.toLowerCase() === email.toLowerCase()) {
        matchReason = 'E-Mail'
      }
      
      return {
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        address: d.address,
        vehicles: d.vehicles?.map(v => v.licensePlate).filter(Boolean),
        matchReason
      }
    })
    
    return { isDuplicate: true, matches }
  }
  
  return { isDuplicate: false, matches: [] }
})

ipcMain.handle('create-customer', async (_, data) => {
  const { firstName, lastName, address, phone, licensePlate, vin, make, model, hsn, tsn, firstRegistration, mileage, fuelType, transmission, filePaths } = data
  
  const documentsData: any[] = []
  if (filePaths && filePaths.length > 0) {
    const userDataPath = app.getPath('userData')
    const docsDir = join(userDataPath, 'documents')
    await fs.mkdir(docsDir, { recursive: true })

    for (const filePath of filePaths) {
      const fileName = basename(filePath)
      const destPath = join(docsDir, `${Date.now()}_${fileName}`)
      await fs.copyFile(filePath, destPath)
      documentsData.push({
        name: fileName,
        path: destPath
      })
    }
  }

  const customer = await prisma.customer.create({
    data: {
      firstName,
      lastName,
      address,
      phone,
      vehicles: {
        create: {
          licensePlate,
          vin,
          make,
          model,
          hsn,
          tsn,
          firstRegistration: firstRegistration ? new Date(firstRegistration) : null,
          mileage: mileage ? parseInt(mileage) : null,
          fuelType,
          transmission
        }
      },
      documents: {
        create: documentsData
      }
    }
  })
  return customer
})

ipcMain.handle('get-customers', async () => {
  return await prisma.customer.findMany({
    include: {
      vehicles: true
    }
  })
})

ipcMain.handle('get-customer', async (_, id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      documents: true,
      history: {
        orderBy: {
          date: 'desc'
        },
        include: {
            documents: true
        }
      }
    }
  })

  if (customer && customer.tireStorageSpot) {
    const spot = await prisma.tireStorageSpot.findUnique({
      where: { id: customer.tireStorageSpot }
    })
    return { ...customer, tireStorageSpotData: spot }
  }

  return customer
})

ipcMain.handle('add-history-entry', async (_, data) => {
  const { customerId, vehicleId, description, date, mileage, filePaths } = data
  
  const documentsData: any[] = []
  if (filePaths && filePaths.length > 0) {
    const userDataPath = app.getPath('userData')
    const docsDir = join(userDataPath, 'documents')
    await fs.mkdir(docsDir, { recursive: true })

    for (const filePath of filePaths) {
      const fileName = basename(filePath)
      const destPath = join(docsDir, `${Date.now()}_${fileName}`)
      await fs.copyFile(filePath, destPath)
      documentsData.push({
        name: fileName,
        path: destPath,
        type: 'manual',
        customerId: customerId
      })
    }
  }

  const record = await prisma.serviceRecord.create({
    data: {
      customerId,
      vehicleId: vehicleId ? parseInt(vehicleId) : null,
      description,
      date: new Date(date),
      mileage: mileage ? parseInt(mileage) : null,
      documents: {
        create: documentsData
      }
    }
  })

  // Update Vehicle Mileage
  if (vehicleId && mileage) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } })
    if (vehicle && (parseInt(mileage) > (vehicle.mileage || 0))) {
      await prisma.vehicle.update({
        where: { id: parseInt(vehicleId) },
        data: { mileage: parseInt(mileage) }
      })
    }
  }

  return record
})

ipcMain.handle('update-history-entry', async (_, data) => {
  const { id, description, mileage, filePaths, customerId } = data
  
  const documentsData: any[] = []
  if (filePaths && filePaths.length > 0) {
    const userDataPath = app.getPath('userData')
    const docsDir = join(userDataPath, 'documents')
    await fs.mkdir(docsDir, { recursive: true })

    for (const filePath of filePaths) {
      const fileName = basename(filePath)
      const destPath = join(docsDir, `${Date.now()}_${fileName}`)
      await fs.copyFile(filePath, destPath)
      documentsData.push({
        name: fileName,
        path: destPath,
        type: 'manual',
        customerId: customerId,
        serviceRecordId: id
      })
    }
  }
  return await prisma.serviceRecord.update({
    where: { id },
    data: {
      description,
      mileage: mileage ? parseInt(mileage) : null,
      documents: {
        create: documentsData
      }
    }
  })
})

ipcMain.handle('delete-customer', async (_, id) => {
  // Delete related records first to avoid foreign key constraint errors
  await prisma.document.deleteMany({ where: { customerId: id } })
  await prisma.serviceRecord.deleteMany({ where: { customerId: id } })
  await prisma.appointment.deleteMany({ where: { customerId: id } })
  await prisma.vehicle.deleteMany({ where: { customerId: id } })
  
  return await prisma.customer.delete({
    where: { id }
  })
})

// Search customers (for merge/transfer dialogs)
ipcMain.handle('search-customers', async (_, { query, excludeId }) => {
  if (!query || query.length < 1) return []
  
  // Check if search term is a number (customer ID search)
  const isNumericSearch = /^\d+$/.test(query.trim())
  
  if (isNumericSearch) {
    // Search by customer ID
    const customerId = parseInt(query.trim())
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { vehicles: true }
    })
    
    if (customer && (!excludeId || customer.id !== excludeId)) {
      return [customer]
    }
    return []
  }
  
  // Normal text search
  const conditions: any[] = [
    { firstName: { contains: query } },
    { lastName: { contains: query } },
    { phone: { contains: query } },
    { email: { contains: query } }
  ]
  
  // Also search by license plate
  const vehicleMatches = await prisma.vehicle.findMany({
    where: { licensePlate: { contains: query.toUpperCase() } },
    select: { customerId: true }
  })
  const vehicleCustomerIds = vehicleMatches.map(v => v.customerId)
  
  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        excludeId ? { id: { not: excludeId } } : {},
        {
          OR: [
            ...conditions,
            ...(vehicleCustomerIds.length > 0 ? [{ id: { in: vehicleCustomerIds } }] : [])
          ]
        }
      ]
    },
    take: 10,
    include: { vehicles: true }
  })
  
  return customers
})

// Merge two customers
ipcMain.handle('merge-customers', async (_, { targetCustomerId, sourceCustomerId, keepTargetData }) => {
  if (!targetCustomerId || !sourceCustomerId) {
    throw new Error('Beide Kunden-IDs sind erforderlich')
  }
  
  if (targetCustomerId === sourceCustomerId) {
    throw new Error('Kann einen Kunden nicht mit sich selbst zusammenführen')
  }
  
  // Get both customers
  const [target, source] = await Promise.all([
    prisma.customer.findUnique({ 
      where: { id: targetCustomerId },
      include: { vehicles: true, documents: true, history: true, appointments: true }
    }),
    prisma.customer.findUnique({ 
      where: { id: sourceCustomerId },
      include: { vehicles: true, documents: true, history: true, appointments: true }
    })
  ])
  
  if (!target || !source) {
    throw new Error('Einer oder beide Kunden wurden nicht gefunden')
  }
  
  // Move all vehicles from source to target
  await prisma.vehicle.updateMany({
    where: { customerId: source.id },
    data: { customerId: target.id }
  })
  
  // Move all documents from source to target
  await prisma.document.updateMany({
    where: { customerId: source.id },
    data: { customerId: target.id }
  })
  
  // Move all service records (history) from source to target
  await prisma.serviceRecord.updateMany({
    where: { customerId: source.id },
    data: { customerId: target.id }
  })
  
  // Move all appointments from source to target
  await prisma.appointment.updateMany({
    where: { customerId: source.id },
    data: { customerId: target.id }
  })
  
  // Update target customer with source data if target data is empty
  if (keepTargetData) {
    const updateData: any = {}
    if (!target.phone && source.phone) updateData.phone = source.phone
    if (!target.email && source.email) updateData.email = source.email
    if (!target.address && source.address) updateData.address = source.address
    
    if (Object.keys(updateData).length > 0) {
      await prisma.customer.update({
        where: { id: target.id },
        data: updateData
      })
    }
  }
  
  // Delete the source customer (now empty)
  await prisma.customer.delete({
    where: { id: source.id }
  })
  
  // Return the merged customer
  const mergedCustomer = await prisma.customer.findUnique({
    where: { id: target.id },
    include: { vehicles: true, documents: true, history: true, appointments: true }
  })
  
  return { 
    success: true, 
    message: `Kunde "${source.firstName} ${source.lastName}" wurde mit "${target.firstName} ${target.lastName}" zusammengeführt`,
    customer: mergedCustomer
  }
})

// Transfer a vehicle to another customer
ipcMain.handle('transfer-vehicle', async (_, { vehicleId, targetCustomerId }) => {
  if (!vehicleId || !targetCustomerId) {
    throw new Error('Fahrzeug-ID und Ziel-Kunden-ID sind erforderlich')
  }
  
  // Check if target customer exists
  const targetCustomer = await prisma.customer.findUnique({
    where: { id: targetCustomerId }
  })
  
  if (!targetCustomer) {
    throw new Error('Ziel-Kunde nicht gefunden')
  }
  
  // Get the vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { customer: true }
  })
  
  if (!vehicle) {
    throw new Error('Fahrzeug nicht gefunden')
  }
  
  if (vehicle.customerId === targetCustomerId) {
    throw new Error('Fahrzeug gehört bereits diesem Kunden')
  }
  
  // Transfer the vehicle
  const updatedVehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { customerId: targetCustomerId },
    include: { customer: true }
  })
  
  return { 
    success: true, 
    message: `Fahrzeug ${vehicle.licensePlate || vehicle.make + ' ' + vehicle.model} wurde zu "${targetCustomer.firstName} ${targetCustomer.lastName}" übertragen`,
    vehicle: updatedVehicle
  }
})

ipcMain.handle('update-customer', async (_, data) => {
  const { id, firstName, lastName, address, phone, email, tireStorageSpot } = data
  return await prisma.customer.update({
    where: { id },
    data: { firstName, lastName, address, phone, email, tireStorageSpot }
  })
})

ipcMain.handle('update-vehicle', async (_, data) => {
  const { id, notes, mileage, fuelType, transmission, make, model, licensePlate, vin, firstRegistration, hsn, tsn } = data
  return await prisma.vehicle.update({
    where: { id },
    data: { 
      make,
      model,
      licensePlate,
      vin,
      firstRegistration: firstRegistration ? new Date(firstRegistration) : undefined,
      hsn,
      tsn,
      notes,
      mileage: mileage ? parseInt(mileage) : undefined,
      fuelType,
      transmission
    }
  })
})

ipcMain.handle('create-vehicle', async (_, data) => {
  const { customerId, make, model, licensePlate, vin, firstRegistration, hsn, tsn, notes, mileage, fuelType, transmission } = data
  return await prisma.vehicle.create({
    data: {
      customerId,
      make,
      model,
      licensePlate,
      vin,
      firstRegistration: firstRegistration ? new Date(firstRegistration) : null,
      hsn,
      tsn,
      notes,
      mileage: (mileage !== null && mileage !== undefined && mileage !== '') ? Number(mileage) : null,
      fuelType,
      transmission
    }
  })
})

ipcMain.handle('get-tire-spots', async () => {
  return await prisma.tireStorageSpot.findMany()
})

ipcMain.handle('update-tire-spot', async (_, data) => {
  const { id, label, status } = data
  return await prisma.tireStorageSpot.upsert({
    where: { id },
    update: { label, status },
    create: { id, label, status }
  })
})

ipcMain.handle('add-customer-documents', async (_, data) => {
  const { customerId, filePaths } = data
  
  if (filePaths && filePaths.length > 0) {
    const userDataPath = app.getPath('userData')
    const docsDir = join(userDataPath, 'documents')
    await fs.mkdir(docsDir, { recursive: true })

    for (const filePath of filePaths) {
      const fileName = basename(filePath)
      const destPath = join(docsDir, `${Date.now()}_${fileName}`)
      await fs.copyFile(filePath, destPath)
      
      await prisma.document.create({
        data: {
            name: fileName,
            path: destPath,
            type: 'manual',
            customerId: customerId
        }
      })
    }
  }
  return true
})

ipcMain.handle('open-file', async (_, filePath) => {
  await shell.openPath(filePath)
})

ipcMain.handle('analyze-registration-doc', async (_, args) => {
  // Support both old (string) and new (object) call signature
  const filePath = typeof args === 'string' ? args : args.filePath
  const extractCustomerData = typeof args === 'object' ? args.extractCustomerData : false

  const settings = await prisma.settings.findFirst()
  if (!settings || !settings.openaiKey) {
    throw new Error('Kein OpenAI API Key in den Einstellungen gefunden.')
  }

  const openai = new OpenAI({ apiKey: settings.openaiKey })
  
  const fileBuffer = await fs.readFile(filePath)
  const base64Image = fileBuffer.toString('base64')
  const extension = extname(filePath).toLowerCase()
  
  let mimeType = 'image/jpeg'
  if (extension === '.png') mimeType = 'image/png'
  if (extension === '.webp') mimeType = 'image/webp'
  if (extension === '.gif') mimeType = 'image/gif'
  
  if (extension === '.pdf') {
    throw new Error('PDF-Dateien werden aktuell nicht für den KI-Scan unterstützt. Bitte verwenden Sie ein Foto (JPG/PNG).')
  }
  
  try {
    const vehicleDataInstruction = `
Section 2: Fahrzeugdaten (Vehicle Data)
Kennzeichen (License Plate)
Source Field: Code A.
Location: Top left of the document (under "Amtliches Kennzeichen") or inside the first box of the main grid.
Instruction: Extract the alphanumeric string found in the box labeled A.
Example value in image: "SP MQ 16".
FIN (Fahrzeugidentifikationsnummer / VIN)
Source Field: Code E.
Location: Top row of the central data grid, just below the license plate date.
Instruction: Extract the long alphanumeric string labeled E.
Example value in image: "KNARH81GB..."
Marke (Brand)
Source Field: Code D.1.
Location: Second row of the central data grid.
Instruction: Extract the manufacturer name labeled D.1.
Example value in image: "Kia".
Modell (Model)
Source Field: Code D.3.
Location: Fourth row of the central data grid (below D.2).
Instruction: Extract the commercial description labeled D.3.
Example value in image: "SORENTO".
HSN (4-stellig)
Source Field: Code 2.1.
Location: Top row of the central data grid, center column.
Instruction: Extract the 4-digit numeric code labeled 2.1.
Example value in image: "8253".
TSN (3-stellig)
Source Field: Code 2.2.
Location: Top row of the central data grid, right column.
Instruction: Extract the first 3 characters of the code labeled 2.2.
Example value in image: "AIP" (Full value is AIP000047).
Erstzulassung (First Registration)
Source Field: Code B.
Location: Top left corner of the central data grid (highlighted in red in the source image).
Instruction: Extract the date found in the box labeled B.
Example value in image: "21.10.2020".
Kraftstoff (Fuel Type)
Source Field: Code P.3.
Location: Lower half of the central data grid, left side.
Instruction: Extract the text description labeled P.3.
Example value in image: "Hybr.Benzin/E" (Hybrid Petrol/Electric).
`

    const personalDataInstruction = `
Section 1: Persönliche Daten (Personal Data)
Vorname (First Name) / Nachname (Last Name)
Source Field: Codes C.1.1 (Last Name/Company) and C.1.2 (First Name).
Location: Left column, middle section.
Instruction: Extract the text under C.1.1 for the Last Name or Company Name. If a personal name exists under C.1.2, use that for First Name.
Example value in image: "Autohaus Bellemann GmbH" (Company name).
Anschrift (Address)
Source Field: Code C.1.3.
Location: Left column, lower section.
Instruction: Extract the street, postal code, and city found under C.1.3.
Example value in image: "Tullastr. 10, 67346 Speyer".
Telefon / Mobil
Instruction: Do not extract. This information is not present on the registration document.
`

    let systemPrompt = "Du bist ein Assistent für eine KFZ-Werkstatt. Analysiere das Bild eines Fahrzeugscheins und extrahiere die Daten basierend auf folgenden Instruktionen:\n"

    if (extractCustomerData) {
      systemPrompt += personalDataInstruction + "\n" + vehicleDataInstruction
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "...", "firstName": "...", "lastName": "...", "address": "..." }`
    } else {
      systemPrompt += vehicleDataInstruction
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "..." }`
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrahiere die Daten aus diesem Dokument:" },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = response.choices[0].message.content
    return JSON.parse(content || '{}')
  } catch (error: any) {
    if (error.status === 429) {
      throw new Error('OpenAI Quote überschritten: Bitte prüfen Sie Ihr Guthaben oder Ihre API-Limits bei OpenAI.')
    }
    if (error.status === 401) {
      throw new Error('Ungültiger OpenAI API-Key. Bitte prüfen Sie die Einstellungen.')
    }
    throw error
  }
})

// Settings & Lexware Handlers
ipcMain.handle('get-settings', async () => {
  console.log('IPC: get-settings called')
  return await prisma.settings.findFirst()
})

// Service Templates Handlers
ipcMain.handle('get-service-templates', async () => {
  return await prisma.serviceTemplate.findMany({
    orderBy: { title: 'asc' }
  })
})

ipcMain.handle('create-service-template', async (_, data) => {
  const { title, description } = data
  return await prisma.serviceTemplate.create({
    data: { title, description }
  })
})

ipcMain.handle('update-service-template', async (_, data) => {
  const { id, title, description } = data
  return await prisma.serviceTemplate.update({
    where: { id },
    data: { title, description }
  })
})

ipcMain.handle('delete-service-template', async (_, id) => {
  return await prisma.serviceTemplate.delete({
    where: { id }
  })
})

// Appointment Handlers
ipcMain.handle('get-appointments', async (_, range) => {
  const { start, end } = range || {}
  const where: any = {}
  
  if (start && end) {
    where.start = {
      gte: new Date(start),
      lte: new Date(end)
    }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      customer: true,
      vehicle: true
    },
    orderBy: { start: 'asc' }
  })

  // Enrich with Tire Storage Spot Data
  for (const apt of appointments) {
    if (apt.customer && apt.customer.tireStorageSpot) {
      const spot = await prisma.tireStorageSpot.findUnique({
        where: { id: apt.customer.tireStorageSpot }
      })
      // @ts-ignore
      apt.customer.tireStorageSpotData = spot
    }
  }

  return appointments
})

ipcMain.handle('get-appointment', async (_, id) => {
  const apt = await prisma.appointment.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: true,
      vehicle: true
    }
  })
  
  if (apt && apt.customer && apt.customer.tireStorageSpot) {
    const spot = await prisma.tireStorageSpot.findUnique({
      where: { id: apt.customer.tireStorageSpot }
    })
    // @ts-ignore
    apt.customer.tireStorageSpotData = spot
  }
  
  return apt
})

ipcMain.handle('create-appointment', async (_, data) => {
  const { title, start, end, description, status, customerId, vehicleId } = data
  return await prisma.appointment.create({
    data: {
      title,
      start: new Date(start),
      end: new Date(end),
      description,
      status: status || 'open',
      customerId: customerId ? parseInt(customerId) : null,
      vehicleId: vehicleId ? parseInt(vehicleId) : null
    }
  })
})

ipcMain.handle('update-appointment', async (_, data) => {
  const { id, title, start, end, description, status, customerId, vehicleId } = data
  return await prisma.appointment.update({
    where: { id },
    data: {
      title,
      start: new Date(start),
      end: new Date(end),
      description,
      status,
      customerId: customerId ? parseInt(customerId) : null,
      vehicleId: vehicleId ? parseInt(vehicleId) : null
    }
  })
})

ipcMain.handle('delete-appointment', async (_, id) => {
  return await prisma.appointment.delete({
    where: { id }
  })
})

ipcMain.handle('complete-appointment', async (_, { appointmentId, mileage, description, date }) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { vehicle: true }
  })

  if (!appointment) throw new Error('Appointment not found')

  // Update Appointment
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'done' }
  })

  // Create Service Record
  let history: any = null
  if (appointment.customerId) {
    history = await prisma.serviceRecord.create({
      data: {
        date: date ? new Date(date) : new Date(),
        description: description || appointment.description || 'Service completed',
        mileage: mileage || appointment.vehicle?.mileage,
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
      }
    })
  }

  // Update Vehicle Mileage
  if (mileage && appointment.vehicleId) {
    const currentMileage = appointment.vehicle?.mileage || 0
    if (mileage > currentMileage) {
      await prisma.vehicle.update({
        where: { id: appointment.vehicleId },
        data: { mileage: mileage }
      })
    }
  }

  return history
})

// Todo Handlers
ipcMain.handle('get-todos', async () => {
  return await prisma.todo.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' }
  })
})

ipcMain.handle('create-todo', async (_, data) => {
  return await prisma.todo.create({
    data,
    include: { customer: true }
  })
})

ipcMain.handle('update-todo', async (_, { id, ...data }) => {
  return await prisma.todo.update({
    where: { id },
    data,
    include: { customer: true }
  })
})

ipcMain.handle('delete-todo', async (_, id) => {
  return await prisma.todo.delete({
    where: { id }
  })
})

// Dashboard Handlers
ipcMain.handle('get-dashboard-stats', async () => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      vehicle: true,
      customer: true
    },
    orderBy: {
      start: 'asc'
    }
  })

  return {
    todayAppointments
  }
})

// Shop Closure Handlers
ipcMain.handle('get-shop-closures', async (_, range) => {
  const { start, end } = range || {}
  const where: any = {}
  
  if (start && end) {
    where.OR = [
      {
        start: { lte: new Date(end) },
        end: { gte: new Date(start) }
      }
    ]
  }

  return await prisma.shopClosure.findMany({
    where,
    orderBy: { start: 'asc' }
  })
})

ipcMain.handle('create-shop-closure', async (_, data) => {
  const { start, end, description } = data
  return await prisma.shopClosure.create({
    data: {
      start: new Date(start),
      end: new Date(end),
      description
    }
  })
})

ipcMain.handle('delete-shop-closure', async (_, id) => {
  return await prisma.shopClosure.delete({
    where: { id }
  })
})

// Global Search Handler
ipcMain.handle('global-search', async (_, query) => {
  if (!query || query.length < 2) return []

  const results: any[] = []

  // Search Customers
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { phone: { contains: query } }
      ]
    },
    take: 5
  })

  customers.forEach(c => {
    results.push({
      type: 'customer',
      id: c.id,
      primaryText: `${c.firstName} ${c.lastName}`,
      secondaryText: c.address || 'Keine Adresse',
      customerId: c.id
    })
  })

  // Search Vehicles
  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { licensePlate: { contains: query } },
        { vin: { contains: query } },
        { make: { contains: query } },
        { model: { contains: query } }
      ]
    },
    include: { customer: true },
    take: 5
  })

  vehicles.forEach(v => {
    results.push({
      type: 'vehicle',
      id: v.id,
      primaryText: `${v.make} ${v.model} (${v.licensePlate})`,
      secondaryText: `Kunde: ${v.customer.firstName} ${v.customer.lastName}`,
      customerId: v.customerId
    })
  })

  return results
})

ipcMain.handle('create-backup', async () => {
  try {
    const userDataPath = app.getPath('userData')
    const dbPath = is.dev ? 'dev.db' : join(userDataPath, 'database.db')
    const docsDir = join(userDataPath, 'documents')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = join(app.getPath('documents'), 'Werkstatt-Backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    const targetDir = join(backupDir, `Backup_${timestamp}`)
    await fs.mkdir(targetDir, { recursive: true })

    // Copy DB
    if (is.dev) {
       await fs.copyFile(dbPath, join(targetDir, 'database.db'))
    } else {
       await fs.copyFile(dbPath, join(targetDir, 'database.db'))
    }

    // Copy Documents
    try {
      await fs.cp(docsDir, join(targetDir, 'documents'), { recursive: true })
    } catch (e) {
      console.log('No documents to backup or error copying docs', e)
    }

    return { success: true, path: targetDir }
  } catch (error: any) {
    console.error('Backup failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-settings', async (_, data) => {
  const { apiKey, openaiKey, openaiModel, aiPrompt, carPartsUser, carPartsPass, conradUser, conradPass, lexwareUser, lexwarePass, theme, autoSync } = data
  // Check if settings exist, update or create
  const existing = await prisma.settings.findFirst()
  if (existing) {
    return await prisma.settings.update({
      where: { id: existing.id },
      data: { 
        ...(apiKey !== undefined && { apiKey }),
        ...(openaiKey !== undefined && { openaiKey }),
        ...(openaiModel !== undefined && { openaiModel }),
        ...(aiPrompt !== undefined && { aiPrompt }),
        ...(carPartsUser !== undefined && { carPartsUser }),
        ...(carPartsPass !== undefined && { carPartsPass }),
        ...(conradUser !== undefined && { conradUser }),
        ...(conradPass !== undefined && { conradPass }),
        ...(lexwareUser !== undefined && { lexwareUser }),
        ...(lexwarePass !== undefined && { lexwarePass }),
        ...(theme !== undefined && { theme }),
        ...(autoSync !== undefined && { autoSync })
      }
    })
  } else {
    return await prisma.settings.create({
      data: { 
        apiKey: apiKey || null, 
        openaiKey: openaiKey || null,
        openaiModel: openaiModel || 'gpt-4o-mini',
        aiPrompt: aiPrompt || null,
        carPartsUser: carPartsUser || null,
        carPartsPass: carPartsPass || null,
        conradUser: conradUser || null,
        conradPass: conradPass || null,
        lexwareUser: lexwareUser || null,
        lexwarePass: lexwarePass || null,
        theme: theme || 'dark',
        syncEnabled: true,
        autoSync: autoSync || false
      }
    })
  }
})

ipcMain.handle('sync-lexware', async () => {
  console.log('IPC: sync-lexware called')
  const settings = await prisma.settings.findFirst()
  if (!settings || !settings.apiKey) {
    throw new Error('Kein API Key gefunden')
  }

  // REAL IMPLEMENTATION
  try {
    // 1. Fetch ALL contacts from Lexware Public API
    let allContacts: any[] = []
    let page = 0
    let hasMoreContacts = true
    
    while (hasMoreContacts) {
        console.log(`Lade Kontakte Seite ${page}...`)
        const response = await fetch(`https://api.lexoffice.io/v1/contacts?page=${page}&size=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Lexware API Fehler (Kontakte): ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const content = data.content || []
        allContacts = [...allContacts, ...content]
        
        if (data.last || content.length === 0) {
            hasMoreContacts = false
        } else {
            page++
        }
        
        // Safety break
        if (page > 100) hasMoreContacts = false
    }
    
    // 2. Sync contacts to local DB
    let syncedCount = 0
    let updatedCount = 0
    
    console.log(`Gefundene Kontakte in Lexware: ${allContacts.length}`)

    // @ts-ignore
    for (const contact of allContacts) {
        // Better mapping for Lexoffice structure
        const email = contact.emailAddresses?.business?.[0] || contact.emailAddresses?.private?.[0] || contact.emailAddresses?.other?.[0] || null
        const phone = contact.phoneNumbers?.business?.[0] || contact.phoneNumbers?.mobile?.[0] || contact.phoneNumbers?.private?.[0] || contact.phoneNumbers?.other?.[0] || null
        
        const street = contact.addresses?.billing?.[0]?.street || contact.addresses?.shipping?.[0]?.street || ''
        const city = contact.addresses?.billing?.[0]?.city || contact.addresses?.shipping?.[0]?.city || ''
        const zip = contact.addresses?.billing?.[0]?.zip || contact.addresses?.shipping?.[0]?.zip || ''
        const fullAddress = street ? `${street}, ${zip} ${city}` : ''

        // Try to find existing customer by Lexware ID or Email
        const existing = await prisma.customer.findFirst({
            where: {
                OR: [
                    { lexwareId: contact.id },
                    // Only match by email if email exists and is not empty
                    ...(email ? [{ email: email }] : [])
                ]
            }
        })

        const customerData = {
            lexwareId: contact.id,
            firstName: contact.company ? contact.company.name : (contact.person?.firstName || ''),
            lastName: contact.company ? '(Firma)' : (contact.person?.lastName || ''),
            email: email,
            phone: phone,
            address: fullAddress
        }

        if (existing) {
            // Update existing
            await prisma.customer.update({
                where: { id: existing.id },
                data: customerData
            })
            updatedCount++
        } else {
            // Create new
            await prisma.customer.create({
                data: customerData
            })
            syncedCount++
        }
    }

    // 3. Sync Invoices
    let syncedInvoices = 0
    let invoicePage = 0
    let hasMoreInvoices = true
    let allVouchers: any[] = []

    // Wait before starting invoice sync to avoid rate limiting
    console.log('Warte 2 Sekunden vor Rechnungs-Sync (Rate Limiting)...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Starte Rechnungs-Sync...')
    
    while (hasMoreInvoices) {
        console.log(`Lade Rechnungsliste Seite ${invoicePage}...`)
        const invoiceResponse = await fetch(`https://api.lexoffice.io/v1/voucherlist?voucherType=invoice&voucherStatus=open,paid,voided&page=${invoicePage}&size=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Accept': 'application/json'
            }
        })

        if (!invoiceResponse.ok) {
             console.error(`Fehler beim Laden der Rechnungsliste: ${invoiceResponse.status}`)
             break
        }

        const invoiceData = await invoiceResponse.json()
        const voucherList = invoiceData.content || []
        allVouchers = [...allVouchers, ...voucherList]
        
        if (invoiceData.last || voucherList.length === 0) {
            hasMoreInvoices = false
        } else {
            invoicePage++
        }
        
        if (invoicePage > 100) hasMoreInvoices = false
    }

    console.log(`Gefundene Rechnungen in Lexware: ${allVouchers.length}`)
        
    const userDataPath = app.getPath('userData')
    const docsDir = join(userDataPath, 'documents')
    await fs.mkdir(docsDir, { recursive: true })

    for (const voucher of allVouchers) {
            // Rate limiting: Wait 500ms between requests to avoid 429 errors
            await new Promise(resolve => setTimeout(resolve, 500))

            // Fetch full invoice details to get contactId and correct amounts
            const detailResponse = await fetch(`https://api.lexoffice.io/v1/invoices/${voucher.id}`, {
                 method: 'GET',
                 headers: {
                    'Authorization': `Bearer ${settings.apiKey}`,
                    'Accept': 'application/json'
                 }
            })
            
            if (!detailResponse.ok) {
                console.error(`Konnte Details für Rechnung ${voucher.voucherNumber} nicht laden: ${detailResponse.status}`)
                continue
            }
            
            const invoice = await detailResponse.json()

            // Find local customer
            // Lexoffice invoice object has "address.contactId" usually
            const contactId = invoice.address?.contactId
            
            if (!contactId) {
                // console.log(`Rechnung ${invoice.voucherNumber} hat keine ContactID.`)
                continue
            }

            const customer = await prisma.customer.findUnique({
                where: { lexwareId: contactId }
            })

            if (!customer) {
                // console.log(`Kunde ${contactId} für Rechnung ${invoice.voucherNumber} nicht gefunden.`)
                continue 
            }

            console.log(`Verarbeite Rechnung ${invoice.voucherNumber} für Kunde ${customer.firstName} ${customer.lastName}`)

            // 1. Create/Update History Entry (ServiceRecord)
            const recordData = {
                date: new Date(invoice.voucherDate),
                description: `Rechnung ${invoice.voucherNumber}`,
                cost: invoice.totalPrice?.totalGrossAmount || 0,
                lexwareId: invoice.id,
                customerId: customer.id
            }

            const existingRecord = await prisma.serviceRecord.findUnique({
                where: { lexwareId: invoice.id }
            })

            if (existingRecord) {
                await prisma.serviceRecord.update({
                    where: { id: existingRecord.id },
                    data: recordData
                })
            } else {
                await prisma.serviceRecord.create({
                    data: recordData
                })
            }

            // 2. Download PDF and create Document
            // Check if document already exists
            const existingDoc = await prisma.document.findUnique({
                where: { lexwareId: invoice.id }
            })

            if (!existingDoc) {
                try {
                    console.log(`Lade PDF für Rechnung ${invoice.voucherNumber}...`)
                    await new Promise(resolve => setTimeout(resolve, 200))
                    // Fetch PDF content
                    // Endpoint: /v1/invoices/{id}/document
                    const pdfResponse = await fetch(`https://api.lexoffice.io/v1/invoices/${invoice.id}/document`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${settings.apiKey}`,
                            'Accept': 'application/json'
                        }
                    })

                    if (pdfResponse.ok) {
                        const pdfData = await pdfResponse.json()
                        
                        if (pdfData.documentFileId) {
                             await new Promise(resolve => setTimeout(resolve, 200))
                             const fileResponse = await fetch(`https://api.lexoffice.io/v1/files/${pdfData.documentFileId}`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${settings.apiKey}`,
                                    'Accept': '*/*'
                                }
                            })

                            if (fileResponse.ok) {
                                const buffer = await fileResponse.arrayBuffer()
                                const fileName = `Rechnung_${invoice.voucherNumber}.pdf`
                                const destPath = join(docsDir, `${Date.now()}_${fileName}`)
                                
                                await fs.writeFile(destPath, Buffer.from(buffer))

                                await prisma.document.create({
                                    data: {
                                        name: fileName,
                                        path: destPath,
                                        type: 'invoice',
                                        lexwareId: invoice.id,
                                        customerId: customer.id
                                    }
                                })
                                syncedInvoices++
                                console.log(`PDF gespeichert: ${fileName}`)
                            } else {
                                console.error(`Fehler beim Laden der Datei ${pdfData.documentFileId}: ${fileResponse.status}`)
                            }
                        }
                    } else {
                        console.error(`Fehler beim Abrufen der Dokument-ID für Rechnung ${invoice.id}: ${pdfResponse.status}`)
                    }
                } catch (err) {
                    console.error(`Fehler beim PDF Download für Rechnung ${invoice.voucherNumber}:`, err)
                }
            }
    }

    // === BIDIRECTIONAL SYNC: Export local customers to Lexware ===
    let exportedCount = 0
    console.log('Starte Export lokaler Kunden zu Lexware...')
    
    // Find all customers without lexwareId (not yet synced to Lexware)
    const localOnlyCustomers = await prisma.customer.findMany({
      where: { lexwareId: null }
    })
    
    console.log(`${localOnlyCustomers.length} lokale Kunden ohne Lexware-ID gefunden`)
    
    for (const customer of localOnlyCustomers) {
      // Skip customers without last name (invalid data)
      if (!customer.lastName || customer.lastName === '(Firma)') {
        continue
      }
      
      try {
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Parse address if available
        let street = ''
        let zip = ''
        let city = ''
        
        if (customer.address) {
          // Try to parse address like "Straße 123, 12345 Stadt"
          const addressParts = customer.address.split(',')
          if (addressParts.length >= 2) {
            street = addressParts[0].trim()
            const zipCity = addressParts[1].trim().split(' ')
            if (zipCity.length >= 2) {
              zip = zipCity[0]
              city = zipCity.slice(1).join(' ')
            }
          } else {
            street = customer.address
          }
        }
        
        // Build Lexware contact object
        const contactData: any = {
          version: 0,
          roles: {
            customer: {}
          },
          person: {
            firstName: customer.firstName || '',
            lastName: customer.lastName
          }
        }
        
        // Add address if available
        if (street || city || zip) {
          contactData.addresses = {
            billing: [{
              street: street,
              zip: zip,
              city: city,
              countryCode: 'DE'
            }]
          }
        }
        
        // Add email if available
        if (customer.email) {
          contactData.emailAddresses = {
            business: [customer.email]
          }
        }
        
        // Add phone if available
        if (customer.phone) {
          contactData.phoneNumbers = {
            mobile: [customer.phone]
          }
        }
        
        // Create contact in Lexware
        const createResponse = await fetch('https://api.lexoffice.io/v1/contacts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(contactData)
        })
        
        if (createResponse.ok) {
          const result = await createResponse.json()
          
          // Update local customer with Lexware ID
          await prisma.customer.update({
            where: { id: customer.id },
            data: { lexwareId: result.id }
          })
          
          exportedCount++
          console.log(`Kunde ${customer.firstName} ${customer.lastName} zu Lexware exportiert (ID: ${result.id})`)
        } else {
          const errorText = await createResponse.text()
          console.error(`Fehler beim Export von ${customer.lastName}: ${createResponse.status} - ${errorText}`)
        }
      } catch (err) {
        console.error(`Export-Fehler für Kunde ${customer.id}:`, err)
      }
    }

    // Update lastSync
    await prisma.settings.update({
        where: { id: settings.id },
        data: { lastSync: new Date() }
    })

    console.log('Sync-Lexware: Finished successfully')
    return { success: true, message: `Sync fertig! ${syncedCount} Kunden importiert, ${updatedCount} aktualisiert, ${exportedCount} zu Lexware exportiert. ${syncedInvoices} Rechnungen importiert.` }

  } catch (error) {
    console.error('Lexware Sync Error:', error)
    throw new Error(`Verbindung fehlgeschlagen: ${(error as Error).message}`)
  }
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Allow loading local files
      webviewTag: true
    }
  })

  // Remove restrictive CSP to allow connections to remote servers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * 'self' ws: wss: http: https:; frame-src * 'self' https:; img-src * 'self' data: blob: http: https:; font-src * 'self' data:;"]
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  logger.init()
  setupLoggerIPC()
  logger.info('Application starting...')

  // Run database migrations to ensure all tables exist
  await runMigrations()

  // Set app user model id for windows
  electronApp.setAppUserModelId('de.werkstatt-terhaag.yvi')

  // Enable F12 to open DevTools in all modes (not just development)
  app.on('browser-window-created', (_, window) => {
    // Allow F12 and Ctrl+Shift+I to open DevTools
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        window.webContents.toggleDevTools()
        event.preventDefault()
      }
      // Also allow Ctrl+Shift+I
      if (input.control && input.shift && input.key.toLowerCase() === 'i' && input.type === 'keyDown') {
        window.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // ===== AUTO-UPDATER =====
  // Nur in Produktion nach Updates suchen
  if (!is.dev) {
    // Update-Events
    autoUpdater.on('checking-for-update', () => {
      logger.info('Suche nach Updates...')
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('Update verfügbar:', info.version)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info)
      }
    })

    autoUpdater.on('update-not-available', () => {
      logger.info('App ist aktuell')
    })

    autoUpdater.on('download-progress', (progress) => {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('update-progress', progress)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update heruntergeladen:', info.version)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update bereit',
          message: `Version ${info.version} wurde heruntergeladen.`,
          detail: 'Das Update wird beim nächsten Neustart installiert. Möchten Sie jetzt neu starten?',
          buttons: ['Später', 'Jetzt neu starten'],
          defaultId: 1
        }).then((result) => {
          if (result.response === 1) {
            autoUpdater.quitAndInstall()
          }
        })
      }
    })

    autoUpdater.on('error', (error) => {
      logger.error('Auto-Updater Fehler:', error)
    })

    // Nach Updates suchen (nach 3 Sekunden, damit App erst startet)
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 3000)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  logger.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

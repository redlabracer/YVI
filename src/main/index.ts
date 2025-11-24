import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma with a fixed location for the DB in production
const dbPath = is.dev 
  ? 'file:./dev.db' 
  : `file:${join(app.getPath('userData'), 'database.db')}`

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbPath
    }
  }
})

// IPC Handlers
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  })
  return result.filePaths
})

ipcMain.handle('create-customer', async (_, data) => {
  const { firstName, lastName, address, phone, licensePlate, vin, make, model, filePaths } = data
  
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
          model
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
  return await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      documents: true,
      history: {
        orderBy: {
          date: 'desc'
        }
      }
    }
  })
})

ipcMain.handle('add-history-entry', async (_, data) => {
  const { customerId, description, date } = data
  return await prisma.serviceRecord.create({
    data: {
      customerId,
      description,
      date: new Date(date)
    }
  })
})

ipcMain.handle('delete-customer', async (_, id) => {
  // Delete related records first
  await prisma.vehicle.deleteMany({ where: { customerId: id } })
  await prisma.document.deleteMany({ where: { customerId: id } })
  await prisma.serviceRecord.deleteMany({ where: { customerId: id } })
  
  return await prisma.customer.delete({
    where: { id }
  })
})

ipcMain.handle('update-customer', async (_, data) => {
  const { id, firstName, lastName, address, phone, email } = data
  return await prisma.customer.update({
    where: { id },
    data: { firstName, lastName, address, phone, email }
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

// Settings & Lexware Handlers
ipcMain.handle('get-settings', async () => {
  return await prisma.settings.findFirst()
})

ipcMain.handle('save-settings', async (_, data) => {
  const { apiKey } = data
  // Check if settings exist, update or create
  const existing = await prisma.settings.findFirst()
  if (existing) {
    return await prisma.settings.update({
      where: { id: existing.id },
      data: { apiKey }
    })
  } else {
    return await prisma.settings.create({
      data: { apiKey, syncEnabled: true }
    })
  }
})

ipcMain.handle('sync-lexware', async () => {
  const settings = await prisma.settings.findFirst()
  if (!settings || !settings.apiKey) {
    throw new Error('Kein API Key gefunden')
  }

  // REAL IMPLEMENTATION
  try {
    // 1. Fetch contacts from Lexware Public API
    // Note: This URL is an example. Lexware API endpoints depend on the specific API version.
    // Usually it's https://api.lexoffice.io/v1/contacts
    const response = await fetch('https://api.lexoffice.io/v1/contacts?page=0&size=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Lexware API Fehler: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // 2. Sync contacts to local DB
    let syncedCount = 0
    let updatedCount = 0
    
    const contacts = data.content || []
    console.log(`Gefundene Kontakte in Lexware: ${contacts.length}`)

    // @ts-ignore
    for (const contact of contacts) {
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
    
    console.log('Starte Rechnungs-Sync...')
    // Fetch invoices (vouchers) using voucherlist endpoint
    const invoiceResponse = await fetch('https://api.lexoffice.io/v1/voucherlist?voucherType=invoice&voucherStatus=open,paid,voided&size=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Accept': 'application/json'
      }
    })

    console.log(`Invoice Response Status: ${invoiceResponse.status} ${invoiceResponse.statusText}`)

    if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json()
        const voucherList = invoiceData.content || []
        console.log(`Gefundene Rechnungen in Lexware: ${voucherList.length}`)
        
        const userDataPath = app.getPath('userData')
        const docsDir = join(userDataPath, 'documents')
        await fs.mkdir(docsDir, { recursive: true })

        for (const voucher of voucherList) {
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
    } else {
        const errorText = await invoiceResponse.text()
        console.error('Fehler beim Abrufen der Rechnungen:', invoiceResponse.status, errorText)
    }

    return { success: true, message: `Sync fertig! ${syncedCount} Kunden neu, ${updatedCount} aktualisiert. ${syncedInvoices} Rechnungen importiert.` }

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
      webSecurity: false // Allow loading local files
    }
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.kfzwerkstatt')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

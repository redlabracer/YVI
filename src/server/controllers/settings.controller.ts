import { Request, Response } from 'express'
import prisma from '../db'

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {}
      })
    }

    res.json(settings)
  } catch (error) {
    console.error('Error getting settings:', error)
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' })
  }
}

export const saveSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body
    
    // Remove id from data if present to avoid unique constraint errors or invalid updates
    const { id, ...updateData } = data

    const existing = await prisma.settings.findFirst()

    if (existing) {
      const updated = await prisma.settings.update({
        where: { id: existing.id },
        data: updateData
      })
      res.json(updated)
    } else {
      const created = await prisma.settings.create({
        data: updateData
      })
      res.json(created)
    }
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' })
  }
}

// Lexware Sync - Bidirectional sync between local DB and Lexware
export const syncLexware = async (req: Request, res: Response) => {
  console.log('[Server] sync-lexware called')
  
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings || !settings.apiKey) {
      return res.status(400).json({ error: 'Kein Lexware API Key gefunden. Bitte in den Einstellungen hinterlegen.' })
    }

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
    
    // 2. Sync contacts to local DB (Lexware -> Local)
    let syncedCount = 0
    let updatedCount = 0
    
    console.log(`Gefundene Kontakte in Lexware: ${allContacts.length}`)

    for (const contact of allContacts) {
      const email = contact.emailAddresses?.business?.[0] || contact.emailAddresses?.private?.[0] || contact.emailAddresses?.other?.[0] || null
      const phone = contact.phoneNumbers?.business?.[0] || contact.phoneNumbers?.mobile?.[0] || contact.phoneNumbers?.private?.[0] || contact.phoneNumbers?.other?.[0] || null
      
      const street = contact.addresses?.billing?.[0]?.street || contact.addresses?.shipping?.[0]?.street || ''
      const city = contact.addresses?.billing?.[0]?.city || contact.addresses?.shipping?.[0]?.city || ''
      const zip = contact.addresses?.billing?.[0]?.zip || contact.addresses?.shipping?.[0]?.zip || ''
      const fullAddress = street ? `${street}, ${zip} ${city}` : ''

      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            { lexwareId: contact.id },
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
        await prisma.customer.update({
          where: { id: existing.id },
          data: customerData
        })
        updatedCount++
      } else {
        await prisma.customer.create({
          data: customerData
        })
        syncedCount++
      }
    }

    // 3. Export local customers to Lexware (Local -> Lexware)
    let exportedCount = 0
    console.log('Starte Export lokaler Kunden zu Lexware...')
    
    const localOnlyCustomers = await prisma.customer.findMany({
      where: { lexwareId: null }
    })
    
    console.log(`${localOnlyCustomers.length} lokale Kunden ohne Lexware-ID gefunden`)
    
    for (const customer of localOnlyCustomers) {
      if (!customer.lastName || customer.lastName === '(Firma)') {
        continue
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        let street = ''
        let zip = ''
        let city = ''
        
        if (customer.address) {
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
        
        if (customer.email) {
          contactData.emailAddresses = {
            business: [customer.email]
          }
        }
        
        if (customer.phone) {
          contactData.phoneNumbers = {
            mobile: [customer.phone]
          }
        }
        
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

    console.log('Sync-Lexware (Server): Finished successfully')
    res.json({ 
      success: true, 
      message: `Sync fertig! ${syncedCount} Kunden importiert, ${updatedCount} aktualisiert, ${exportedCount} zu Lexware exportiert.` 
    })

  } catch (error: any) {
    console.error('Lexware Sync Error:', error)
    res.status(500).json({ error: `Verbindung fehlgeschlagen: ${error.message}` })
  }
}

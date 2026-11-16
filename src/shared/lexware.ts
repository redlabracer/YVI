// Gemeinsame Lexware-Logik für Desktop-App (IPC) und Server (HTTP).
// Der Renderer importiert hier nur die reinen Text-Helfer für die Vorschau.
import type { PrismaClient } from '@prisma/client'

const LEXWARE_API_BASE = 'https://api.lexware.io/v1'
const LEXWARE_APP_BASE = 'https://app.lexware.de'

// Grenzen laut Lexware-API-Doku
const TITLE_MAX_LENGTH = 25
const LINE_ITEM_DESCRIPTION_MAX_LENGTH = 2000

// Standard-Einleitung des Lexware-Kontos. Sie muss mitgeschickt werden, weil
// Lexware den Kontostandard nur ohne eigenen Einleitungstext verwendet.
const DEFAULT_INTRODUCTION =
  'Unsere Lieferungen/Leistungen stellen wir Ihnen wie folgt in Rechnung.'

const DEFAULT_UNIT_NAME = 'Pauschal'
const DEFAULT_TAX_RATE = 19

/** Fehler mit einer Meldung, die dem Benutzer direkt angezeigt werden kann. */
export class LexwareUserError extends Error {}

// Lexoffice erlaubt nur ~2 Anfragen pro Sekunde. Dieser Helper wiederholt
// Anfragen bei 429 (Too Many Requests) automatisch mit exponentiellem Backoff
// und respektiert den "Retry-After"-Header, falls vorhanden.
export const lexwareFetch = async (
  url: string,
  options: Parameters<typeof fetch>[1],
  maxRetries = 5
): Promise<Response> => {
  let attempt = 0

  while (true) {
    const response = await fetch(url, options)

    if (response.status !== 429 || attempt >= maxRetries) {
      return response
    }

    // Retry-After kann in Sekunden angegeben sein
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0

    // Exponentielles Backoff: 1s, 2s, 4s, 8s, 16s (Minimum aus Retry-After)
    const backoffMs = Math.max(retryAfterMs, 1000 * Math.pow(2, attempt))
    attempt++

    console.warn(
      `Lexware Rate-Limit (429) erreicht. Warte ${backoffMs}ms vor erneutem Versuch (${attempt}/${maxRetries})...`
    )
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
  }
}

/** Baut aus einem lokalen Kunden das Kontakt-Objekt für die Lexware-API. */
export const buildLexwareContact = (customer: {
  firstName?: string | null
  lastName: string
  address?: string | null
  email?: string | null
  phone?: string | null
}) => {
  let street = ''
  let zip = ''
  let city = ''

  if (customer.address) {
    // Adressen sind als "Straße 123, 12345 Stadt" gespeichert
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

  const contact: any = {
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
    contact.addresses = {
      billing: [{ street, zip, city, countryCode: 'DE' }]
    }
  }

  if (customer.email) {
    contact.emailAddresses = { business: [customer.email] }
  }

  if (customer.phone) {
    contact.phoneNumbers = { mobile: [customer.phone] }
  }

  return contact
}

export interface InvoiceVehicleInfo {
  licensePlate?: string | null
  make?: string | null
  model?: string | null
}

const normalizePlate = (licensePlate?: string | null) =>
  (licensePlate || '').trim().replace(/\s+/g, ' ')

/**
 * Der Belegtitel steht auf dem PDF direkt über Rechnungs- und Kundennummer
 * und ist damit der nächstgelegene Platz für das Kennzeichen.
 */
export const buildInvoiceTitle = (licensePlate?: string | null): string => {
  const plate = normalizePlate(licensePlate)
  if (!plate) return 'Rechnung'

  const title = `Rechnung ${plate}`
  return title.length <= TITLE_MAX_LENGTH ? title : plate.slice(0, TITLE_MAX_LENGTH)
}

export const parseMileage = (mileage: unknown): number | null => {
  const value = typeof mileage === 'number' ? mileage : parseInt(String(mileage ?? ''), 10)
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

export const buildInvoiceIntroduction = (
  vehicle: InvoiceVehicleInfo | null | undefined,
  mileage: unknown
): string => {
  const details: string[] = []

  const vehicleName = [vehicle?.make, vehicle?.model]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ')
  if (vehicleName) details.push(`Fahrzeug: ${vehicleName}`)

  const plate = normalizePlate(vehicle?.licensePlate)
  if (plate) details.push(`Kennzeichen: ${plate}`)

  const km = parseMileage(mileage)
  if (km) details.push(`KM-Stand: ${km.toLocaleString('de-DE')} km`)

  return details.length > 0
    ? `${details.join(' · ')}\n\n${DEFAULT_INTRODUCTION}`
    : DEFAULT_INTRODUCTION
}

// Lexware erwartet yyyy-MM-ddTHH:mm:ss.SSSXXX, gemeint ist der lokale Kalendertag.
const toLexwareDate = (date: Date): string => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const pad = (value: number) => String(Math.abs(value)).padStart(2, '0')
  const offset = -day.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const offsetHours = pad(Math.trunc(offset / 60))
  const offsetMinutes = pad(offset % 60)

  return (
    `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}` +
    `T00:00:00.000${sign}${offsetHours}:${offsetMinutes}`
  )
}

const buildLineItems = (workDescription: string) => {
  const lineItems: any[] = []

  if (workDescription) {
    lineItems.push({
      type: 'text',
      name: 'Durchgeführte Arbeiten',
      description: workDescription.slice(0, LINE_ITEM_DESCRIPTION_MAX_LENGTH)
    })
  }

  // Den Preis trägt die Werkstatt anschließend im Entwurf in Lexware ein
  lineItems.push({
    type: 'custom',
    name: 'Arbeitsleistung',
    quantity: 1,
    unitName: DEFAULT_UNIT_NAME,
    unitPrice: { currency: 'EUR', grossAmount: 0, taxRatePercentage: DEFAULT_TAX_RATE }
  })

  return lineItems
}

export const buildInvoicePayload = (input: {
  contactId: string
  serviceDate: Date
  vehicle?: InvoiceVehicleInfo | null
  mileage?: unknown
  workDescription?: string
  now?: Date
}) => ({
  voucherDate: toLexwareDate(input.now ?? new Date()),
  address: { contactId: input.contactId },
  lineItems: buildLineItems((input.workDescription || '').trim()),
  totalPrice: { currency: 'EUR' },
  // Das Lexware-Konto der Werkstatt arbeitet mit Bruttopreisen
  taxConditions: { taxType: 'gross' },
  shippingConditions: {
    shippingType: 'service',
    shippingDate: toLexwareDate(input.serviceDate)
  },
  title: buildInvoiceTitle(input.vehicle?.licensePlate),
  introduction: buildInvoiceIntroduction(input.vehicle, input.mileage)
})

export const getLexwareInvoiceEditUrl = (invoiceId: string) =>
  `${LEXWARE_APP_BASE}/permalink/invoices/edit/${invoiceId}`

const readLexwareError = async (response: Response): Promise<string> => {
  const text = await response.text().catch(() => '')
  try {
    const body = JSON.parse(text)
    if (Array.isArray(body?.IssueList) && body.IssueList.length > 0) {
      return body.IssueList.map((issue: any) =>
        [issue.source, issue.i18nKey || issue.type].filter(Boolean).join(': ')
      ).join('; ')
    }
    return body?.message || text.slice(0, 200)
  } catch {
    return text.slice(0, 200)
  }
}

const lexwareErrorMessage = async (action: string, response: Response): Promise<string> => {
  if (response.status === 401 || response.status === 403) {
    return `${action}: Lexware hat den API-Key abgelehnt. Bitte den Key in den Einstellungen prüfen.`
  }
  return `${action}: Lexware antwortet mit ${response.status}. ${await readLexwareError(response)}`.trim()
}

// Haupt- und Server-Prozess nutzen unterschiedlich konfigurierte Prisma-Clients
type LexwareDb = Pick<PrismaClient, 'settings' | 'customer' | 'serviceRecord' | 'vehicle'>

export interface CreateInvoiceDraftInput {
  customerId: number | string
  vehicleId?: number | string | null
  /** Vorhandener Historien-Eintrag, der mit dem Entwurf verknüpft werden soll */
  serviceRecordId?: number | string | null
  mileage?: number | string | null
  /** Leistungsdatum */
  date?: string | null
  workDescription?: string | null
}

const toId = (value: unknown): number | null => {
  const id = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Legt in Lexware einen Rechnungsentwurf an und verknüpft ihn mit einem
 * Historien-Eintrag. Festschreiben und Versenden bleiben bewusst in Lexware.
 */
export const createLexwareInvoiceDraft = async (
  prisma: LexwareDb,
  input: CreateInvoiceDraftInput
): Promise<{ id: string; editUrl: string; serviceRecordId: number }> => {
  const settings = await prisma.settings.findFirst()
  if (!settings?.apiKey) {
    throw new LexwareUserError(
      'Kein Lexware API-Key gefunden. Bitte in den Einstellungen hinterlegen.'
    )
  }

  const customerId = toId(input.customerId)
  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null
  if (!customer) throw new LexwareUserError('Kunde nicht gefunden.')

  const serviceRecordId = toId(input.serviceRecordId)
  const record = serviceRecordId
    ? await prisma.serviceRecord.findUnique({ where: { id: serviceRecordId } })
    : null
  if (serviceRecordId && record?.customerId !== customer.id) {
    throw new LexwareUserError('Historien-Eintrag nicht gefunden.')
  }
  if (record?.lexwareId) {
    throw new LexwareUserError('Für diesen Eintrag gibt es bereits eine Rechnung in Lexware.')
  }

  const vehicleId = toId(input.vehicleId) ?? record?.vehicleId ?? null
  const vehicle = vehicleId ? await prisma.vehicle.findUnique({ where: { id: vehicleId } }) : null
  if (vehicleId && vehicle?.customerId !== customer.id) {
    throw new LexwareUserError('Fahrzeug nicht gefunden.')
  }

  const mileage = parseMileage(input.mileage)
  const workDescription = (input.workDescription || '').trim()
  const serviceDate = input.date ? new Date(input.date) : (record?.date ?? new Date())
  if (Number.isNaN(serviceDate.getTime())) {
    throw new LexwareUserError('Das Leistungsdatum ist ungültig.')
  }

  const headers = {
    Authorization: `Bearer ${settings.apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }

  // Kunden, die Lexware noch nicht kennt, zuerst als Kontakt anlegen
  let contactId = customer.lexwareId
  if (!contactId) {
    if (!customer.lastName || customer.lastName === '(Firma)') {
      throw new LexwareUserError(
        'Für diesen Kunden fehlt der Nachname, deshalb kann kein Lexware-Kontakt angelegt werden.'
      )
    }

    const contactResponse = await lexwareFetch(`${LEXWARE_API_BASE}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildLexwareContact(customer))
    })
    if (!contactResponse.ok) {
      throw new LexwareUserError(
        await lexwareErrorMessage('Kontakt konnte nicht angelegt werden', contactResponse)
      )
    }

    const contact = await contactResponse.json()
    contactId = contact.id as string
    await prisma.customer.update({ where: { id: customer.id }, data: { lexwareId: contactId } })
  }

  const invoiceResponse = await lexwareFetch(`${LEXWARE_API_BASE}/invoices`, {
    method: 'POST',
    headers,
    body: JSON.stringify(
      buildInvoicePayload({ contactId, serviceDate, vehicle, mileage, workDescription })
    )
  })
  if (!invoiceResponse.ok) {
    throw new LexwareUserError(
      await lexwareErrorMessage('Rechnungsentwurf konnte nicht angelegt werden', invoiceResponse)
    )
  }

  const invoice = await invoiceResponse.json()
  const invoiceId = invoice.id as string

  const savedRecord = record
    ? await prisma.serviceRecord.update({
        where: { id: record.id },
        data: {
          lexwareId: invoiceId,
          vehicleId: record.vehicleId ?? vehicle?.id ?? null,
          mileage: mileage ?? record.mileage
        }
      })
    : await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle?.id ?? null,
          date: serviceDate,
          description: workDescription || 'Rechnungsentwurf',
          mileage,
          lexwareId: invoiceId
        }
      })

  if (vehicle && mileage && mileage > (vehicle.mileage || 0)) {
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { mileage } })
  }

  return {
    id: invoiceId,
    editUrl: getLexwareInvoiceEditUrl(invoiceId),
    serviceRecordId: savedRecord.id
  }
}

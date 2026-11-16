import React, { useState } from 'react'
import { Loader2, Receipt, X } from 'lucide-react'
import { api } from '../api'
import { buildInvoiceIntroduction, buildInvoiceTitle } from '../../../shared/lexware'

interface LexwareInvoiceDialogProps {
  customer: any
  /** Fahrzeug, von dem aus die Rechnung gestartet wurde */
  vehicle?: any
  /** Historien-Eintrag, von dem aus die Rechnung gestartet wurde */
  record?: any
  onClose: () => void
  onCreated: (invoiceId: string) => void
}

const toDateInputValue = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

// IPC und HTTP verpacken die eigentliche Meldung unterschiedlich
const getErrorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error))
    .replace(/^Error invoking remote method '[^']+':\s*(\w*Error:\s*)?/, '')
    .replace(/^API Error:\s*/, '')

const inputClass =
  'w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all'
const labelClass =
  'block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5'

export default function LexwareInvoiceDialog({
  customer,
  vehicle,
  record,
  onClose,
  onCreated
}: LexwareInvoiceDialogProps) {
  const vehicles: any[] = customer.vehicles || []
  const [vehicleId, setVehicleId] = useState(
    String(vehicle?.id ?? record?.vehicleId ?? (vehicles.length === 1 ? vehicles[0].id : ''))
  )
  const selectedVehicle = vehicles.find((v) => String(v.id) === vehicleId) || null

  const [mileage, setMileage] = useState(String(record?.mileage ?? selectedVehicle?.mileage ?? ''))
  const [date, setDate] = useState(toDateInputValue(record ? new Date(record.date) : new Date()))
  const [workDescription, setWorkDescription] = useState<string>(record?.description || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleVehicleChange = (nextId: string) => {
    setVehicleId(nextId)
    if (!record?.mileage) {
      const next = vehicles.find((v) => String(v.id) === nextId)
      setMileage(String(next?.mileage ?? ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    try {
      const result = await api.settings.createLexwareInvoiceDraft({
        customerId: customer.id,
        vehicleId: vehicleId || null,
        serviceRecordId: record?.id ?? null,
        mileage: mileage || null,
        date,
        workDescription
      })
      onCreated(result.id)
    } catch (err) {
      console.error('Error creating Lexware invoice draft:', err)
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rechnung erstellen
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer.firstName} {customer.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Schließen"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="lexware-invoice-vehicle" className={labelClass}>Fahrzeug</label>
            <select
              id="lexware-invoice-vehicle"
              className={inputClass}
              value={vehicleId}
              disabled={!!record?.vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
            >
              <option value="">Kein Fahrzeug</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.licensePlate})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lexware-invoice-mileage" className={labelClass}>KM-Stand</label>
              <input
                id="lexware-invoice-mileage"
                type="number"
                min="0"
                className={inputClass}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lexware-invoice-date" className={labelClass}>Leistungsdatum</label>
              <input
                id="lexware-invoice-date"
                type="date"
                required
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lexware-invoice-work" className={labelClass}>Arbeitsbeschreibung</label>
            <textarea
              id="lexware-invoice-work"
              className={`${inputClass} h-28 resize-none`}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
            <p className={labelClass}>Auf der Rechnung</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {buildInvoiceTitle(selectedVehicle?.licensePlate)}
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {buildInvoiceIntroduction(selectedVehicle, mileage)}
            </p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Es wird nur ein Entwurf angelegt. Preise tragen Sie anschließend in Lexware ein,
            dort wird die Rechnung auch abgeschlossen und versendet.
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Entwurf anlegen
          </button>
        </div>
      </form>
    </div>
  )
}

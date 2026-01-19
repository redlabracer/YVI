import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, FileText, Users, CheckCircle, XCircle, Loader2, 
  ArrowLeft, Play, Trash2, AlertTriangle, Eye, EyeOff
} from 'lucide-react'
import { api } from '../api'

interface FileEntry {
  id: string
  file: File
  name: string
  status: 'pending' | 'analyzing' | 'success' | 'error'
  result?: {
    firstName?: string
    lastName?: string
    address?: string
    licensePlate?: string
    make?: string
    model?: string
    vin?: string
    hsn?: string
    tsn?: string
    firstRegistration?: string
  }
  error?: string
  customerId?: number
}

export default function BulkImport() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showPreview, setShowPreview] = useState(true)
  const [autoCreate, setAutoCreate] = useState(false)
  
  // Stats
  const totalFiles = files.length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const pendingCount = files.filter(f => f.status === 'pending').length

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const newEntries: FileEntry[] = Array.from(selectedFiles).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      name: file.name,
      status: 'pending'
    }))

    setFiles(prev => [...prev, ...newEntries])
    
    // Reset input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleClearAll = () => {
    setFiles([])
  }

  const analyzeFile = async (entry: FileEntry): Promise<FileEntry> => {
    try {
      // Analyze with customer data extraction enabled
      const result = await api.documents.analyze(entry.file, true)
      
      return {
        ...entry,
        status: 'success',
        result: {
          firstName: result.firstName || '',
          lastName: result.lastName || '',
          address: result.address || '',
          licensePlate: result.licensePlate || '',
          make: result.make || '',
          model: result.model || '',
          vin: result.vin || '',
          hsn: result.hsn || '',
          tsn: result.tsn || '',
          firstRegistration: result.firstRegistration || ''
        }
      }
    } catch (err: any) {
      return {
        ...entry,
        status: 'error',
        error: err.message || 'Analyse fehlgeschlagen'
      }
    }
  }

  const createCustomer = async (entry: FileEntry): Promise<number | null> => {
    if (!entry.result || !entry.result.lastName) {
      return null
    }

    try {
      const customer = await api.customers.create({
        firstName: entry.result.firstName || '',
        lastName: entry.result.lastName || 'Unbekannt',
        address: entry.result.address || ''
      })

      // Create vehicle if we have data
      if (entry.result.licensePlate || entry.result.make) {
        await api.vehicles.create({
          customerId: customer.id,
          licensePlate: entry.result.licensePlate || '',
          make: entry.result.make || '',
          model: entry.result.model || '',
          vin: entry.result.vin || '',
          hsn: entry.result.hsn || '',
          tsn: entry.result.tsn || '',
          firstRegistration: entry.result.firstRegistration || ''
        })
      }

      return customer.id
    } catch (err) {
      console.error('Error creating customer:', err)
      return null
    }
  }

  const handleStartAnalysis = async () => {
    if (isProcessing || pendingCount === 0) return
    
    setIsProcessing(true)
    
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const entry = pendingFiles[i]
      setCurrentIndex(files.findIndex(f => f.id === entry.id))
      
      // Update status to analyzing
      setFiles(prev => prev.map(f => 
        f.id === entry.id ? { ...f, status: 'analyzing' } : f
      ))

      // Analyze the file
      const analyzedEntry = await analyzeFile(entry)
      
      // If auto-create is enabled and analysis was successful, create customer
      if (autoCreate && analyzedEntry.status === 'success') {
        const customerId = await createCustomer(analyzedEntry)
        analyzedEntry.customerId = customerId || undefined
      }

      // Update with result
      setFiles(prev => prev.map(f => 
        f.id === entry.id ? analyzedEntry : f
      ))

      // Small delay between files to not overwhelm the API
      if (i < pendingFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setIsProcessing(false)
    setCurrentIndex(-1)
  }

  const handleCreateAllCustomers = async () => {
    const successfulEntries = files.filter(f => f.status === 'success' && !f.customerId)
    
    if (successfulEntries.length === 0) {
      alert('Keine analysierten Dokumente zum Erstellen verfügbar.')
      return
    }

    setIsProcessing(true)

    for (const entry of successfulEntries) {
      const customerId = await createCustomer(entry)
      if (customerId) {
        setFiles(prev => prev.map(f => 
          f.id === entry.id ? { ...f, customerId } : f
        ))
      }
    }

    setIsProcessing(false)
  }

  const createdCount = files.filter(f => f.customerId).length

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8" />
            Massen-Import
          </h1>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {totalFiles} Dateien
          </span>
          {successCount > 0 && (
            <span className="text-green-600 dark:text-green-400">
              • {successCount} analysiert
            </span>
          )}
          {createdCount > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              • {createdCount} erstellt
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              • {errorCount} Fehler
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* File Upload */}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Dateien auswählen
            </button>
            
            {files.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Alle entfernen
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreate}
                onChange={(e) => setAutoCreate(e.target.checked)}
                disabled={isProcessing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Kunden automatisch erstellen
            </label>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Details ausblenden' : 'Details anzeigen'}
            </button>

            <button
              onClick={handleStartAnalysis}
              disabled={isProcessing || pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysiere... ({currentIndex + 1}/{files.length})
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Analyse starten ({pendingCount})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((totalFiles - pendingCount) / totalFiles) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col min-h-0">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
            <FileText className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Keine Dateien ausgewählt</p>
            <p className="text-sm mt-1">Laden Sie Fahrzeugscheine hoch, um Kunden automatisch zu erstellen</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {files.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`p-4 ${currentIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {entry.status === 'pending' && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-xs text-gray-500">{index + 1}</span>
                        </div>
                      )}
                      {entry.status === 'analyzing' && (
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      )}
                      {entry.status === 'success' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {entry.status === 'error' && (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {entry.name}
                        </span>
                        {entry.customerId && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                            Kunde #{entry.customerId}
                          </span>
                        )}
                      </div>

                      {/* Error Message */}
                      {entry.status === 'error' && entry.error && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          {entry.error}
                        </div>
                      )}

                      {/* Result Preview */}
                      {showPreview && entry.status === 'success' && entry.result && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Name</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {entry.result.firstName} {entry.result.lastName || '—'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Kennzeichen</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {entry.result.licensePlate || '—'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Fahrzeug</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {entry.result.make} {entry.result.model || '—'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">FIN</span>
                            <p className="font-medium text-gray-900 dark:text-white font-mono text-xs">
                              {entry.result.vin || '—'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {entry.status === 'pending' && !isProcessing && (
                      <button
                        onClick={() => handleRemoveFile(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {entry.status === 'success' && entry.customerId && (
                      <button
                        onClick={() => navigate(`/customer/${entry.customerId}`)}
                        className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        Öffnen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {successCount > 0 && !autoCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{successCount - createdCount}</strong> analysierte Dokumente bereit zum Erstellen
          </div>
          <button
            onClick={handleCreateAllCustomers}
            disabled={isProcessing || successCount - createdCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className="w-4 h-4" />
            Alle Kunden erstellen ({successCount - createdCount})
          </button>
        </div>
      )}
    </div>
  )
}

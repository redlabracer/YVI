import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, FileText, Users, CheckCircle, XCircle, Loader2, 
  ArrowLeft, Play, Trash2, AlertTriangle, Eye, EyeOff, StopCircle, Key,
  UserPlus, Car, SkipForward
} from 'lucide-react'
import { api } from '../api'

// Storage key for persisting import state
const STORAGE_KEY = 'bulk-import-state'

interface FileEntry {
  id: string
  file?: File // Optional because we can't serialize File objects
  filePath?: string // Electron file path
  fileData?: string // Base64 encoded file data for persistence
  name: string
  status: 'pending' | 'analyzing' | 'success' | 'error' | 'duplicate'
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
  duplicateInfo?: {
    matches: any[]
  }
}

interface PersistedState {
  files: Omit<FileEntry, 'file'>[]
  autoCreate: boolean
  showPreview: boolean
}

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Helper to convert base64 to File
const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export default function BulkImport() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showPreview, setShowPreview] = useState(true)
  const [autoCreate, setAutoCreate] = useState(false)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  
  // Duplicate handling state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [currentDuplicateEntry, setCurrentDuplicateEntry] = useState<FileEntry | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([])
  const [duplicateResolveCallback, setDuplicateResolveCallback] = useState<((action: 'create' | 'skip' | 'add-vehicle', customerId?: number) => void) | null>(null)
  
  // @ts-ignore - Prüfe ob wir im Electron-Modus sind (und nicht Remote-Modus benutzen)
  const useRemote = localStorage.getItem('useRemote') === 'true'
  // @ts-ignore
  const isElectron = window.electron && typeof window.electron === 'object' && !useRemote

  // Load persisted state on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state: PersistedState = JSON.parse(saved)
        // Restore files (convert base64 back to File objects for pending files)
        const restoredFiles = state.files.map(f => {
          if (f.fileData && f.status === 'pending') {
            return { ...f, file: base64ToFile(f.fileData, f.name) }
          }
          return f
        })
        setFiles(restoredFiles as FileEntry[])
        setAutoCreate(state.autoCreate)
        setShowPreview(state.showPreview)
      } catch (err) {
        console.error('Error restoring bulk import state:', err)
      }
    }
  }, [])

  // Persist state on changes
  useEffect(() => {
    const persistState = async () => {
      // Convert File objects to base64 for pending files
      const filesToPersist: Omit<FileEntry, 'file'>[] = await Promise.all(
        files.map(async f => {
          const { file, ...rest } = f
          if (file && f.status === 'pending') {
            const fileData = await fileToBase64(file)
            return { ...rest, fileData }
          }
          return rest
        })
      )
      
      const state: PersistedState = {
        files: filesToPersist,
        autoCreate,
        showPreview
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
    
    persistState()
  }, [files, autoCreate, showPreview])
  
  // Stats
  const totalFiles = files.length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const duplicateCount = files.filter(f => f.status === 'duplicate').length
  const pendingCount = files.filter(f => f.status === 'pending').length
  const analyzedCount = successCount + duplicateCount

  // Separate handler for Electron native file dialog
  const handleElectronFileSelect = async () => {
    try {
      // @ts-ignore
      const filePaths = await window.electron.ipcRenderer.invoke('select-file')
      if (filePaths && filePaths.length > 0) {
        const newEntries: FileEntry[] = filePaths.map((filePath: string, i: number) => {
          const name = filePath.split('\\').pop() || filePath.split('/').pop() || 'file'
          return {
            id: `${Date.now()}-${i}`,
            filePath,
            name,
            status: 'pending' as const
          }
        })
        setFiles(prev => [...prev, ...newEntries])
      }
    } catch (err) {
      console.error('Error selecting files:', err)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // This handler is only for web mode - the HTML file input onChange
    // In Electron mode, we use handleElectronFileSelect directly
    if (isElectron) {
      // Don't process - Electron uses its own dialog via handleElectronFileSelect
      return
    }
    
    // Web mode: use file input
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
    sessionStorage.removeItem(STORAGE_KEY)
  }

  const analyzeFile = async (entry: FileEntry): Promise<FileEntry> => {
    try {
      // Check if file exists (File object for web, filePath for Electron)
      if (!entry.file && !entry.filePath) {
        return {
          ...entry,
          status: 'error',
          error: 'Datei nicht mehr verfügbar. Bitte erneut hochladen.'
        }
      }
      
      // Analyze with customer data extraction enabled
      // For Electron, pass the file path; for web, pass the File object
      const analyzeSource = entry.filePath || entry.file!
      const result = await api.documents.analyze(analyzeSource, true)
      
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

  const createCustomer = async (entry: FileEntry, skipDuplicateCheck: boolean = false): Promise<number | null> => {
    if (!entry.result || !entry.result.lastName) {
      return null
    }

    try {
      // Check for duplicates first (unless skipped)
      if (!skipDuplicateCheck) {
        console.log('Checking for duplicates:', {
          firstName: entry.result.firstName,
          lastName: entry.result.lastName,
          licensePlate: entry.result.licensePlate
        })
        
        const duplicateCheck = await api.customers.checkDuplicate({
          firstName: entry.result.firstName,
          lastName: entry.result.lastName,
          licensePlate: entry.result.licensePlate
        })
        
        console.log('Duplicate check result:', duplicateCheck)
        
        if (duplicateCheck.isDuplicate && duplicateCheck.matches?.length > 0) {
          
          // SMART RESOLVE: Prüfen ob es genau eine Person ist, aber das Auto neu ist
          const newPlate = entry.result.licensePlate?.replace(/\s/g, '').toUpperCase();
          const nameMatches = duplicateCheck.matches.filter((m: any) => m.matchReason === 'Name' || m.matchReason === 'E-Mail');
          
          if (nameMatches.length === 1) {
             const match = nameMatches[0];
             const existingVehicles = match.vehicles || [];
             // Check if license plate exists in that customer's vehicles
             const carExists = existingVehicles.some((v: string) => v.replace(/\s/g, '').toUpperCase() === newPlate);
             
             if (!carExists) {
               console.log('Smart Resolve: Bekannte Person, neues Auto -> Füge Fahrzeug hinzu', match.id);
               // Auto-Add Vehicle
               const vehicleId = await addVehicleToCustomer(entry, match.id);
               return vehicleId ? match.id : null;
             }
          }

          console.log('Ambiguous duplicate found! Showing modal...')
          // Show duplicate modal and wait for user decision
          return new Promise((resolve) => {
            setCurrentDuplicateEntry(entry)
            setDuplicateMatches(duplicateCheck.matches)
            setDuplicateResolveCallback(() => async (action: 'create' | 'skip' | 'add-vehicle', customerId?: number) => {
              setShowDuplicateModal(false)
              setCurrentDuplicateEntry(null)
              setDuplicateMatches([])
              
              if (action === 'skip') {
                resolve(null)
              } else if (action === 'create') {
                // Force create (skip duplicate check)
                const id = await createCustomer(entry, true)
                resolve(id)
              } else if (action === 'add-vehicle' && customerId) {
                // Add vehicle to existing customer
                const vehicleId = await addVehicleToCustomer(entry, customerId)
                resolve(vehicleId ? customerId : null)
              }
            })
            setShowDuplicateModal(true)
          })
        }
      }

      let filePaths: string[] = []
      
      if (isElectron && entry.filePath) {
        // Electron mode: use the original file path directly
        filePaths = [entry.filePath]
      } else if (entry.file) {
        // Web mode: upload the file first
        try {
          const uploadedPath = await api.files.upload(entry.file)
          if (uploadedPath) filePaths = [uploadedPath]
        } catch (uploadErr) {
          console.error('Error uploading file:', uploadErr)
        }
      } else if (entry.fileData) {
        // Reconstruct file from base64 and upload
        try {
          const response = await fetch(entry.fileData)
          const blob = await response.blob()
          const file = new File([blob], entry.name, { type: blob.type })
          const uploadedPath = await api.files.upload(file)
          if (uploadedPath) filePaths = [uploadedPath]
        } catch (uploadErr) {
          console.error('Error uploading persisted file:', uploadErr)
        }
      }

      // Create customer with vehicle data and document
      const customer = await api.customers.create({
        firstName: entry.result.firstName || '',
        lastName: entry.result.lastName || 'Unbekannt',
        address: entry.result.address || '',
        // Vehicle data
        licensePlate: entry.result.licensePlate || '',
        make: entry.result.make || '',
        model: entry.result.model || '',
        vin: entry.result.vin || '',
        hsn: entry.result.hsn || '',
        tsn: entry.result.tsn || '',
        firstRegistration: entry.result.firstRegistration || '',
        // Document (Fahrzeugschein)
        filePaths: filePaths
      })

      return customer.id
    } catch (err) {
      console.error('Error creating customer:', err)
      return null
    }
  }

  // Add vehicle to existing customer
  const addVehicleToCustomer = async (entry: FileEntry, customerId: number): Promise<number | null> => {
    if (!entry.result) return null
    
    try {
      const vehicle = await api.vehicles.create({
        customerId,
        licensePlate: entry.result.licensePlate || '',
        make: entry.result.make || '',
        model: entry.result.model || '',
        vin: entry.result.vin || '',
        hsn: entry.result.hsn || '',
        tsn: entry.result.tsn || '',
        firstRegistration: entry.result.firstRegistration || ''
      })
      return vehicle.id
    } catch (err) {
      console.error('Error adding vehicle to customer:', err)
      return null
    }
  }

  const handleStartAnalysis = async () => {
    if (isProcessing || pendingCount === 0) return
    
    // Reset cancelled state
    setIsCancelled(false)
    setApiKeyMissing(false)
    setIsProcessing(true)
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    // Track analyzed entries in this session for duplicate detection
    const analyzedInSession: FileEntry[] = [...files.filter(f => f.status === 'success' && f.result)]
    
    // Concurrent Processing
    const CONCURRENCY_LIMIT = 5;
    let poolIndex = 0;
    
    const processNext = async () => {
      // Check limits
      if (poolIndex >= pendingFiles.length || abortControllerRef.current?.signal.aborted || isCancelled) {
        return;
      }

      // Claim next item atomically-ish (JS single thread makes 'poolIndex++' safe)
      const currentIndex = poolIndex++;
      const entry = pendingFiles[currentIndex];

      // Update UI (mark as analyzing)
      // Since we run in parallel, we don't want to re-render the whole list 5 times at once.
      // But for feedback it is needed. We trust React tobatch updates slightly.
      setCurrentIndex(files.findIndex(f => f.id === entry.id)); // Just for progress awareness, imperfect in parallel
      
      setFiles(prev => prev.map(f => 
        f.id === entry.id ? { ...f, status: 'analyzing' } : f
      ));

      // Analyze
      let analyzedEntry: FileEntry;
      try {
        analyzedEntry = await analyzeFile(entry);
      } catch(e) {
          analyzedEntry = { ...entry, status: 'error', error: 'System error during analysis' };
      }

      // Check for Abort after slow network request
      if (abortControllerRef.current?.signal.aborted) return;

      // Handle Critical Error (Auth)
      if (analyzedEntry.status === 'error' && 
          (analyzedEntry.error?.toLowerCase().includes('api') || 
           analyzedEntry.error?.toLowerCase().includes('key') ||
           analyzedEntry.error?.toLowerCase().includes('unauthorized') ||
           analyzedEntry.error?.toLowerCase().includes('401'))) {
        
        setApiKeyMissing(true);
        abortControllerRef.current?.abort(); // Stop all other workers
        
        setFiles(prev => prev.map(f => 
          f.id === entry.id ? { ...f, status: 'pending', error: 'Auth Error - Stopped' } : f
        ));
        return;
      }

      // Duplicate Check (Synchronous Block)
      if (analyzedEntry.status === 'success' && analyzedEntry.result) {
        // Fast in-memory check
        const inSessionDuplicate = analyzedInSession.find(f => 
          (f.result?.licensePlate && analyzedEntry.result?.licensePlate && 
           f.result.licensePlate.replace(/\s/g, '').toUpperCase() === analyzedEntry.result?.licensePlate?.replace(/\s/g, '').toUpperCase())
        );
        
        if (inSessionDuplicate) {
          analyzedEntry.status = 'duplicate';
          analyzedEntry.error = `Duplikat von "${inSessionDuplicate.name}" (aus dieser Session)`;
          analyzedEntry.duplicateInfo = { matches: [] };
        } else {
          analyzedInSession.push(analyzedEntry);
        }
      }

      // Auto-Create (Async but safe)
      if (autoCreate && analyzedEntry.status === 'success') {
        const customerId = await createCustomer(analyzedEntry);
        analyzedEntry.customerId = customerId || undefined;
      }

      // Update Result
      setFiles(prev => prev.map(f => 
        f.id === entry.id ? analyzedEntry : f
      ));

      // Continue with next item in queue
      await processNext();
    };

    // Start Workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, pendingFiles.length); i++) {
        workers.push(processNext());
    }

    // Wait for all to finish
    await Promise.all(workers);
    abortControllerRef.current = null
  }

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsCancelled(true)
      
      // Revert any "analyzing" files back to "pending"
      setFiles(prev => prev.map(f => 
        f.status === 'analyzing' ? { ...f, status: 'pending' } : f
      ))
    }
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
          {analyzedCount > 0 && (
            <span className="text-green-600 dark:text-green-400">
              • {analyzedCount} analysiert
            </span>
          )}
          {duplicateCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              • {duplicateCount} Duplikate
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
              onClick={() => isElectron ? handleElectronFileSelect() : fileInputRef.current?.click()}
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

            {isProcessing ? (
              <button
                onClick={handleCancelAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Abbrechen
              </button>
            ) : (
              <button
                onClick={handleStartAnalysis}
                disabled={pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Analyse starten ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* API Key Warning */}
        {apiKeyMissing && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                KI API-Schlüssel fehlt oder ungültig
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Bitte hinterlegen Sie einen gültigen API-Schlüssel (OpenAI oder Google) in den Einstellungen.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
              >
                Zu den Einstellungen →
              </button>
            </div>
          </div>
        )}

        {/* Cancelled Message */}
        {isCancelled && !isProcessing && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Import wurde abgebrochen. {pendingCount} Dateien noch ausstehend - Sie können jederzeit fortfahren.
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Verarbeite: {currentIndex + 1} von {files.length}</span>
              <span>{Math.round(((totalFiles - pendingCount) / totalFiles) * 100)}%</span>
            </div>
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
                      {entry.status === 'duplicate' && (
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
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
                        {entry.status === 'duplicate' && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                            Duplikat
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
                      
                      {/* Duplicate Warning */}
                      {entry.status === 'duplicate' && entry.error && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                          {entry.error}
                        </div>
                      )}

                      {/* Result Preview */}
                      {showPreview && (entry.status === 'success' || entry.status === 'duplicate') && entry.result && (
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

      {/* Duplicate Detection Modal */}
      {showDuplicateModal && currentDuplicateEntry && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mögliches Duplikat erkannt</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentDuplicateEntry.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* New Entry Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Neuer Eintrag:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Name:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-100">{currentDuplicateEntry.result?.firstName} {currentDuplicateEntry.result?.lastName}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Kennzeichen:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-100">{currentDuplicateEntry.result?.licensePlate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Fahrzeug:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-100">{currentDuplicateEntry.result?.make} {currentDuplicateEntry.result?.model}</span>
                  </div>
                </div>
              </div>
              
              {/* Existing Matches */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Gefundene Übereinstimmungen:</h4>
                <div className="space-y-2">
                  {duplicateMatches.map((match) => (
                    <div key={match.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {match.firstName} {match.lastName}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
                              #{match.id}
                            </span>
                            {match.matchReason && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">
                                {match.matchReason}
                              </span>
                            )}
                          </div>
                          {match.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{match.phone}</p>
                          )}
                          {match.vehicles && match.vehicles.length > 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Fahrzeuge: {match.vehicles.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => duplicateResolveCallback?.('add-vehicle', match.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Car size={14} />
                          Fahrzeug hinzufügen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={() => duplicateResolveCallback?.('skip')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <SkipForward size={16} />
                Überspringen
              </button>
              <button
                onClick={() => duplicateResolveCallback?.('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={16} />
                Trotzdem erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

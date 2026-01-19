import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { 
  User, MapPin, Phone, Car, FileText, Upload, Smartphone, 
  X, Save, ArrowLeft, ScanLine, Trash2, Loader2, ExternalLink, AlertTriangle
} from 'lucide-react'
import { api } from '../api'

interface DuplicateMatch {
  id: number
  firstName: string
  lastName: string
  phone?: string
  address?: string
  vehicles?: string[]
  matchReason: string
}

export default function CreateCustomer() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    licensePlate: '',
    make: '',
    model: '',
    vin: '',
    hsn: '',
    tsn: '',
    firstRegistration: '',
    mileage: '',
    fuelType: '',
    transmission: ''
  })
  const [selectedFiles, setSelectedFiles] = useState<{ path: string; file?: File }[]>([])
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [tunnelPassword, setTunnelPassword] = useState('')
  const [extractCustomerData, setExtractCustomerData] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([])
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // @ts-ignore
  const isElectron = window.electron !== undefined

  useEffect(() => {
    // @ts-ignore
    if (isElectron) {
      // @ts-ignore
      const removeListener = window.electron.ipcRenderer.on('mobile-file-uploaded', (_, filePath) => {
        setSelectedFiles(prev => {
          // Prüfe auf Duplikate
          if (prev.some(f => f.path === filePath)) return prev
          return [...prev, { path: filePath }]
        })
      })
      return () => { removeListener() }
    }
    return undefined
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectFiles = async () => {
    if (isElectron) {
      // @ts-ignore
      const files = await window.electron.ipcRenderer.invoke('select-file')
      if (files && files.length > 0) {
        // Append new files and remove duplicates
        setSelectedFiles(prev => {
          const newFiles = files.filter((f: string) => !prev.some(p => p.path === f))
          return [...prev, ...newFiles.map((f: string) => ({ path: f }))]
        })
      }
    } else {
      // Web mode: use file input
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = 'image/*,.pdf'
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          setSelectedFiles(prev => {
            const newFiles = Array.from(files)
              .filter(f => !prev.some(p => p.path === f.name))
              .map(f => ({ path: f.name, file: f }))
            return [...prev, ...newFiles]
          })
        }
      }
      input.click()
    }
  }

  const handleMobileUpload = async () => {
    if (!isElectron) {
        alert("Mobile Upload ist nur am PC verfügbar.")
        return
    }
    try {
      // @ts-ignore
      const { url, publicIp } = await window.electron.ipcRenderer.invoke('start-mobile-upload')
      const qrDataUrl = await QRCode.toDataURL(url)
      setQrCodeUrl(qrDataUrl)
      setTunnelPassword(publicIp || '')
      setShowQrModal(true)
    } catch (err) {
      console.error(err)
      alert('Fehler beim Starten des Mobile-Servers')
    }
  }

  const handleCloseMobileUpload = async () => {
    setShowQrModal(false)
    if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('stop-mobile-upload')
    }
  }

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleAnalyze = async (fileInfo: { path: string; file?: File }) => {
    setAnalyzingFile(fileInfo.path)
    try {
      let result;
      if (isElectron && !fileInfo.file) {
        // @ts-ignore - Electron mode with file path
        result = await window.electron.ipcRenderer.invoke('analyze-registration-doc', { filePath: fileInfo.path, extractCustomerData })
      } else if (fileInfo.file) {
        // Web mode with File object
        result = await api.documents.analyze(fileInfo.file, extractCustomerData)
      } else {
        throw new Error('Keine Datei verfügbar für Analyse')
      }
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          make: result.make || prev.make,
          model: result.model || prev.model,
          licensePlate: result.licensePlate || prev.licensePlate,
          vin: result.vin || prev.vin,
          hsn: result.hsn || prev.hsn,
          tsn: result.tsn || prev.tsn,
          firstRegistration: result.firstRegistration || prev.firstRegistration,
          // Only update customer data if requested and found
          firstName: extractCustomerData && result.firstName ? result.firstName : prev.firstName,
          lastName: extractCustomerData && result.lastName ? result.lastName : prev.lastName,
          address: extractCustomerData && result.address ? result.address : prev.address,
        }))
      }
    } catch (err: any) {
      console.error(err)
      alert('Fehler bei der Analyse: ' + err.message)
    } finally {
      setAnalyzingFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for duplicates first
    if (!showDuplicateModal) {
      setIsCheckingDuplicate(true)
      try {
        const duplicateCheck = await api.customers.checkDuplicate({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          licensePlate: formData.licensePlate
        })
        
        if (duplicateCheck.isDuplicate && duplicateCheck.matches.length > 0) {
          setDuplicateMatches(duplicateCheck.matches)
          setShowDuplicateModal(true)
          setIsCheckingDuplicate(false)
          return
        }
      } catch (err) {
        console.error('Duplicate check failed:', err)
        // Continue with creation if check fails
      }
      setIsCheckingDuplicate(false)
    }
    
    // Close modal and proceed with creation
    setShowDuplicateModal(false)
    
    try {
        // Für Web-Modus: Lade zuerst die Dateien hoch
        let filePaths: string[] = []
        if (isElectron) {
            filePaths = selectedFiles.map(f => f.path)
        } else if (selectedFiles.some(f => f.file)) {
            // Web mode: Dateien müssen erst hochgeladen werden
            const uploadPromises = selectedFiles
              .filter(f => f.file)
              .map(f => api.files.upload(f.file!))
            filePaths = await Promise.all(uploadPromises)
        }
        
        await api.customers.create({
            ...formData,
            // @ts-ignore - The API will filter this or server will ignore it for now
            filePaths
        })
        alert('Kunde angelegt!')
        navigate('/customers') 
    } catch (err) {
        console.error(err)
        alert('Fehler beim Anlegen')
    }
  }

  const handleForceCreate = async () => {
    setShowDuplicateModal(false)
    // Call handleSubmit again but skip duplicate check
    try {
        let filePaths: string[] = []
        if (isElectron) {
            filePaths = selectedFiles.map(f => f.path)
        } else if (selectedFiles.some(f => f.file)) {
            const uploadPromises = selectedFiles
              .filter(f => f.file)
              .map(f => api.files.upload(f.file!))
            filePaths = await Promise.all(uploadPromises)
        }
        
        await api.customers.create({
            ...formData,
            // @ts-ignore
            filePaths
        })
        alert('Kunde angelegt!')
        navigate('/customers') 
    } catch (err) {
        console.error(err)
        alert('Fehler beim Anlegen')
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Mobile Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Neuer Kunde</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm hidden sm:block">Erstellen Sie einen neuen Kunden und fügen Sie ein Fahrzeug hinzu.</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 ml-auto sm:ml-0">
          <button 
            onClick={() => navigate('/')}
            className="px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium text-sm"
          >
            Abbrechen
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isCheckingDuplicate}
            className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50"
          >
            {isCheckingDuplicate ? (
              <><Loader2 size={16} className="animate-spin" /> Prüfe...</>
            ) : (
              <><Save size={16} /> Speichern</>
            )}
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Persönliche Daten</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Vorname</label>
                <input 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nachname</label>
                <input 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                  required 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Anschrift</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Telefon / Mobil</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <Car size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fahrzeugdaten</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kennzeichen</label>
                <input 
                  name="licensePlate" 
                  value={formData.licensePlate} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-mono uppercase" 
                  required 
                  placeholder="M-XY 1234"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">FIN (Fahrgestellnummer)</label>
                <div className="relative">
                  <input 
                    name="vin" 
                    value={formData.vin} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-mono uppercase pr-10" 
                  />
                  {formData.vin && isElectron && (
                    <button 
                      type="button"
                      onClick={() => {
                        try {
                          // @ts-ignore
                          window.electron.ipcRenderer.send('open-carparts-cat', formData.vin)
                        } catch (err) {
                          console.error('Failed to open Carparts:', err)
                          alert('Carparts-Katalog konnte nicht geöffnet werden')
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Teile suchen (Auto-Login & VIN Suche)"
                    >
                      <ExternalLink size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Marke</label>
                <input 
                  name="make" 
                  value={formData.make} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Modell</label>
                <input 
                  name="model" 
                  value={formData.model} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">HSN (4-stellig)</label>
                <input 
                  name="hsn" 
                  value={formData.hsn} 
                  onChange={handleChange} 
                  maxLength={4}
                  placeholder="0000"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">TSN (3-stellig)</label>
                <input 
                  name="tsn" 
                  value={formData.tsn} 
                  onChange={handleChange} 
                  maxLength={3}
                  placeholder="ABC"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Erstzulassung</label>
                <input 
                  name="firstRegistration" 
                  type="date" 
                  value={formData.firstRegistration} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KM-Stand</label>
                <input 
                  name="mileage" 
                  type="number" 
                  value={formData.mileage} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kraftstoff</label>
                <select 
                  name="fuelType" 
                  value={formData.fuelType} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                >
                  <option value="">-- Wählen --</option>
                  <option value="Benzin">Benzin</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elektro">Elektro</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="LPG/CNG">LPG/CNG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Getriebe</label>
                <select 
                  name="transmission" 
                  value={formData.transmission} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                >
                  <option value="">-- Wählen --</option>
                  <option value="Manuell">Manuell</option>
                  <option value="Automatik">Automatik</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Documents & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                <FileText size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Dokumente & Scan</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <input 
                  type="checkbox" 
                  id="extractCustomerData" 
                  checked={extractCustomerData} 
                  onChange={(e) => setExtractCustomerData(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="extractCustomerData" className="text-sm font-medium text-blue-900 dark:text-blue-300 cursor-pointer select-none">
                  Auch Kundendaten auslesen
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  type="button" 
                  onClick={handleSelectFiles} 
                  className="w-full py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Dateien auswählen
                </button>
                <button 
                  type="button" 
                  onClick={handleMobileUpload} 
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <Smartphone size={18} />
                  Vom Handy scannen
                </button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Ausgewählte Dateien</h3>
                  <div className="space-y-2">
                    {selectedFiles.map((fileInfo, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]" title={fileInfo.path}>
                            {fileInfo.path.split(/[\\/]/).pop()}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFile(index)}
                            disabled={!!analyzingFile}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleAnalyze(fileInfo)}
                          disabled={!!analyzingFile}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                            analyzingFile === fileInfo.path 
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                        >
                          {analyzingFile === fileInfo.path ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Analysiere...
                            </>
                          ) : (
                            <>
                              <ScanLine size={12} />
                              KI-Analyse starten
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {showQrModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center transform transition-all border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mit Handy scannen</h3>
              <button onClick={handleCloseMobileUpload} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Scannen Sie diesen QR-Code mit Ihrer Handy-Kamera, um ein Foto direkt hochzuladen.
            </p>
            
            <div className="flex justify-center mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-inner">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>

            {tunnelPassword && (
              <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30 text-left">
                <p className="text-xs text-yellow-700 dark:text-yellow-500 font-bold mb-1 uppercase tracking-wider">
                  Falls nach Passwort gefragt:
                </p>
                <p className="text-lg font-mono select-all bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 border border-yellow-200 dark:border-yellow-900/50 text-center font-bold text-gray-800 dark:text-gray-200">
                  {tunnelPassword}
                </p>
              </div>
            )}

            <button 
              onClick={handleCloseMobileUpload}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mögliches Duplikat</h3>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Es wurden ähnliche Kunden in der Datenbank gefunden. Möchten Sie diesen Kunden trotzdem erstellen?
              </p>

              <div className="space-y-3 mb-6 max-h-60 overflow-auto">
                {duplicateMatches.map((match) => (
                  <div 
                    key={match.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {match.firstName} {match.lastName}
                        </div>
                        {match.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            📞 {match.phone}
                          </div>
                        )}
                        {match.address && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                            📍 {match.address}
                          </div>
                        )}
                        {match.vehicles && match.vehicles.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            🚗 {match.vehicles.join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                        {match.matchReason}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/customer/${match.id}`)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Zum Kunden →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleForceCreate}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium text-sm"
              >
                Trotzdem erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

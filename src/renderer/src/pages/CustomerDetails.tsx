import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { 
  ArrowLeft, Edit2, Trash2, Save, X, Phone, Mail, MapPin, 
  Car, FileText, History, Plus, Upload, Calendar, DollarSign,
  File, ExternalLink, Package, Wand2, Loader2, Smartphone, 
  Users, ArrowRightLeft, Search
} from 'lucide-react'
import { api } from '../api'

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'vehicles' | 'history' | 'documents'>('vehicles')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Mobile Upload State
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [tunnelPassword, setTunnelPassword] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ path: string; file?: File }[]>([])
  const [activeUploadContext, setActiveUploadContext] = useState<'vehicle' | 'history' | null>(null)
  
  // Merge/Transfer State
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferVehicleId, setTransferVehicleId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  
  // Checking for Electron
  // @ts-ignore
  const isElectron = window.electron !== undefined

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [customer, setCustomer] = useState<any>(null)
  const [newHistoryEntry, setNewHistoryEntry] = useState({ description: '', date: formatDateForInput(new Date()), mileage: '', filePaths: [] as string[], vehicleId: '' })
  const [showHistoryForm, setShowHistoryForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null)
  const [isEditingHistory, setIsEditingHistory] = useState(false)
  const [historyEditData, setHistoryEditData] = useState({ description: '', date: '', mileage: '', filePaths: [] as string[] })
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)
  const [tempVehicleData, setTempVehicleData] = useState({ 
    make: '',
    model: '',
    licensePlate: '',
    vin: '',
    firstRegistration: '',
    hsn: '',
    tsn: '',
    notes: '', 
    mileage: '', 
    fuelType: '', 
    transmission: '' 
  })
  const [templates, setTemplates] = useState<any[]>([])

  const [isAddingVehicle, setIsAddingVehicle] = useState(false)
  const [newVehicleData, setNewVehicleData] = useState({
    make: '',
    model: '',
    licensePlate: '',
    vin: '',
    firstRegistration: '',
    hsn: '',
    tsn: '',
    notes: '',
    mileage: '',
    fuelType: '',
    transmission: ''
  })

  useEffect(() => {
    if (id) loadCustomer(id)
    loadTemplates()

    // @ts-ignore
    if(isElectron) {
      // @ts-ignore
      const removeListener = window.electron.ipcRenderer.on('mobile-file-uploaded', (_, filePath) => {
        if (activeUploadContext === 'vehicle') {
          setUploadedFiles(prev => [...prev, { path: filePath }])
        } else if (activeUploadContext === 'history') {
          setNewHistoryEntry(prev => ({ ...prev, filePaths: [...prev.filePaths, filePath] }))
        }
      })
      return () => { removeListener() }
    }
    return undefined
  }, [id, activeUploadContext])

  const loadCustomer = async (customerId: string) => {
    try {
      // Use unified API
      const data = await api.customers.getOne(parseInt(customerId))
      setCustomer(data)
      setEditForm(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadTemplates = async () => {
    try {
      const data = await api.templates.getAll()
      setTemplates(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveCustomer = async () => {
      try {
          await api.customers.update({
              id: customer.id,
              ...editForm
          })
          setIsEditing(false)
          loadCustomer(customer.id)
      } catch (err) {
          console.error(err);
          alert('Fehler beim Speichern');
      }
  }
  
  const handleDeleteCustomer = async () => {
    if(!confirm('Wirklich löschen?')) return;
    try {
        await api.customers.delete(customer.id)
        navigate('/customers')
    } catch(err) {
        console.error(err)
        alert('Fehler beim Löschen')
    }
  }

  // Search for customers to merge/transfer to
  const handleSearchCustomers = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const results = await api.customers.search(query, customer?.id)
      setSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  // Merge this customer into another (this customer will be deleted)
  const handleMergeCustomers = async () => {
    if (!selectedCustomer || !customer) return
    
    if (!confirm(`Möchten Sie wirklich "${customer.firstName} ${customer.lastName}" mit "${selectedCustomer.firstName} ${selectedCustomer.lastName}" zusammenführen?\n\nAlle Fahrzeuge, Dokumente und Historie werden übertragen. Dieser Kunde wird gelöscht.`)) {
      return
    }
    
    try {
      const result = await api.customers.merge(selectedCustomer.id, customer.id, true)
      alert(result.message)
      navigate(`/customer/${selectedCustomer.id}`)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Fehler beim Zusammenführen')
    }
  }

  // Transfer a vehicle to another customer
  const handleTransferVehicle = async () => {
    if (!selectedCustomer || !transferVehicleId) return
    
    const vehicle = customer?.vehicles?.find((v: any) => v.id === transferVehicleId)
    if (!confirm(`Möchten Sie das Fahrzeug "${vehicle?.licensePlate || vehicle?.make + ' ' + vehicle?.model}" zu "${selectedCustomer.firstName} ${selectedCustomer.lastName}" übertragen?`)) {
      return
    }
    
    try {
      const result = await api.customers.transferVehicle(transferVehicleId, selectedCustomer.id)
      alert(result.message)
      setShowTransferModal(false)
      setTransferVehicleId(null)
      setSelectedCustomer(null)
      setSearchQuery('')
      setSearchResults([])
      loadCustomer(id!)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Fehler beim Übertragen')
    }
  }

  const openTransferModal = (vehicleId: number) => {
    setTransferVehicleId(vehicleId)
    setSelectedCustomer(null)
    setSearchQuery('')
    setSearchResults([])
    setShowTransferModal(true)
  }

  const openMergeModal = () => {
    setSelectedCustomer(null)
    setSearchQuery('')
    setSearchResults([])
    setShowMergeModal(true)
  }

  const startMobileUpload = async (context: 'vehicle' | 'history') => {
    setActiveUploadContext(context)
    if (!isElectron) {
        alert("Mobile Upload ist nur am PC verfügbar")
        return
    }
    
    try {
      // @ts-ignore
      const { url, publicIp } = await window.electron.ipcRenderer.invoke('start-mobile-upload')
      const qrDataUrl = await QRCode.toDataURL(url)
      setQrCodeUrl(qrDataUrl)
      setTunnelPassword(publicIp || '')
      // Ensure state updates are processed before showing modal
      setTimeout(() => setShowQrModal(true), 100)
    } catch (err) {
      console.error(err)
      alert('Fehler beim Starten des Mobile-Servers')
    }
  }


  const handleCloseMobileUpload = async () => {
    setShowQrModal(false)
    setActiveUploadContext(null)
    // @ts-ignore
    if(isElectron) await window.electron.ipcRenderer.invoke('stop-mobile-upload')
  }

  const handleAnalyzeFile = async (fileOrPath: File | string) => {
    setIsAnalyzing(true)
    try {
      let data;
      if (isElectron && typeof fileOrPath === 'string') {
        // @ts-ignore - Electron mode with file path
        data = await window.electron.ipcRenderer.invoke('analyze-registration-doc', { filePath: fileOrPath, extractCustomerData: false })
      } else if (fileOrPath instanceof File) {
        // Web mode with File object
        data = await api.documents.analyze(fileOrPath, false)
      } else {
        throw new Error('Ungültiger Dateityp')
      }
      
      setNewVehicleData(prev => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        licensePlate: data.licensePlate || prev.licensePlate,
        vin: data.vin || prev.vin,
        firstRegistration: data.firstRegistration || prev.firstRegistration,
        hsn: data.hsn || prev.hsn,
        tsn: data.tsn || prev.tsn,
        fuelType: data.fuelType || prev.fuelType,
        transmission: data.transmission || prev.transmission,
      }))
    } catch (err) {
      console.error(err)
      alert('Fehler bei der Analyse: ' + (err as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
        if (isElectron) {
            const path = await api.files.upload(file)
            setUploadedFiles(prev => [...prev, { path }])
        } else {
            // Im Web-Modus: speichere sowohl den Namen als auch das File-Objekt
            setUploadedFiles(prev => [...prev, { path: file.name, file }])
        }
    } catch (error) {
        console.error("Upload failed:", error)
        alert("Upload fehlgeschlagen")
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddVehicle = async () => {
    try {
      await api.vehicles.create({
        customerId: customer.id,
        ...newVehicleData,
        mileage: newVehicleData.mileage ? parseInt(newVehicleData.mileage) : null,
        firstRegistration: newVehicleData.firstRegistration ? new Date(newVehicleData.firstRegistration) : null
      })
      setIsAddingVehicle(false)
      setNewVehicleData({
        make: '',
        model: '',
        licensePlate: '',
        vin: '',
        firstRegistration: '',
        hsn: '',
        tsn: '',
        notes: '',
        mileage: '',
        fuelType: '',
        transmission: ''
      })
      setUploadedFiles([])
      loadCustomer(customer.id.toString())
    } catch (err) {
      console.error(err)
      alert('Fehler beim Hinzufügen des Fahrzeugs')
    }
  }

  const handleCancelAddVehicle = () => {
    setIsAddingVehicle(false)
    setNewVehicleData({
      make: '',
      model: '',
      licensePlate: '',
      vin: '',
      firstRegistration: '',
      hsn: '',
      tsn: '',
      notes: '',
      mileage: '',
      fuelType: '',
      transmission: ''
    })
    setUploadedFiles([])
  }

  const handleSaveVehicle = async (vehicleId: number) => {
    try {
      await api.vehicles.update({
        id: vehicleId,
        ...tempVehicleData,
        mileage: tempVehicleData.mileage ? parseInt(tempVehicleData.mileage) : null,
        firstRegistration: tempVehicleData.firstRegistration ? new Date(tempVehicleData.firstRegistration) : null
      })
      setEditingVehicleId(null)
      loadCustomer(customer.id.toString())
    } catch (err) {
      console.error(err)
      alert('Fehler beim Speichern der Fahrzeugdaten')
    }
  }

  const handleEditToggle = () => {
    if (!isEditing) {
        setEditForm({
            firstName: customer.firstName,
            lastName: customer.lastName,
            address: customer.address || '',
            phone: customer.phone || '',
            email: customer.email || ''
        })
    }
    setIsEditing(!isEditing)
  }

  const getTireStorageLabel = (spot: string | null) => {
    if (!spot) return '-'
    if (customer?.tireStorageSpotData?.label) return customer.tireStorageSpotData.label
    if (spot === '24-19') return 'Halle'
    const [row, col] = spot.split('-').map(Number)
    if (isNaN(row) || isNaN(col)) return spot
    const colLabel = String.fromCharCode(65 + col)
    return `${colLabel}${row + 1}`
  }

  const handleAddDocument = async () => {
      if (isElectron) {
        // @ts-ignore - Electron mode: use file dialog
        const filePaths = await window.electron.ipcRenderer.invoke('select-file')
        if (filePaths && filePaths.length > 0) {
            try {
                // @ts-ignore
                await window.electron.ipcRenderer.invoke('add-customer-documents', {
                    customerId: customer.id,
                    filePaths
                })
                loadCustomer(customer.id.toString())
            } catch (err) {
                console.error(err)
                alert('Fehler beim Hochladen')
            }
        }
      } else {
        // Web mode: use file input
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/*,.pdf'
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            try {
              await api.documents.addToCustomer(customer.id, Array.from(files))
              loadCustomer(customer.id.toString())
            } catch (err) {
              console.error(err)
              alert('Fehler beim Hochladen')
            }
          }
        }
        input.click()
      }
  }

  const handleSelectHistoryFiles = async () => {
      if (isElectron) {
        // @ts-ignore - Electron mode: use file dialog
        const filePaths = await window.electron.ipcRenderer.invoke('select-file')
        if (filePaths && filePaths.length > 0) {
            if (isEditingHistory) {
                setHistoryEditData(prev => ({ ...prev, filePaths: [...prev.filePaths, ...filePaths] }))
            } else {
                setNewHistoryEntry(prev => ({ ...prev, filePaths: [...prev.filePaths, ...filePaths] }))
            }
        }
      } else {
        // Web mode: use file input - files will be uploaded when saving
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/*,.pdf'
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            // Im Web-Modus: Dateien sofort hochladen und Pfade speichern
            try {
              const uploadPromises = Array.from(files).map(f => api.files.upload(f))
              const paths = await Promise.all(uploadPromises)
              if (isEditingHistory) {
                setHistoryEditData(prev => ({ ...prev, filePaths: [...prev.filePaths, ...paths] }))
              } else {
                setNewHistoryEntry(prev => ({ ...prev, filePaths: [...prev.filePaths, ...paths] }))
              }
            } catch (err) {
              console.error('Upload failed:', err)
              alert('Datei-Upload fehlgeschlagen')
            }
          }
        }
        input.click()
      }
  }

  const handleEditHistoryToggle = () => {
      if (!isEditingHistory) {
          setHistoryEditData({
              description: selectedHistoryEntry.description,
              date: formatDateForInput(new Date(selectedHistoryEntry.date)),
              mileage: selectedHistoryEntry.mileage || '',
              filePaths: []
          })
      }
      setIsEditingHistory(!isEditingHistory)
  }

  const handleSaveHistoryEdit = async () => {
      try {
          await api.history.update({
              id: selectedHistoryEntry.id,
              customerId: customer.id,
              description: historyEditData.description,
              date: new Date(historyEditData.date),
              mileage: historyEditData.mileage,
              filePaths: historyEditData.filePaths
          })
          setIsEditingHistory(false)
          setSelectedHistoryEntry(null)
          loadCustomer(customer.id.toString())
      } catch (err) {
          console.error(err)
          alert('Fehler beim Aktualisieren')
      }
  }

  const openFile = async (document: { id: number, path: string, name?: string }) => {
    await api.documents.open(document)
  }

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    try {
        await api.history.create({
            customerId: customer.id,
            vehicleId: newHistoryEntry.vehicleId,
            description: newHistoryEntry.description,
            date: newHistoryEntry.date,
            mileage: newHistoryEntry.mileage,
            filePaths: newHistoryEntry.filePaths
        })
        setShowHistoryForm(false)
        setNewHistoryEntry({ description: '', date: formatDateForInput(new Date()), mileage: '', filePaths: [], vehicleId: '' })
        loadCustomer(customer.id.toString())
    } catch (err) {
        console.error(err)
        alert('Fehler beim Speichern des Eintrags')
    }
  }

  if (!customer) return <div className="p-8 text-center text-gray-500">Laden...</div>

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Kunde bearbeiten' : `${customer.firstName} ${customer.lastName}`}
          </h1>
          {!isEditing && <p className="text-gray-500 dark:text-gray-400 text-sm">Kunden-Nr: #{customer.id}</p>}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/calendar', { state: { customerId: customer.id } })}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Neuer Termin"
          >
            <Calendar size={20} />
          </button>
          {isEditing ? (
            <>
              <button onClick={handleEditToggle} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm">
                Abbrechen
              </button>
              <button onClick={handleSaveCustomer} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2">
                <Save size={16} /> Speichern
              </button>
            </>
          ) : (
            <>
              <button onClick={openMergeModal} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg hover:text-purple-600 dark:hover:text-purple-400 transition-colors" title="Mit anderem Kunden zusammenführen">
                <Users size={20} />
              </button>
              <button onClick={handleEditToggle} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Edit2 size={20} />
              </button>
              <button onClick={handleDeleteCustomer} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg hover:text-red-600 dark:hover:text-red-400 transition-colors">
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {isEditing ? (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vorname</label>
                <input 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  value={editForm.firstName} 
                  onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nachname</label>
                <input 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  value={editForm.lastName} 
                  onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Adresse</label>
                <input 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  value={editForm.address} 
                  onChange={e => setEditForm({...editForm, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Telefon</label>
                  <input 
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input 
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                    value={editForm.email} 
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <MapPin size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Anschrift</div>
                <div className="text-gray-900 dark:text-white font-medium">{customer.address || 'Keine Adresse hinterlegt'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Phone size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Telefon</div>
                <div className="text-gray-900 dark:text-white font-medium">{customer.phone || '-'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email</div>
                <div className="text-gray-900 dark:text-white font-medium">{customer.email || '-'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                <Package size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reifenlager</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {customer.tireStorageSpot ? (
                    <span className="inline-flex items-center gap-1">
                      Platz {getTireStorageLabel(customer.tireStorageSpot)}
                      <button onClick={() => navigate('/tire-storage')} className="text-blue-500 hover:underline text-xs ml-2">
                        (Zum Plan)
                      </button>
                    </span>
                  ) : (
                    <span className="text-gray-400">Kein Platz</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'vehicles' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <Car size={18} />
              Fahrzeuge ({customer.vehicles?.length || 0})
            </div>
            {activeTab === 'vehicles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              Historie ({customer.history?.length || 0})
            </div>
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'documents' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              Dokumente ({customer.documents?.length || 0})
            </div>
            {activeTab === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'vehicles' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsAddingVehicle(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <Plus size={16} /> Fahrzeug hinzufügen
              </button>
            </div>

            {isAddingVehicle && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-5 shadow-md ring-2 ring-blue-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Neues Fahrzeug</h3>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Upload size={14} /> PC Upload
                    </button>
                    <button 
                      onClick={() => startMobileUpload('vehicle')}
                      className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 font-medium border border-blue-200 dark:border-blue-800"
                    >
                      <Smartphone size={14} /> Handy Upload
                    </button>
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {uploadedFiles.map((uploadedFile, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{uploadedFile.path.split(/[\\/]/).pop()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAnalyzeFile(uploadedFile.file || uploadedFile.path)}
                            disabled={isAnalyzing}
                            className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                          >
                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            Analysieren
                          </button>
                          <button 
                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Marke</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.make || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, make: val}))
                          }}
                          placeholder="z.B. Volkswagen"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Modell</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.model || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, model: val}))
                          }}
                          placeholder="z.B. Golf 7"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kennzeichen</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.licensePlate || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, licensePlate: val}))
                          }}
                          placeholder="z.B. M-XY 123"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">FIN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.vin || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, vin: val}))
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Erstzulassung</label>
                        <input 
                          type="date"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.firstRegistration || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, firstRegistration: val}))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">HSN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.hsn || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, hsn: val}))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">TSN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.tsn || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, tsn: val}))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KM-Stand</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.mileage || ''}
                          onChange={e => {
                            const val = e.target.value
                            setNewVehicleData(prev => ({...prev, mileage: val}))
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kraftstoff</label>
                        <select 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.fuelType}
                          onChange={e => setNewVehicleData({...newVehicleData, fuelType: e.target.value})}
                        >
                          <option value="">Kraftstoff</option>
                          <option value="Benzin">Benzin</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Elektro">Elektro</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Getriebe</label>
                        <select 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={newVehicleData.transmission}
                          onChange={e => setNewVehicleData({...newVehicleData, transmission: e.target.value})}
                        >
                          <option value="">Getriebe</option>
                          <option value="Manuell">Manuell</option>
                          <option value="Automatik">Automatik</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notizen</label>
                      <textarea
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white resize-none"
                        rows={3}
                        value={newVehicleData.notes}
                        onChange={(e) => setNewVehicleData({...newVehicleData, notes: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={handleCancelAddVehicle} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium">Abbrechen</button>
                      <button onClick={handleAddVehicle} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-none">Fahrzeug anlegen</button>
                    </div>
                </div>
              </div>
            )}

            {customer.vehicles.map((vehicle: any) => (
              <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-end mb-2">
                  <button 
                    onClick={() => {
                      setActiveTab('history')
                      setNewHistoryEntry(prev => ({ ...prev, vehicleId: vehicle.id }))
                      setShowHistoryForm(true)
                    }}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 font-medium"
                  >
                    <FileText size={14} /> Dokument hinzufügen
                  </button>
                </div>
                {editingVehicleId === vehicle.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Marke</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.make}
                          onChange={e => setTempVehicleData({...tempVehicleData, make: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Modell</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.model}
                          onChange={e => setTempVehicleData({...tempVehicleData, model: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kennzeichen</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.licensePlate}
                          onChange={e => setTempVehicleData({...tempVehicleData, licensePlate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">FIN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.vin}
                          onChange={e => setTempVehicleData({...tempVehicleData, vin: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Erstzulassung</label>
                        <input 
                          type="date"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.firstRegistration}
                          onChange={e => setTempVehicleData({...tempVehicleData, firstRegistration: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">HSN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.hsn}
                          onChange={e => setTempVehicleData({...tempVehicleData, hsn: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">TSN</label>
                        <input 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.tsn}
                          onChange={e => setTempVehicleData({...tempVehicleData, tsn: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KM-Stand</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.mileage}
                          onChange={e => setTempVehicleData({...tempVehicleData, mileage: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kraftstoff</label>
                        <select 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.fuelType}
                          onChange={e => setTempVehicleData({...tempVehicleData, fuelType: e.target.value})}
                        >
                          <option value="">Kraftstoff</option>
                          <option value="Benzin">Benzin</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Elektro">Elektro</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Getriebe</label>
                        <select 
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                          value={tempVehicleData.transmission}
                          onChange={e => setTempVehicleData({...tempVehicleData, transmission: e.target.value})}
                        >
                          <option value="">Getriebe</option>
                          <option value="Manuell">Manuell</option>
                          <option value="Automatik">Automatik</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notizen</label>
                      <textarea
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white resize-none"
                        rows={3}
                        value={tempVehicleData.notes}
                        onChange={(e) => setTempVehicleData({...tempVehicleData, notes: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingVehicleId(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium">Abbrechen</button>
                      <button onClick={() => handleSaveVehicle(vehicle.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-none">Speichern</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{vehicle.make} {vehicle.model}</h3>
                        <div className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-sm font-medium mt-1 border border-gray-200 dark:border-gray-600">
                          {vehicle.licensePlate}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-end gap-2">
                          <span>FIN: {vehicle.vin || '-'}</span>
                          {vehicle.vin && isElectron && (
                            <button 
                              onClick={() => {
                                try {
                                  // @ts-ignore
                                  window.electron.ipcRenderer.send('open-carparts-cat', vehicle.vin)
                                } catch (err) {
                                  console.error('Failed to open Carparts:', err)
                                  alert('Carparts-Katalog konnte nicht geöffnet werden')
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                              title="Teile suchen (Auto-Login & VIN Suche)"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => navigate('/calendar', { state: { customerId: customer.id, vehicleId: vehicle.id } })}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="Termin für dieses Fahrzeug"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">Erstzulassung</span>
                        <span className="font-medium dark:text-gray-200">{vehicle.firstRegistration ? new Date(vehicle.firstRegistration).toLocaleDateString('de-DE') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">HSN (4) / TSN (3)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium dark:text-gray-200">
                            {vehicle.hsn ? vehicle.hsn.toString().padStart(4, '0') : '-'} / {vehicle.tsn ? vehicle.tsn.toString().substring(0, 3) : '-'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">Kraftstoff</span>
                        <span className="font-medium dark:text-gray-200">{vehicle.fuelType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">KM-Stand</span>
                        <span className="font-medium dark:text-gray-200">{vehicle.mileage ? `${vehicle.mileage} km` : '-'}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FileText size={12} /> Notizen & Daten
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingVehicleId(vehicle.id)
                              setTempVehicleData({
                                make: vehicle.make || '',
                                model: vehicle.model || '',
                                licensePlate: vehicle.licensePlate || '',
                                vin: vehicle.vin || '',
                                firstRegistration: vehicle.firstRegistration ? formatDateForInput(new Date(vehicle.firstRegistration)) : '',
                                hsn: vehicle.hsn || '',
                                tsn: vehicle.tsn || '',
                                notes: vehicle.notes || '',
                                mileage: vehicle.mileage ? vehicle.mileage.toString() : '',
                                fuelType: vehicle.fuelType || '',
                                transmission: vehicle.transmission || ''
                              })
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Edit2 size={12} /> Bearbeiten
                          </button>
                          <button 
                            onClick={() => openTransferModal(vehicle.id)}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                          >
                            <ArrowRightLeft size={12} /> Übertragen
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Fahrzeug "${vehicle.make} ${vehicle.model}" wirklich löschen?`)) {
                                try {
                                  await api.vehicles.delete(vehicle.id)
                                  if (id) loadCustomer(id)
                                } catch (err) {
                                  console.error('Error deleting vehicle:', err)
                                  alert('Fehler beim Löschen des Fahrzeugs')
                                }
                              }
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Löschen
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 min-h-[60px]">
                        {vehicle.notes ? vehicle.notes : <span className="text-gray-400 italic">Keine Notizen vorhanden.</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {customer.vehicles.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Car className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                <p className="text-gray-500 dark:text-gray-400">Keine Fahrzeuge hinterlegt</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Service-Einträge</h3>
              <button 
                onClick={() => setShowHistoryForm(!showHistoryForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                {showHistoryForm ? <X size={16} /> : <Plus size={16} />}
                {showHistoryForm ? 'Abbrechen' : 'Neuer Eintrag'}
              </button>
            </div>

            {showHistoryForm && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-blue-100 dark:border-gray-700 ring-4 ring-blue-50/50 dark:ring-gray-700/50">
                <form onSubmit={handleAddHistory} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Datum</label>
                      <input 
                        type="date" 
                        value={newHistoryEntry.date}
                        onChange={(e) => setNewHistoryEntry({...newHistoryEntry, date: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KM-Stand</label>
                      <input 
                        type="number" 
                        value={newHistoryEntry.mileage}
                        onChange={(e) => setNewHistoryEntry({...newHistoryEntry, mileage: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                        placeholder="z.B. 120000"
                      />
                    </div>
                  </div>
                  
                  {templates.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Vorlage</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                        onChange={(e) => {
                          const template = templates.find(t => t.id === parseInt(e.target.value))
                          if (template) {
                            setNewHistoryEntry(prev => ({ ...prev, description: template.description }))
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Vorlage wählen --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Fahrzeug (optional)</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      value={newHistoryEntry.vehicleId}
                      onChange={e => setNewHistoryEntry({...newHistoryEntry, vehicleId: e.target.value})}
                    >
                      <option value="">-- Kein Fahrzeug --</option>
                      {customer.vehicles?.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Beschreibung</label>
                    <textarea 
                      value={newHistoryEntry.description}
                      onChange={(e) => setNewHistoryEntry({...newHistoryEntry, description: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all h-24 resize-none"
                      placeholder="Was wurde gemacht?"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Anhänge</label>
                    <div className="flex gap-2 mb-2">
                      <button 
                        type="button"
                        onClick={handleSelectHistoryFiles}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Upload size={16} /> PC Upload
                      </button>
                      <button 
                        type="button"
                        onClick={() => startMobileUpload('history')}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Smartphone size={16} /> Handy Upload
                      </button>
                    </div>
                    
                    {newHistoryEntry.filePaths.length > 0 && (
                      <div className="space-y-2">
                        {newHistoryEntry.filePaths.map((path, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={16} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {path.split(/[\\/]/).pop()}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewHistoryEntry(prev => ({ ...prev, filePaths: prev.filePaths.filter((_, index) => index !== i) }))}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-lg shadow-blue-200 dark:shadow-none">
                      Eintrag speichern
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
              {customer.history?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry: any) => (
                <div key={entry.id} className="relative">
                  <div className={`absolute -left-[23px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm z-10 ${entry.lexwareId ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  
                  <div 
                    onClick={() => setSelectedHistoryEntry(entry)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(entry.date).toLocaleDateString('de-DE')}
                        </span>
                        {entry.mileage && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
                            {entry.mileage} km
                          </span>
                        )}
                      </div>
                      {entry.cost && (
                        <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg text-sm">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(entry.cost)}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{entry.description}</p>
                    {(entry.documents?.length > 0 || entry.lexwareId) && (
                      <div className="mt-3 flex gap-2">
                        {entry.lexwareId && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">Rechnung vorhanden</span>}
                        {entry.documents?.length > 0 && <span className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">{entry.documents.length} Anhänge</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!customer.history || customer.history.length === 0) && (
                <div className="text-gray-400 italic text-sm">Keine Historie vorhanden.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Dokumenten-Archiv</h3>
              <button 
                onClick={handleAddDocument}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium flex items-center gap-2"
              >
                <Upload size={16} /> Datei hochladen
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {customer.documents?.map((doc: any) => (
                <div 
                  key={doc.id} 
                  onClick={() => openFile(doc)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative border border-gray-100 dark:border-gray-600">
                    {doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={`file://${doc.path}`} alt={doc.name} className="object-cover w-full h-full" />
                    ) : (
                      <File className="text-gray-300 dark:text-gray-500 w-12 h-12" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full block" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(!customer.documents || customer.documents.length === 0) && (
                <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                  <FileText className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                  <p className="text-gray-500 dark:text-gray-400">Keine Dokumente vorhanden</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Upload Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mobil-Upload</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Scannen Sie den QR-Code mit Ihrem Smartphone, um ein Foto hochzuladen.
            </p>
            
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 inline-block mb-6">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>

            {tunnelPassword && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Passwort</div>
                <div className="font-mono text-lg font-bold text-gray-900 dark:text-white tracking-widest">{tunnelPassword}</div>
              </div>
            )}

            <button 
              onClick={handleCloseMobileUpload}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryEntry && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setSelectedHistoryEntry(null); setIsEditingHistory(false); }}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditingHistory ? 'Eintrag bearbeiten' : 'Service-Details'}
                </h3>
                {!isEditingHistory && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(selectedHistoryEntry.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
              {!isEditingHistory && (
                <button onClick={handleEditHistoryToggle} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                  <Edit2 size={18} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isEditingHistory ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Datum</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                        value={historyEditData.date}
                        onChange={e => setHistoryEditData({...historyEditData, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KM-Stand</label>
                      <input 
                        type="number"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                        value={historyEditData.mileage}
                        onChange={e => setHistoryEditData({...historyEditData, mileage: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Beschreibung</label>
                    <textarea 
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all h-32 resize-none"
                      value={historyEditData.description}
                      onChange={e => setHistoryEditData({...historyEditData, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Anhänge hinzufügen</label>
                    <button 
                      type="button"
                      onClick={handleSelectHistoryFiles}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Upload size={16} /> Dateien auswählen
                    </button>
                    {historyEditData.filePaths.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {historyEditData.filePaths.map((path, i) => (
                          <div key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 inline-block mr-2">
                            {path.split(/[\\/]/).pop()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedHistoryEntry.description}
                  </div>
                  
                  <div className="flex gap-4 text-sm">
                    {selectedHistoryEntry.mileage && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Car size={16} />
                        <span>{selectedHistoryEntry.mileage} km</span>
                      </div>
                    )}
                    {selectedHistoryEntry.cost && (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                        <DollarSign size={16} />
                        <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(selectedHistoryEntry.cost)}</span>
                      </div>
                    )}
                  </div>

                  {/* Documents List */}
                  {(() => {
                    const linkedDoc = customer.documents?.find((d: any) => d.lexwareId && d.lexwareId === selectedHistoryEntry.lexwareId);
                    const attachedDocs = selectedHistoryEntry.documents || [];
                    
                    if (linkedDoc || attachedDocs.length > 0) {
                      return (
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Verknüpfte Dokumente</h4>
                          <div className="space-y-2">
                            {linkedDoc && (
                              <button 
                                onClick={() => openFile(linkedDoc)}
                                className="flex items-center gap-3 w-full p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                              >
                                <FileText size={18} />
                                <span className="text-sm font-medium">{linkedDoc.name} (Rechnung)</span>
                              </button>
                            )}
                            {attachedDocs.map((doc: any) => (
                              <button 
                                key={doc.id}
                                onClick={() => openFile(doc)}
                                className="flex items-center gap-3 w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                              >
                                <File size={18} />
                                <span className="text-sm font-medium">{doc.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null;
                  })()}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
              {isEditingHistory ? (
                <>
                  <button 
                    onClick={() => setIsEditingHistory(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={handleSaveHistoryEdit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    Speichern
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedHistoryEntry(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Schließen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merge Customer Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kunden zusammenführen</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Alle Daten werden zum ausgewählten Kunden übertragen
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Achtung:</strong> {customer?.firstName} {customer?.lastName} wird gelöscht und alle Fahrzeuge, Dokumente und Historie werden zum ausgewählten Kunden übertragen.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ziel-Kunde suchen
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name, Kennzeichen, Telefon..."
                    value={searchQuery}
                    onChange={(e) => handleSearchCustomers(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                </div>
              </div>
              
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedCustomer?.id === c.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {c.firstName} {c.lastName}
                      </div>
                      {c.vehicles?.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Fahrzeuge: {c.vehicles.map((v: any) => v.licensePlate || v.make).join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedCustomer && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>Ausgewählt:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMergeModal(false)
                  setSelectedCustomer(null)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleMergeCustomers}
                disabled={!selectedCustomer}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Users size={16} />
                Zusammenführen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Vehicle Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fahrzeug übertragen</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fahrzeug zu einem anderen Kunden verschieben
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {transferVehicleId && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Fahrzeug:</strong> {(() => {
                      const v = customer?.vehicles?.find((v: any) => v.id === transferVehicleId)
                      return v ? `${v.licensePlate || ''} ${v.make || ''} ${v.model || ''}` : ''
                    })()}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neuen Besitzer suchen
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name, Kennzeichen, Telefon..."
                    value={searchQuery}
                    onChange={(e) => handleSearchCustomers(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                </div>
              </div>
              
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedCustomer?.id === c.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {c.firstName} {c.lastName}
                      </div>
                      {c.vehicles?.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Fahrzeuge: {c.vehicles.map((v: any) => v.licensePlate || v.make).join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedCustomer && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>Neuer Besitzer:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false)
                  setTransferVehicleId(null)
                  setSelectedCustomer(null)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleTransferVehicle}
                disabled={!selectedCustomer}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowRightLeft size={16} />
                Übertragen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

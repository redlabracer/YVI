import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getHolidays } from '../utils/holidays'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Trash2 } from 'lucide-react'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<any[]>([])
  const [shopClosures, setShopClosures] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showClosureModal, setShowClosureModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([])
  const [serviceTemplates, setServiceTemplates] = useState<any[]>([])
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeMileage, setCompleteMileage] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    description: '',
    status: 'open',
    customerId: '',
    vehicleId: ''
  })

  const [closureFormData, setClosureFormData] = useState({
    start: '',
    end: '',
    description: ''
  })

  const location = useLocation()

  useEffect(() => {
    if (location.state) {
      const { customerId, vehicleId, appointmentId } = location.state as any
      
      if (appointmentId) {
        // Wait for appointments to load then find and open
        const findAndOpen = async () => {
          // We might need to fetch the specific appointment if it's not in the current month view
          // For now, let's assume we might need to fetch it or it's in the loaded range if we are lucky.
          // Actually, better to fetch it directly to be sure.
          try {
             // @ts-ignore
             const apt = await window.electron.ipcRenderer.invoke('get-appointment', appointmentId)
             if (apt) {
               setCurrentDate(new Date(apt.start)) // Move calendar to that date
               setEditingAppointment(apt)
               setFormData({
                title: apt.title,
                start: formatForDateTimeLocal(new Date(apt.start)),
                end: formatForDateTimeLocal(new Date(apt.end)),
                description: apt.description || '',
                status: apt.status || 'open',
                customerId: apt.customerId ? apt.customerId.toString() : '',
                vehicleId: apt.vehicleId ? apt.vehicleId.toString() : ''
              })
              setShowModal(true)
             }
          } catch (e) {
            console.error("Could not load appointment", e)
          }
        }
        findAndOpen()
      } else if (customerId) {
        const date = new Date()
        date.setHours(9, 0, 0, 0)
        if (date < new Date()) {
           // If 9 AM is passed, set to next hour
           const now = new Date()
           date.setHours(now.getHours() + 1, 0, 0, 0)
        }
        
        const endDate = new Date(date)
        endDate.setHours(date.getHours() + 1)

        setFormData(prev => ({
          ...prev,
          customerId: customerId.toString(),
          vehicleId: vehicleId ? vehicleId.toString() : '',
          start: formatForDateTimeLocal(date),
          end: formatForDateTimeLocal(endDate)
        }))
        setShowModal(true)
      }
      
      // Clear state
      window.history.replaceState({}, '')
    }
  }, [location])

  useEffect(() => {
    loadAppointments()
    loadShopClosures()
    loadCustomers()
    loadServiceTemplates()
  }, [currentDate])

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (formData.customerId) {
        setSelectedCustomerDetails(null) // Reset while fetching
        try {
          // @ts-ignore
          const customer = await window.electron.ipcRenderer.invoke('get-customer', parseInt(formData.customerId))
          setSelectedCustomerDetails(customer)
          if (customer && customer.vehicles) {
            setCustomerVehicles(customer.vehicles)
          } else {
            setCustomerVehicles([])
          }
        } catch (err) {
          console.error(err)
        }
      } else {
        setSelectedCustomerDetails(null)
        setCustomerVehicles([])
      }
    }
    fetchCustomerDetails()
  }, [formData.customerId])

  const loadServiceTemplates = async () => {
    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-service-templates')
      setServiceTemplates(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCustomers = async () => {
    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-customers')
      setCustomers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadAppointments = async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
    
    // Add padding for grid
    start.setDate(start.getDate() - start.getDay() + 1) // Start from Monday
    end.setDate(end.getDate() + (7 - end.getDay())) // End on Sunday

    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-appointments', {
        start: start.toISOString(),
        end: end.toISOString()
      })
      setAppointments(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadShopClosures = async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
    
    start.setDate(start.getDate() - start.getDay() + 1)
    end.setDate(end.getDate() + (7 - end.getDay()))

    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-shop-closures', {
        start: start.toISOString(),
        end: end.toISOString()
      })
      setShopClosures(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('create-shop-closure', closureFormData)
      setShowClosureModal(false)
      loadShopClosures()
    } catch (err) {
      console.error(err)
      alert('Fehler beim Speichern')
    }
  }

  const handleDeleteClosure = async (id: number) => {
    if (confirm('Betriebsurlaub wirklich löschen?')) {
      try {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('delete-shop-closure', id)
        loadShopClosures()
      } catch (err) {
        console.error(err)
        alert('Fehler beim Löschen')
      }
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (date: Date) => {
    // setSelectedDate(date)
    setEditingAppointment(null)
    
    // Format date to YYYY-MM-DD in local time
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const startStr = `${dateStr}T09:00`
    const endStr = `${dateStr}T10:00`
    
    setFormData({
      title: '',
      start: startStr,
      end: endStr,
      description: '',
      status: 'open',
      customerId: '',
      vehicleId: ''
    })
    setShowModal(true)
  }

  const formatForDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleAppointmentClick = (e: React.MouseEvent, apt: any) => {
    e.stopPropagation()
    setEditingAppointment(apt)
    setFormData({
      title: apt.title,
      start: formatForDateTimeLocal(new Date(apt.start)),
      end: formatForDateTimeLocal(new Date(apt.end)),
      description: apt.description || '',
      status: apt.status || 'open',
      customerId: apt.customerId ? apt.customerId.toString() : '',
      vehicleId: apt.vehicleId ? apt.vehicleId.toString() : ''
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingAppointment) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('update-appointment', {
          id: editingAppointment.id,
          ...formData
        })
      } else {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('create-appointment', formData)
      }
      setShowModal(false)
      loadAppointments()
    } catch (err) {
      console.error(err)
      alert('Fehler beim Speichern')
    }
  }

  const handleDelete = async () => {
    if (!editingAppointment) return
    if (confirm('Termin wirklich löschen?')) {
      try {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('delete-appointment', editingAppointment.id)
        setShowModal(false)
        loadAppointments()
      } catch (err) {
        console.error(err)
        alert('Fehler beim Löschen')
      }
    }
  }

  const handleComplete = async () => {
    if (!editingAppointment) return
    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('complete-appointment', {
        appointmentId: editingAppointment.id,
        mileage: completeMileage ? parseInt(completeMileage) : undefined,
        description: formData.description,
        date: new Date().toISOString()
      })
      setShowCompleteModal(false)
      setShowModal(false)
      loadAppointments()
    } catch (err) {
      console.error(err)
      alert('Fehler beim Abschließen')
    }
  }

  // Calendar Grid Logic
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: Date[] = []
    
    // Padding days from prev month
    const startPadding = (firstDay.getDay() + 6) % 7 // Monday based
    for (let i = startPadding; i > 0; i--) {
      days.push(new Date(year, month, 1 - i))
    }
    
    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Padding days for next month
    const remainingCells = 42 - days.length // 6 rows * 7 cols
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }

  const days = getDaysInMonth()
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const holidays = getHolidays(currentDate.getFullYear())

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terminkalender</h1>
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-base font-semibold w-40 text-center text-gray-900 dark:text-white">
              {currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setClosureFormData({
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                description: 'Betriebsurlaub'
              })
              setShowClosureModal(true)
            }}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-medium flex items-center gap-2"
          >
            <CalendarIcon size={16} />
            Urlaub eintragen
          </button>
          <button 
            onClick={() => handleDayClick(new Date())}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-sm shadow-blue-200 dark:shadow-none"
          >
            <Plus size={16} />
            Neuer Termin
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-grow flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold py-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/30">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-grow auto-rows-fr divide-x divide-gray-200 dark:divide-gray-700 divide-y">
          {days.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            const dayAppointments = appointments.filter(apt => 
              new Date(apt.start).toDateString() === date.toDateString()
            )
            
            const holiday = holidays.find(h => 
              h.date.getDate() === date.getDate() && 
              h.date.getMonth() === date.getMonth()
            )

            const closure = shopClosures.find(c => {
              const start = new Date(c.start)
              start.setHours(0,0,0,0)
              const end = new Date(c.end)
              end.setHours(23,59,59,999)
              return date >= start && date <= end
            })

            return (
              <div 
                key={idx}
                onClick={() => handleDayClick(date)}
                className={`
                  min-h-[120px] p-2 cursor-pointer transition-colors relative group
                  ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600'}
                  ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}
                  ${closure ? 'bg-red-50/30 dark:bg-red-900/20' : ''}
                  ${holiday ? 'bg-green-50/30 dark:bg-green-900/20' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold truncate max-w-[70%]">
                    {holiday && <span className="text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">{holiday.name}</span>}
                    {closure && !holiday && <span className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">Geschlossen</span>}
                  </div>
                  <div className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300'}
                  `}>
                    {date.getDate()}
                  </div>
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {dayAppointments.map(apt => (
                    <div 
                      key={apt.id}
                      onClick={(e) => handleAppointmentClick(e, apt)}
                      className="text-xs px-2 py-1 rounded border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-200 dark:hover:border-blue-700 transition-colors cursor-pointer"
                      title={`${new Date(apt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${apt.title}`}
                    >
                      <span className="font-medium mr-1">
                        {new Date(apt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {apt.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingAppointment ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* Tire Storage Spot Display */}
              {formData.title.toLowerCase().includes('reifen') && selectedCustomerDetails?.tireStorageSpotData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 12 2 12"/><path d="M12 12 12 22"/><path d="M12 12 20.66 7"/><path d="M12 12 3.34 7"/></svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Reifenlagerplatz</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {selectedCustomerDetails.tireStorageSpotData.label || selectedCustomerDetails.tireStorageSpotData.id}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Vorlage</label>
                <select 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  onChange={(e) => {
                    const template = serviceTemplates.find(t => t.id === parseInt(e.target.value))
                    if (template) {
                      setFormData(prev => ({
                        ...prev,
                        title: template.title,
                        description: template.description
                      }))
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Vorlage wählen --</option>
                  {serviceTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Titel</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="z.B. Reifenwechsel"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Start</label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
                    value={formData.start}
                    onChange={e => setFormData({...formData, start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Ende</label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
                    value={formData.end}
                    onChange={e => setFormData({...formData, end: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                <select 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="open">Offen</option>
                  <option value="in-progress">In Arbeit</option>
                  <option value="done">Fertig</option>
                  <option value="picked-up">Abgeholt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kunde (optional)</label>
                <select 
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">-- Kein Kunde --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              
              {formData.customerId && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Fahrzeug (optional)</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                    value={formData.vehicleId}
                    onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                  >
                    <option value="">-- Kein Fahrzeug --</option>
                    {customerVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.licensePlate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Beschreibung</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                {editingAppointment ? (
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} /> Löschen
                    </button>
                    {formData.status !== 'done' && (
                      <button 
                        type="button"
                        onClick={() => {
                          setCompleteMileage(selectedCustomerDetails?.vehicles?.find((v: any) => v.id === parseInt(formData.vehicleId))?.mileage?.toString() || '')
                          setShowCompleteModal(true)
                        }}
                        className="px-4 py-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Abschließen
                      </button>
                    )}
                  </div>
                ) : <div></div>}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClosureModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowClosureModal(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Betriebsurlaub eintragen</h2>
              <button onClick={() => setShowClosureModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClosure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Beschreibung</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  value={closureFormData.description}
                  onChange={e => setClosureFormData({...closureFormData, description: e.target.value})}
                  placeholder="z.B. Sommerurlaub"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Von</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
                    value={closureFormData.start}
                    onChange={e => setClosureFormData({...closureFormData, start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Bis</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
                    value={closureFormData.end}
                    onChange={e => setClosureFormData({...closureFormData, end: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Speichern
                </button>
              </div>
            </form>
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Geplante Schließzeiten</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {shopClosures.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{c.description}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {new Date(c.start).toLocaleDateString()} - {new Date(c.end).toLocaleDateString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteClosure(c.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm transform transition-all border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Arbeit abschließen</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Der Termin wird als erledigt markiert und ein Eintrag in der Fahrzeughistorie erstellt.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Aktueller Kilometerstand</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                value={completeMileage}
                onChange={e => setCompleteMileage(e.target.value)}
                placeholder="z.B. 125000"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleComplete}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-lg shadow-green-200 dark:shadow-none"
              >
                Abschließen & Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

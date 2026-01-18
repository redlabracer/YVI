import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TodoList from '../components/TodoList'
import { api } from '../api'
import { 
  Calendar, 
  Clock, 
  User, 
  Car, 
  Plus, 
  Users, 
  Settings, 
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle,
  Briefcase
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [showNewAdmissionDropdown, setShowNewAdmissionDropdown] = useState(false)

  useEffect(() => {
    loadTodayAppointments()
  }, [])

  const loadTodayAppointments = async () => {
    try {
      const data = await api.dashboard.getStats()
      setTodayAppointments(data.recentAppointments || [])
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
    }
  }

  const handleCompleteAppointment = async (id: number) => {
    try {
      await api.appointments.complete({ appointmentId: id, date: new Date().toISOString() })
      setSelectedAppointment(null)
      loadTodayAppointments()
    } catch (err) {
      console.error('Error completing appointment:', err)
    }
  }

  const formatTireSpot = (spot: string) => {
    if (!spot) return '';
    const parts = spot.split('-');
    return parts.length > 1 ? parts[1] : spot;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      case 'in-progress': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      case 'done': return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
      case 'picked-up': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Offen'
      case 'in-progress': return 'In Arbeit'
      case 'done': return 'Fertig'
      case 'picked-up': return 'Abgeholt'
      default: return status
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guten Tag</h1>
          <p className="text-gray-500 dark:text-gray-400">Hier ist der Überblick für heute.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative group h-32">
            <button 
                onClick={() => setShowNewAdmissionDropdown(!showNewAdmissionDropdown)}
                className="w-full h-full bg-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none hover:shadow-xl hover:bg-blue-700 transition-all duration-200 text-left flex flex-col justify-between"
            >
                <div className="bg-blue-500/30 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Neuaufnahme</h2>
                  <p className="text-blue-100 text-sm">Kunde & Fahrzeug erfassen</p>
                </div>
            </button>
            
            {showNewAdmissionDropdown && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-10">
                    <button 
                        onClick={() => navigate('/create-customer')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium flex items-center gap-2"
                    >
                        <User size={16} /> Neukunde
                    </button>
                    <button 
                        onClick={() => navigate('/customers')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                    >
                        <Car size={16} /> Bestandskunde
                    </button>
                </div>
            )}
        </div>

        <button 
            onClick={() => navigate('/customers')}
            className="group bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 text-left flex flex-col justify-between h-32"
        >
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Kundenstamm</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Verwaltung & Historie</p>
            </div>
        </button>

        <button 
            onClick={() => navigate('/lexware')}
            className="group bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 text-left flex flex-col justify-between h-32"
        >
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-gray-600 dark:text-gray-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Lexware</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Buchhaltung & Finanzen</p>
            </div>
        </button>

        <button 
            onClick={() => navigate('/settings')}
            className="group bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 text-left flex flex-col justify-between h-32"
        >
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Einstellungen</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Konfiguration & Optionen</p>
            </div>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-350px)] min-h-[400px]">
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Termine Heute
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium">
                {todayAppointments.length}
              </span>
            </h2>
            <button onClick={() => navigate('/calendar')} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1">
              Zum Kalender <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {todayAppointments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {todayAppointments.map(apt => (
                  <div 
                    key={apt.id} 
                    onClick={() => setSelectedAppointment(apt)}
                    className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                  >
                    {/* Tire Storage Warning */}
                    {apt.customer?.tireStorageSpot && (
                      <div className="absolute top-0 right-0 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Reifen: {formatTireSpot(apt.customer.tireStorageSpot)}
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        <Clock size={16} className="text-blue-500 dark:text-blue-400" />
                        {new Date(apt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} Uhr
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{apt.title}</h3>
                    
                    <div className="space-y-1">
                      {apt.customer && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <User size={14} className="text-gray-400" />
                          {apt.customer.firstName} {apt.customer.lastName}
                        </div>
                      )}
                      {apt.vehicle && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Car size={14} className="text-gray-400" />
                          {apt.vehicle.make} {apt.vehicle.model}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
                  <Calendar size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Keine Termine heute</h3>
                <p className="text-gray-500 dark:text-gray-400">Genießen Sie den ruhigen Tag!</p>
                <button 
                  onClick={() => navigate('/calendar')}
                  className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Termin eintragen
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-full">
          <TodoList />
        </div>
      </div>

      {/* Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Termindetails</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Informationen zum ausgewählten Termin</p>
              </div>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block">Zeitraum</label>
                  <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500 dark:text-blue-400" />
                    {new Date(selectedAppointment.start).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-6">
                    {new Date(selectedAppointment.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedAppointment.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                  <div className="flex items-center h-full pb-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusLabel(selectedAppointment.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tire Storage Spot Display */}
              {selectedAppointment.title.toLowerCase().includes('reifen') && selectedAppointment.customer?.tireStorageSpotData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 12 2 12"/><path d="M12 12 12 22"/><path d="M12 12 20.66 7"/><path d="M12 12 3.34 7"/></svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Reifenlagerplatz</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {formatTireSpot(selectedAppointment.customer.tireStorageSpotData.label || selectedAppointment.customer.tireStorageSpotData.id)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Titel</label>
                <div className="font-medium text-lg text-gray-900 dark:text-white">{selectedAppointment.title}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAppointment.customer && (
                  <div className="border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                      <User size={14} /> Kunde
                    </label>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedAppointment.customer.firstName} {selectedAppointment.customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      {selectedAppointment.customer.phone && <div>{selectedAppointment.customer.phone}</div>}
                      {selectedAppointment.customer.email && <div>{selectedAppointment.customer.email}</div>}
                    </div>
                  </div>
                )}

                {selectedAppointment.vehicle && (
                  <div className="border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                      <Car size={14} /> Fahrzeug
                    </label>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedAppointment.vehicle.make} {selectedAppointment.vehicle.model}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedAppointment.vehicle.licensePlate}
                    </div>
                  </div>
                )}
              </div>

              {selectedAppointment.description && (
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Beschreibung</label>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedAppointment.description}
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                {selectedAppointment.status !== 'done' && selectedAppointment.status !== 'picked-up' ? (
                  <button 
                    onClick={() => handleCompleteAppointment(selectedAppointment.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
                  >
                    <CheckCircle size={16} /> Termin abschließen
                  </button>
                ) : <div></div>}

                <button 
                  onClick={() => navigate('/calendar', { state: { appointmentId: selectedAppointment.id } })}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  Im Kalender öffnen <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

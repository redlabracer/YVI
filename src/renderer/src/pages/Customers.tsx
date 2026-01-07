import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, User, Phone, MapPin, Car, ChevronRight } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
        // @ts-ignore
        const data = await window.electron.ipcRenderer.invoke('get-customers')
        setCustomers(data)
    } catch (err) {
        console.error(err)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kundenstamm</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Verwalten Sie Ihre Kunden und deren Fahrzeuge</p>
        </div>
        <button 
          onClick={() => navigate('/create-customer')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
        >
          <Plus size={18} />
          Neuer Kunde
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Suchen nach Name oder Telefon..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-4">Kunde</th>
                <th className="px-6 py-4">Kontakt</th>
                <th className="px-6 py-4">Anschrift</th>
                <th className="px-6 py-4">Fahrzeuge</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  onClick={() => navigate(`/customer/${customer.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{customer.lastName}, {customer.firstName}</div>
                        <div className="text-gray-400 dark:text-gray-500 text-xs">ID: #{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-gray-600 dark:text-gray-400">
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400 dark:text-gray-500" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400 dark:text-gray-500" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <span>{customer.address}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {customer.vehicles?.map((v: any) => (
                        <span key={v.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-600">
                          <Car size={12} />
                          {v.licensePlate}
                        </span>
                      ))}
                      {(!customer.vehicles || customer.vehicles.length === 0) && (
                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">Keine Fahrzeuge</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors inline-block" size={20} />
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <Search size={24} />
                      </div>
                      <p>Keine Kunden gefunden</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

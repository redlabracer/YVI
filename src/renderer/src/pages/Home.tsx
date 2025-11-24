import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Customer Card */}
        <div 
            onClick={() => navigate('/create-customer')}
            className="bg-blue-600 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-blue-700 transition transform hover:scale-105"
        >
            <h2 className="text-xl font-bold mb-2">+ Neuer Kunde</h2>
            <p className="text-blue-100">Einen neuen Kunden und Fahrzeug anlegen.</p>
        </div>

        {/* Customer List Card */}
        <div 
            onClick={() => navigate('/customers')}
            className="bg-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-50 transition transform hover:scale-105"
        >
            <h2 className="text-xl font-bold mb-2 text-gray-800">Kundenkartei</h2>
            <p className="text-gray-600">Alle Kunden und Fahrzeuge durchsuchen.</p>
        </div>

        {/* Settings Card */}
        <div 
            onClick={() => navigate('/settings')}
            className="bg-gray-800 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition transform hover:scale-105"
        >
            <h2 className="text-xl font-bold mb-2">⚙️ Einstellungen</h2>
            <p className="text-gray-300">Lexware Verbindung & App-Optionen.</p>
        </div>
      </div>
    </div>
  )
}

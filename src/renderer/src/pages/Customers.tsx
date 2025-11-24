import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
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

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Kundenkartei</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Adresse</th>
              <th className="px-4 py-2 text-left">Telefon</th>
              <th className="px-4 py-2 text-left">Fahrzeuge</th>
              <th className="px-4 py-2 text-left">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b">
                <td className="px-4 py-2">{customer.firstName} {customer.lastName}</td>
                <td className="px-4 py-2">{customer.address}</td>
                <td className="px-4 py-2">{customer.phone}</td>
                <td className="px-4 py-2">
                  {customer.vehicles?.map((v: any) => v.licensePlate).join(', ')}
                </td>
                <td className="px-4 py-2">
                  <button 
                    onClick={() => navigate(`/customer/${customer.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

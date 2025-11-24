import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    vin: ''
  })
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectFiles = async () => {
    // @ts-ignore
    const files = await window.electron.ipcRenderer.invoke('select-file')
    if (files) {
      setSelectedFiles(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('create-customer', {
            ...formData,
            filePaths: selectedFiles
        })
        alert('Kunde angelegt!')
        navigate('/')
    } catch (err) {
        console.error(err)
        alert('Fehler beim Anlegen')
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Neuen Kunden anlegen</h2>
        <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-800">
            Abbrechen
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Vorname</label>
            <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border p-2 rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Nachname</label>
            <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border p-2 rounded" required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Adresse</label>
            <input name="address" value={formData.address} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Telefon</label>
            <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        <h3 className="text-xl font-bold mt-6 mb-2">Fahrzeugdaten</h3>
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-medium">Kennzeichen</label>
            <input name="licensePlate" value={formData.licensePlate} onChange={handleChange} className="w-full border p-2 rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium">FIN (Fahrgestellnummer)</label>
            <input name="vin" value={formData.vin} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Marke</label>
            <input name="make" value={formData.make} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Modell</label>
            <input name="model" value={formData.model} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        <h3 className="text-xl font-bold mt-6 mb-2">Dokumente</h3>
        <div className="border p-4 rounded bg-gray-50">
            <button type="button" onClick={handleSelectFiles} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                Dateien auswählen
            </button>
            {selectedFiles.length > 0 && (
                <ul className="mt-2 list-disc list-inside">
                    {selectedFiles.map((file, index) => (
                        <li key={index} className="text-sm text-gray-600 truncate">{file}</li>
                    ))}
                </ul>
            )}
        </div>
        
        <div className="pt-4">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 w-full">
            Kunde speichern
            </button>
        </div>
      </form>
    </div>
  )
}

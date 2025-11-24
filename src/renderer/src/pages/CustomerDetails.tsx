import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any>(null)
  const [newHistoryEntry, setNewHistoryEntry] = useState({ description: '', date: new Date().toISOString().split('T')[0] })
  const [showHistoryForm, setShowHistoryForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    if (id) loadCustomer(id)
  }, [id])

  const loadCustomer = async (customerId: string) => {
    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-customer', parseInt(customerId))
      setCustomer(data)
    } catch (err) {
      console.error(err)
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

  const handleSaveCustomer = async () => {
      try {
          // @ts-ignore
          await window.electron.ipcRenderer.invoke('update-customer', {
              id: customer.id,
              ...editForm
          })
          setIsEditing(false)
          loadCustomer(customer.id.toString())
      } catch (err) {
          console.error(err)
          alert('Fehler beim Speichern')
      }
  }

  const handleDeleteCustomer = async () => {
      if (window.confirm('Sind Sie sicher, dass Sie diesen Kunden und alle zugehörigen Daten löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
          try {
              // @ts-ignore
              await window.electron.ipcRenderer.invoke('delete-customer', customer.id)
              navigate('/')
          } catch (err) {
              console.error(err)
              alert('Fehler beim Löschen')
          }
      }
  }

  const handleAddDocument = async () => {
      // @ts-ignore
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
  }

  const openFile = async (filePath: string) => {
    // @ts-ignore
    await window.electron.ipcRenderer.invoke('open-file', filePath)
  }

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    try {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('add-history-entry', {
            customerId: customer.id,
            description: newHistoryEntry.description,
            date: newHistoryEntry.date
        })
        setShowHistoryForm(false)
        setNewHistoryEntry({ description: '', date: new Date().toISOString().split('T')[0] })
        loadCustomer(customer.id.toString())
    } catch (err) {
        console.error(err)
        alert('Fehler beim Speichern des Eintrags')
    }
  }

  if (!customer) return <div>Laden...</div>

  return (
    <div className="bg-white p-6 rounded shadow">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline">
        &larr; Zurück
      </button>
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
            {isEditing ? (
                <div className="grid gap-2 max-w-md">
                    <div className="flex gap-2">
                        <input 
                            className="border p-1 rounded w-full" 
                            value={editForm.firstName} 
                            onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                            placeholder="Vorname"
                        />
                        <input 
                            className="border p-1 rounded w-full" 
                            value={editForm.lastName} 
                            onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                            placeholder="Nachname"
                        />
                    </div>
                    <input 
                        className="border p-1 rounded w-full" 
                        value={editForm.address} 
                        onChange={e => setEditForm({...editForm, address: e.target.value})}
                        placeholder="Adresse"
                    />
                    <input 
                        className="border p-1 rounded w-full" 
                        value={editForm.phone} 
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        placeholder="Telefon"
                    />
                    <input 
                        className="border p-1 rounded w-full" 
                        value={editForm.email} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        placeholder="Email"
                    />
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-bold">{customer.firstName} {customer.lastName}</h2>
                    <p className="text-gray-600">Kunden-Nr: {customer.id}</p>
                </>
            )}
        </div>
        <div className="text-right space-y-2">
            {!isEditing && (
                <>
                    <p>{customer.address}</p>
                    <p>{customer.phone}</p>
                    <p>{customer.email}</p>
                </>
            )}
            <div className="flex gap-2 justify-end mt-2">
                {isEditing ? (
                    <>
                        <button onClick={handleSaveCustomer} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Speichern</button>
                        <button onClick={handleEditToggle} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Abbrechen</button>
                    </>
                ) : (
                    <>
                        <button onClick={handleEditToggle} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Bearbeiten</button>
                        <button onClick={handleDeleteCustomer} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Löschen</button>
                    </>
                )}
            </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 border-b pb-2">Fahrzeuge</h3>
      <div className="grid gap-4 mb-8">
        {customer.vehicles.map((vehicle: any) => (
            <div key={vehicle.id} className="border p-4 rounded bg-gray-50">
                <div className="flex justify-between font-bold mb-2">
                    <span>{vehicle.make} {vehicle.model}</span>
                    <span>{vehicle.licensePlate}</span>
                </div>
                <div className="text-sm text-gray-600">
                    <p>FIN: {vehicle.vin}</p>
                </div>
            </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-xl font-bold">Dokumente</h3>
        <button 
            onClick={handleAddDocument}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
            + Dokument hinzufügen
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {customer.documents?.map((doc: any) => (
            <div 
                key={doc.id} 
                className="border p-2 rounded hover:bg-gray-50 cursor-pointer flex flex-col items-center group"
                onClick={() => openFile(doc.path)}
                title="Klicken zum Öffnen"
            >
                <div className="w-full h-32 bg-gray-200 mb-2 flex items-center justify-center overflow-hidden rounded relative">
                    {doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={`file://${doc.path}`} alt={doc.name} className="object-cover w-full h-full" />
                    ) : (
                        <span className="text-4xl text-gray-400">📄</span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                </div>
                <span className="text-sm text-center truncate w-full px-2 font-medium text-gray-700">{doc.name}</span>
            </div>
        ))}
        {(!customer.documents || customer.documents.length === 0) && (
            <p className="text-gray-500 col-span-full italic">Keine Dokumente vorhanden.</p>
        )}
      </div>

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-xl font-bold">Historie</h3>
        <button 
            onClick={() => setShowHistoryForm(!showHistoryForm)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
            {showHistoryForm ? 'Abbrechen' : '+ Eintrag hinzufügen'}
        </button>
      </div>

      {showHistoryForm && (
        <form onSubmit={handleAddHistory} className="bg-gray-50 p-4 rounded mb-6 border">
            <div className="grid gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Datum</label>
                    <input 
                        type="date" 
                        value={newHistoryEntry.date}
                        onChange={(e) => setNewHistoryEntry({...newHistoryEntry, date: e.target.value})}
                        className="border p-2 rounded w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Beschreibung (Was wurde gemacht?)</label>
                    <textarea 
                        value={newHistoryEntry.description}
                        onChange={(e) => setNewHistoryEntry({...newHistoryEntry, description: e.target.value})}
                        className="border p-2 rounded w-full h-24"
                        placeholder="z.B. Ölwechsel, Reifenwechsel, Inspektion..."
                        required
                    />
                </div>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full">
                    Speichern
                </button>
            </div>
        </form>
      )}

      <div className="space-y-4">
        {customer.history?.map((entry: any) => (
            <div key={entry.id} className="border-l-4 border-blue-500 bg-white pl-4 py-2">
                <div className="flex justify-between">
                    <p className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString('de-DE')}</p>
                    {entry.cost && (
                        <p className="text-sm font-bold text-gray-700">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(entry.cost)}
                        </p>
                    )}
                </div>
                <p className="text-gray-800 mt-1">{entry.description}</p>
            </div>
        ))}
        {(!customer.history || customer.history.length === 0) && (
            <p className="text-gray-500 italic">Keine Einträge in der Historie.</p>
        )}
      </div>
    </div>
  )
}

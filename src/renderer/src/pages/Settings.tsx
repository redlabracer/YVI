import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    // @ts-ignore
    const settings = await window.electron.ipcRenderer.invoke('get-settings')
    if (settings && settings.apiKey) {
      setApiKey(settings.apiKey)
    }
  }

  const handleSave = async () => {
    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('save-settings', { apiKey })
      setStatus('Gespeichert!')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      console.error(err)
      setStatus('Fehler beim Speichern')
    }
  }

  const handleTestSync = async () => {
    setLoading(true)
    setStatus('Speichere & Verbinde zu Lexware...')
    try {
      // First save the key to ensure backend has latest
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('save-settings', { apiKey })
      
      // Then sync
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke('sync-lexware')
      setStatus(result.message)
    } catch (err) {
      console.error(err)
      setStatus('Verbindung fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow max-w-2xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Einstellungen</h2>
        <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-800">
            Zurück zum Dashboard
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Lexware Office Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
            Geben Sie hier Ihren API-Schlüssel ein, um die Verbindung zu Lexware Office herzustellen.
            Diesen finden Sie in Ihrem Lexware Account unter "Erweiterungen" oder "API".
        </p>
        
        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full border p-2 rounded font-mono"
                placeholder="lexware_api_..."
            />
        </div>

        <div className="flex gap-4">
            <button 
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Speichern
            </button>
            <button 
                onClick={handleTestSync}
                disabled={loading || !apiKey}
                className={`px-4 py-2 rounded border ${loading ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
                {loading ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
            </button>
        </div>

        {status && (
            <div className={`mt-4 p-3 rounded ${status.includes('Fehler') || status.includes('fehlgeschlagen') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {status}
            </div>
        )}
      </div>
    </div>
  )
}

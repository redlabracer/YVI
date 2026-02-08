import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { 
  Moon, Sun, Key, Database, Save, RefreshCw, ShieldCheck, 
  CheckCircle2, AlertCircle, Loader2, BrainCircuit, Cloud
} from 'lucide-react'
import { api } from '../api'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini')
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [googleModel, setGoogleModel] = useState('gemini-2.0-flash')
  const [aiProvider, setAiProvider] = useState('openai')
  const [aiPrompt, setAiPrompt] = useState('')
  const [carPartsUser, setCarPartsUser] = useState('')
  const [carPartsPass, setCarPartsPass] = useState('')
  const [lexwareUser, setLexwareUser] = useState('')
  const [lexwarePass, setLexwarePass] = useState('')
  const [autoSync, setAutoSync] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  const [loading, setLoading] = useState(false)

  // Default AI Prompt
  const defaultAiPrompt = `Analysiere dieses Fahrzeugschein-Dokument (Zulassungsbescheinigung Teil I) und extrahiere die folgenden Informationen.

AUFBAU DES FAHRZEUGSCHEINS (Zulassungsbescheinigung Teil I):
Die Felder sind mit Buchstaben und Nummern gekennzeichnet:

HALTER-INFORMATIONEN (linke obere Ecke):
- Feld C.1.1: Familienname oder Firmenname des Halters
- Feld C.1.2: Vorname(n) des Halters
- Feld C.1.3: Anschrift (Straße, Hausnummer, PLZ, Ort)

FAHRZEUG-IDENTIFIKATION:
- Feld A: Amtliches Kennzeichen (z.B. "B-AB 1234")
- Feld E: Fahrzeug-Identifizierungsnummer (FIN/VIN, 17-stellig, z.B. "WVWZZZ3CZWE123456")
- Feld B: Datum der Erstzulassung (Format: TT.MM.JJJJ)
- Feld I: Datum der Zulassung (aktueller Halter)

FAHRZEUGTYP:
- Feld D.1: Marke/Hersteller (z.B. "VW", "BMW", "Mercedes-Benz")
- Feld D.2: Typ/Variante/Version (Handelsbezeichnung/Modell, z.B. "Golf", "3er", "A-Klasse")
- Feld D.3: Handelsbezeichnung(en)

TECHNISCHE SCHLÜSSELNUMMERN (sehr wichtig für Ersatzteile):
- Feld 2.1: HSN - Herstellerschlüsselnummer (4-stellig, z.B. "0603")
- Feld 2.2: TSN - Typschlüsselnummer (3-stellig, z.B. "ABC")
Die HSN/TSN befinden sich im unteren Bereich, oft in einer Zeile formatiert als "2.1 0603 2.2 ABC"

ZUSÄTZLICHE TECHNISCHE DATEN:
- Feld P.1: Hubraum in cm³
- Feld P.2/P.4: Leistung in kW
- Feld V.9: CO2-Emissionen
- Feld 14/14.1: Farbe

EXTRAHIERE UND GIB ZURÜCK (JSON-Format):
{
  "firstName": "Vorname aus C.1.2",
  "lastName": "Nachname aus C.1.1", 
  "address": "Komplette Adresse aus C.1.3",
  "licensePlate": "Kennzeichen aus Feld A",
  "vin": "FIN aus Feld E (17 Zeichen)",
  "make": "Marke aus D.1",
  "model": "Modell/Typ aus D.2 oder D.3",
  "hsn": "4-stellige HSN aus Feld 2.1",
  "tsn": "3-stellige TSN aus Feld 2.2",
  "firstRegistration": "Datum aus Feld B im Format YYYY-MM-DD"
}

WICHTIG: 
- HSN ist IMMER 4-stellig (z.B. "0603", "1313", "0005")
- TSN ist IMMER 3-stellig (z.B. "BHN", "AAK", "960")
- FIN/VIN ist 17-stellig
- Gib NUR das JSON zurück, keine zusätzlichen Erklärungen`

  // Cloud / Remote Database State
  const [useRemote, setUseRemote] = useState(localStorage.getItem('useRemote') === 'true')
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || '')

  // @ts-ignore
  const isElectron = window.electron !== undefined

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
        const settings = await api.settings.get()
        if (settings) {
          if (settings.apiKey) setApiKey(settings.apiKey)
          if (settings.openaiKey) setOpenaiKey(settings.openaiKey)
          if (settings.openaiModel) setOpenaiModel(settings.openaiModel)
          // @ts-ignore
          if (settings.googleApiKey) setGoogleApiKey(settings.googleApiKey)
          // @ts-ignore
          if (settings.googleModel) setGoogleModel(settings.googleModel)
          // @ts-ignore
          if (settings.aiProvider) setAiProvider(settings.aiProvider)
          
          if (settings.aiPrompt) setAiPrompt(settings.aiPrompt)
          if (settings.carPartsUser) setCarPartsUser(settings.carPartsUser)
          if (settings.carPartsPass) setCarPartsPass(settings.carPartsPass)
          if (settings.lexwareUser) setLexwareUser(settings.lexwareUser)
          if (settings.lexwarePass) setLexwarePass(settings.lexwarePass)
          if (settings.autoSync) setAutoSync(settings.autoSync)
          if (settings.lastSync) setLastSync(new Date(settings.lastSync).toLocaleString())
        }
    } catch(err) {
        console.error(err)
    }
  }

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setStatus({ type, message })
    if (type === 'success') {
      setTimeout(() => setStatus(null), 5000)
    }
  }

  const handleSave = async () => {
    try {
      await api.settings.save({ 
        apiKey, 
        openaiKey, 
        openaiModel,
        googleApiKey,        googleModel,        aiProvider,
        aiPrompt: aiPrompt || defaultAiPrompt,
        carPartsUser, 
        carPartsPass, 
        lexwareUser, 
        lexwarePass, 
        autoSync 
      })
      showStatus('success', 'Einstellungen erfolgreich gespeichert!')
    } catch (err) {
      console.error(err)
      showStatus('error', 'Fehler beim Speichern der Einstellungen')
    }
  }

  const handleSaveRemote = () => {
    localStorage.setItem('useRemote', String(useRemote))
    localStorage.setItem('serverUrl', serverUrl)
    window.location.reload()
  }

  const handleTestSync = async () => {
    if(!isElectron) {
        showStatus('error', 'Sync ist nur am Desktop verfügbar')
        return
    }
    setLoading(true)
    showStatus('info', 'Verbinde zu Lexware...')
    try {
      // First save the key to ensure backend has latest
      await api.settings.save({ apiKey })
      
      // Then sync
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke('sync-lexware')
      showStatus('success', result.message)
    } catch (err) {
      console.error(err)
      showStatus('error', 'Verbindung fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackup = async () => {
    if(!isElectron) {
         showStatus('error', 'Backup Download über Server noch nicht implementiert')
         return
    }
    try {
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke('create-backup')
      if (result.success) {
        showStatus('success', `Backup erstellt: ${result.path}`)
      } else {
        showStatus('error', 'Backup fehlgeschlagen')
      }
    } catch (err) {
      console.error(err)
      showStatus('error', 'Fehler beim Erstellen des Backups')
    }
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Verwalten Sie Ihre App-Konfiguration und Integrationen.</p>
        </div>
        {status && (
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
            status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
            'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
          }`}>
            {status.type === 'success' && <CheckCircle2 size={16} />}
            {status.type === 'error' && <AlertCircle size={16} />}
            {status.type === 'info' && <Loader2 size={16} className="animate-spin" />}
            {status.message}
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Erscheinungsbild</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Passen Sie das Design der Anwendung an.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-300">Dunkler Modus</span>
            <button 
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Cloud / Remote Database */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cloud / Remote Database</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Verbinden Sie sich mit einem Remote-Server statt der lokalen Datenbank.</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="useRemote" 
                  checked={useRemote} 
                  onChange={(e) => setUseRemote(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="useRemote" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Remote-Server verwenden
                </label>
              </div>
            </div>

            {useRemote && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Server URL</label>
                <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-white"
                  placeholder="http://..."
                />
              </div>
            )}

            <div className="pt-2">
              <button 
                onClick={handleSaveRemote}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm flex items-center gap-2 transition-all"
              >
                <Save size={16} />
                Speichern & Neustarten
              </button>
            </div>
          </div>
        </div>

        {/* Lexware Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lexware Office Integration</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Verbinden Sie Ihre Buchhaltung für automatische Synchronisation.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">API Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm text-gray-900 dark:text-white"
                  placeholder="lexware_api_..."
                />
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Diesen finden Sie in Ihrem Lexware Account unter "Erweiterungen" oder "API".
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Lexware E-Mail</label>
                <input 
                  type="text" 
                  value={lexwareUser}
                  onChange={(e) => setLexwareUser(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm text-gray-900 dark:text-white"
                  placeholder="E-Mail Adresse"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Lexware Passwort</label>
                <input 
                  type="password" 
                  value={lexwarePass}
                  onChange={(e) => setLexwarePass(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm text-gray-900 dark:text-white"
                  placeholder="Passwort"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="autoSync" 
                  checked={autoSync} 
                  onChange={async (e) => {
                    const newVal = e.target.checked
                    setAutoSync(newVal)
                    // Save immediately for better UX
                    try {
                      // @ts-ignore
                      await window.electron.ipcRenderer.invoke('save-settings', { autoSync: newVal })
                    } catch (err) {
                      console.error('Failed to save autoSync:', err)
                    }
                  }}
                  className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="autoSync" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Automatisch beim Start synchronisieren
                </label>
              </div>
              {lastSync && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Zuletzt: {lastSync}
                </span>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm flex items-center gap-2 transition-all"
              >
                <Save size={16} />
                Speichern
              </button>
              <button 
                onClick={handleTestSync}
                disabled={loading || !apiKey}
                className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {loading ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
              </button>
            </div>
          </div>
        </div>

        {/* Car Parts Catalog */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Autoteile Katalog & Conrad</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Zugangsdaten für den automatischen Login (Carparts & Conrad).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Benutzername</label>
              <input 
                type="text" 
                value={carPartsUser}
                onChange={(e) => setCarPartsUser(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white"
                placeholder="Benutzername"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Passwort</label>
              <input 
                type="password" 
                value={carPartsPass}
                onChange={(e) => setCarPartsPass(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white"
                placeholder="Passwort"
              />
            </div>
          </div>
          <div className="mt-4">
             <button 
                onClick={handleSave}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm flex items-center gap-2 transition-all"
              >
                <Save size={16} />
                Speichern
              </button>
          </div>
        </div>

        {/* AI Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">KI-Konfiguration</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Wählen Sie den Anbieter für die Fahrzeugschein-Analyse.</p>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* AI Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KI-Anbieter</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAiProvider('openai')}
                  className={`px-4 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    aiProvider === 'openai' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 ring-2 ring-blue-500/20' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="font-bold text-sm">OpenAI (GPT-4o)</span>
                  <span className="text-xs opacity-70">Bewährt & Stabil</span>
                </button>
                <button
                  onClick={() => setAiProvider('google')}
                  className={`px-4 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    aiProvider === 'google' 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 ring-2 ring-blue-500/20' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="font-bold text-sm">Google Gemini</span>
                  <span className="text-xs opacity-70">Multimodal & Schnell</span>
                </button>
              </div>
            </div>

            {aiProvider === 'openai' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">OpenAI API Key</label>
                  <input 
                    type="password" 
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm text-gray-900 dark:text-white"
                    placeholder="sk-..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">KI-Modell</label>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini - Schnell & Günstig (~$0.15/1M Token) ⭐ Empfohlen</option>
                    <option value="gpt-4o">GPT-4o - Beste Qualität (~$2.50/1M Token)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo - Sehr gute Qualität (~$10/1M Token)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo - Am Günstigsten (~$0.50/1M Token)</option>
                  </select>
                </div>
              </div>
            )}

            {aiProvider === 'google' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Google API Key (Gemini)</label>
                  <input 
                    type="password" 
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm text-gray-900 dark:text-white"
                    placeholder="AIza..."
                  />
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Kostenlos im Google AI Studio verfügbar (Rate-Limited).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Gemini Modell</label>
                  <select
                    value={googleModel}
                    onChange={(e) => setGoogleModel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Empfohlen: Schnell & Smart)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Sehr stabil, hohe Qualität)</option>
                    <option value="gemini-1.0-pro">Gemini 1.0 Pro (Ältere Version)</option>
                    <option value="gemini-3.0-pro-preview">Gemini 3.0 Pro (Standard naming)</option>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (Manuell)</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                KI-Prompt (für Dokumentenanalyse)
              </label>
              <textarea
                value={aiPrompt || defaultAiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white font-mono resize-none"
                placeholder="Prompt für die Dokumentenanalyse..."
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Dieser Prompt wird zur Analyse von Fahrzeugscheinen verwendet.
                </p>
                <button
                  type="button"
                  onClick={() => setAiPrompt(defaultAiPrompt)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm flex items-center gap-2 transition-all"
              >
                <Save size={16} />
                Speichern
              </button>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Datensicherung</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Erstellen Sie Backups Ihrer Datenbank und Dokumente.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Manuelles Backup</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Sichert alle Daten in eine ZIP-Datei.</p>
            </div>
            <button 
              onClick={handleBackup}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-none transition-all"
            >
              <ShieldCheck size={16} />
              Backup erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

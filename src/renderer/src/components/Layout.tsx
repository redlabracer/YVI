import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar as CalendarIcon, 
  Settings, 
  Search,
  X,
  Car,
  User,
  Package,
  Menu, // Add Menu icon
  Briefcase,
  Wrench
} from 'lucide-react'
import { api } from '../api'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // State for mobile menu
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    // Auto-Sync on startup
    const runAutoSync = async () => {
      try {
        // Wait a bit for the app to be fully ready
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // @ts-ignore
        const settings = await window.electron.ipcRenderer.invoke('get-settings')
        console.log('Auto-Sync Check:', settings)
        
        if (settings && settings.lastSync) {
          setLastSync(new Date(settings.lastSync).toLocaleString())
        }

        if (settings && settings.autoSync && settings.apiKey) {
          setSyncMessage('Lexware Sync läuft...')
          setIsSyncing(true)
          // @ts-ignore
          const result = await window.electron.ipcRenderer.invoke('sync-lexware')
          console.log('Auto-Sync completed:', result)
          setSyncMessage('Sync abgeschlossen!')
          
          // Refresh last sync time
          // @ts-ignore
          const updatedSettings = await window.electron.ipcRenderer.invoke('get-settings')
          if (updatedSettings && updatedSettings.lastSync) {
            setLastSync(new Date(updatedSettings.lastSync).toLocaleString())
          }

          setTimeout(() => {
            setIsSyncing(false)
            setSyncMessage('')
          }, 5000)
        }
      } catch (err) {
        console.error('Auto-Sync failed:', err)
        setSyncMessage('Sync fehlgeschlagen')
        setTimeout(() => setIsSyncing(false), 5000)
      }
    }
    
    runAutoSync()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        try {
          const results = await api.dashboard.search(searchQuery)
          setSearchResults(results)
          setShowResults(true)
        } catch (err) {
          console.error('Search error:', err)
          setSearchResults([])
        }
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const handleResultClick = (customerId: number) => {
    navigate(`/customer/${customerId}`)
    setShowResults(false)
    setSearchQuery('')
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Kunden', icon: Users },
    { path: '/templates', label: 'Vorlagen', icon: FileText },
    { path: '/calendar', label: 'Kalender', icon: CalendarIcon },
    { path: '/tire-storage', label: 'Reifenlager', icon: Package },
    { path: '/lexware', label: 'Lexware', icon: Briefcase },
    { path: '/conrad', label: 'Conrad', icon: Wrench },
    { path: '/settings', label: 'Einstellungen', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                W
              </div>
              <span className="font-semibold text-lg tracking-tight text-gray-900 dark:text-white">Werkstatt</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          {isSyncing && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium animate-pulse transition-colors ${
              syncMessage.includes('fehlgeschlagen') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 
              syncMessage.includes('abgeschlossen') ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 
              'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                syncMessage.includes('fehlgeschlagen') ? 'bg-red-500' : 
                syncMessage.includes('abgeschlossen') ? 'bg-green-500' : 
                'bg-orange-500'
              }`} />
              {syncMessage}
            </div>
          )}

          {!isSyncing && lastSync && (
            <div className="px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Letzter Sync: {lastSync}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Benutzer</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white truncate">
              {navItems.find(i => i.path === location.pathname)?.label || 'Werkstatt Manager'}
            </h2>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Suche..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowResults(true)}
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowResults(false) }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowResults(false)}></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 dark:ring-white/10 overflow-hidden z-40 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result: any) => (
                        <div 
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result.customerId || result.id)}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start gap-3 transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${result.type === 'customer' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                            {result.type === 'customer' ? <User size={18} /> : <Car size={18} />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {result.primaryText}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {result.secondaryText}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Keine Treffer gefunden
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { 
  Plus, FileText, Edit2, Trash2, X, Save, Search, LayoutTemplate 
} from 'lucide-react'
import { api } from '../api'

export default function ServiceTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState({ id: 0, title: '', description: '' })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const data = await api.templates.getAll()
      setTemplates(data)
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (currentTemplate.id) {
        await api.templates.update(currentTemplate)
      } else {
        await api.templates.create({
          title: currentTemplate.title,
          description: currentTemplate.description
        })
      }
      setIsEditing(false)
      setCurrentTemplate({ id: 0, title: '', description: '' })
      loadTemplates()
    } catch (err) {
      console.error('Error saving template:', err)
      alert('Fehler beim Speichern')
    }
  }

  const handleEdit = (template: any) => {
    setCurrentTemplate(template)
    setIsEditing(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
      try {
        await api.templates.delete(id)
        loadTemplates()
      } catch (err) {
        console.error('Error deleting template:', err)
        alert('Fehler beim Löschen')
      }
    }
  }

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leistungs-Vorlagen</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Verwalten Sie Textbausteine für häufige Arbeiten.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentTemplate({ id: 0, title: '', description: '' })
            setIsEditing(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          Neue Vorlage
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Vorlagen durchsuchen..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => (
          <div key={template.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1" title={template.title}>
                  {template.title}
                </h3>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(template)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-grow bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap line-clamp-4 font-mono">
                {template.description}
              </p>
            </div>
          </div>
        ))}
        
        {filteredTemplates.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <LayoutTemplate size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Keine Vorlagen gefunden</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
              {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Erstellen Sie Ihre erste Vorlage für häufige Arbeiten.'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => {
                  setCurrentTemplate({ id: 0, title: '', description: '' })
                  setIsEditing(true)
                }}
                className="mt-4 text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline"
              >
                Jetzt erstellen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentTemplate.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
              </h2>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Titel
                </label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  value={currentTemplate.title}
                  onChange={e => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                  placeholder="z.B. Ölwechsel klein"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Beschreibung (Textbaustein)
                </label>
                <textarea 
                  required
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all font-mono text-sm"
                  value={currentTemplate.description}
                  onChange={e => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                  placeholder="Detaillierte Beschreibung der Leistung..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 transition-all"
                >
                  <Save size={16} />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

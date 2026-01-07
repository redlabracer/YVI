import { useState, useEffect } from 'react'
import { CheckSquare, Square, Trash2, Plus, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TodoList() {
  const navigate = useNavigate()
  const [todos, setTodos] = useState<any[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [showCustomerSelect, setShowCustomerSelect] = useState(false)

  useEffect(() => {
    loadTodos()
    loadCustomers()
  }, [])

  const loadTodos = async () => {
    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-todos')
      setTodos(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCustomers = async () => {
    try {
      // @ts-ignore
      const data = await window.electron.ipcRenderer.invoke('get-customers')
      setCustomers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('create-todo', {
        title: newTodo,
        customerId: selectedCustomerId ? parseInt(selectedCustomerId) : null
      })
      setNewTodo('')
      setSelectedCustomerId('')
      setShowCustomerSelect(false)
      loadTodos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (todo: any) => {
    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('update-todo', {
        id: todo.id,
        isDone: !todo.isDone
      })
      loadTodos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      // @ts-ignore
      await window.electron.ipcRenderer.invoke('delete-todo', id)
      loadTodos()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} />
        Aufgabenliste
      </h2>

      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
            placeholder="Neue Aufgabe..."
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowCustomerSelect(!showCustomerSelect)}
            className={`p-2 rounded-xl border transition-colors ${selectedCustomerId ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'}`}
            title="Kunde verknüpfen"
          >
            <User size={20} />
          </button>
          <button 
            type="submit"
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {showCustomerSelect && (
          <select
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm mb-2"
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
          >
            <option value="">-- Kein Kunde --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        )}
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {todos.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
            Keine Aufgaben offen
          </div>
        )}
        {todos.map(todo => (
          <div key={todo.id} className="group flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
            <button 
              onClick={() => handleToggle(todo)}
              className={`mt-0.5 ${todo.isDone ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400'}`}
            >
              {todo.isDone ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${todo.isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                {todo.title}
              </div>
              {todo.customer && (
                <button 
                  onClick={() => navigate(`/customer/${todo.customer.id}`)}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <User size={10} />
                  {todo.customer.firstName} {todo.customer.lastName}
                </button>
              )}
            </div>
            <button 
              onClick={() => handleDelete(todo.id)}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

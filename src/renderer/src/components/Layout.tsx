import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">KFZ Werkstatt</h1>
          <div className="space-x-4">
            <Link to="/" className="hover:text-blue-200">Home (Anlegen)</Link>
            <Link to="/customers" className="hover:text-blue-200">Kundenkartei</Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}

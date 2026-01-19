import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Customers from './pages/Customers'
import CustomerDetails from './pages/CustomerDetails'
import CreateCustomer from './pages/CreateCustomer'
import BulkImport from './pages/BulkImport'
import Settings from './pages/Settings'
import ServiceTemplates from './pages/ServiceTemplates'
import Calendar from './pages/Calendar'
import TireStorage from './pages/TireStorage'
import Lexware from './pages/Lexware'
import Conrad from './pages/Conrad'
import { ThemeProvider } from './context/ThemeContext'

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="create-customer" element={<CreateCustomer />} />
            <Route path="bulk-import" element={<BulkImport />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customer/:id" element={<CustomerDetails />} />
            <Route path="settings" element={<Settings />} />
            <Route path="templates" element={<ServiceTemplates />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="tire-storage" element={<TireStorage />} />
            <Route path="lexware" element={<Lexware />} />
            <Route path="conrad" element={<Conrad />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App

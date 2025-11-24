import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Customers from './pages/Customers'
import CustomerDetails from './pages/CustomerDetails'
import CreateCustomer from './pages/CreateCustomer'
import Settings from './pages/Settings'

function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create-customer" element={<CreateCustomer />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customer/:id" element={<CustomerDetails />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App

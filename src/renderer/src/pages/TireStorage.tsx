import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Info, Plus, X as CloseIcon } from 'lucide-react'

interface StorageSpot {
  id: string
  displayId: string
  row: number
  col: number
  label?: string
  status: 'free' | 'occupied' | 'reserved' | 'blocked'
  customerIds?: number[]
  tireDetails?: string
}

export default function TireStorage() {
  const navigate = useNavigate()
  const [selectedSpot, setSelectedSpot] = useState<StorageSpot | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  
  // Mock data - in a real app this would come from the database
  // We'll initialize a grid that roughly matches the dimensions 28 rows x 24 cols (A-X)
  const rows = 28
  const cols = 24 // A to X
  
  const getColLabel = (index: number) => {
    return String.fromCharCode(65 + index)
  }

  // Define aisles (0-indexed columns)
  // B(1), D(3), G(6), J(9), M(12), P(15), S(18), V(21)
  const aisleCols = [1, 3, 6, 9, 12, 15, 18, 21]
  
  const getAisleLabel = (col: number) => {
    const map: Record<number, string> = {
      1: '8. Gang',
      3: '7. Gang',
      6: '6. Gang',
      9: '5. Gang',
      12: '4. Gang',
      15: '3. Gang',
      18: '2. Gang',
      21: '1. Gang'
    }
    return map[col]
  }

  const getAisleChar = (col: number, row: number) => {
    const label = getAisleLabel(col)
    if (!label) return null
    
    // Render "8", ".", "G", "a", "n", "g" vertically starting at row 6
    // But we want "8" to be huge and red, and "Gang" to be smaller?
    // Or just uniform. The user image showed "8" and "G" very large.
    
    const text = label.replace(' ', '') // "8.Gang"
    const startRow = 6
    const index = row - startRow
    
    if (index >= 0 && index < text.length) {
      return text[index]
    }
    return null
  }

  // Rack Data (0-indexed rows/cols)
  // Format: key `${row}-${col}`: { label, color? }
  const initialRackData: Record<string, { label: string, color?: string, status?: string }> = {
    // Col A (0)
    '9-0': { label: '151', color: 'bg-yellow-200', status: 'free' }, '10-0': { label: '17', color: 'bg-yellow-200', status: 'free' }, '12-0': { label: '227', color: 'bg-yellow-200', status: 'free' },
    // Col C (2)
    '0-2': { label: '222', color: 'bg-yellow-200', status: 'free' }, '3-2': { label: '224', color: 'bg-yellow-200', status: 'free' }, '5-2': { label: '209', color: 'bg-yellow-200', status: 'free' }, '6-2': { label: '213', color: 'bg-yellow-200', status: 'free' },
    '8-2': { label: '223', color: 'bg-yellow-200', status: 'free' }, '9-2': { label: '98', color: 'bg-yellow-200', status: 'free' }, '11-2': { label: '200', color: 'bg-yellow-200', status: 'free' }, '12-2': { label: '205', color: 'bg-yellow-200', status: 'free' },
    // Col E (4)
    '2-4': { label: 'Frank', color: 'bg-yellow-200', status: 'free' }, '3-4': { label: '128', color: 'bg-yellow-200', status: 'free' }, '5-4': { label: '163', color: 'bg-yellow-200', status: 'free' }, '6-4': { label: '190', color: 'bg-yellow-200', status: 'free' },
    '8-4': { label: '219', color: 'bg-yellow-200', status: 'free' }, '9-4': { label: '204', color: 'bg-yellow-200', status: 'free' }, '11-4': { label: '173', color: 'bg-yellow-200', status: 'free' }, '12-4': { label: '193', color: 'bg-yellow-200', status: 'free' },
    '14-4': { label: '202', color: 'bg-yellow-200', status: 'free' }, '15-4': { label: '216', color: 'bg-yellow-200', status: 'free' }, '17-4': { label: '212', color: 'bg-yellow-200', status: 'free' }, '18-4': { label: '223a', color: 'bg-yellow-200', status: 'free' },
    // Col F (5)
    '8-5': { label: '207', color: 'bg-yellow-200', status: 'free' }, '9-5': { label: '185', color: 'bg-yellow-200', status: 'free' }, '11-5': { label: '171', color: 'bg-yellow-200', status: 'free' }, '12-5': { label: '184', color: 'bg-yellow-200', status: 'free' },
    '14-5': { label: '198', color: 'bg-yellow-200', status: 'free' }, '15-5': { label: '188', color: 'bg-yellow-200', status: 'free' }, '17-5': { label: '186', color: 'bg-yellow-200', status: 'free' }, '18-5': { label: '203', color: 'bg-yellow-200', status: 'free' },
    // Col H (7)
    '2-7': { label: '168', color: 'bg-yellow-200', status: 'free' }, '3-7': { label: '181', color: 'bg-yellow-200', status: 'free' }, '5-7': { label: '206', color: 'bg-yellow-200', status: 'free' }, '6-7': { label: '179', color: 'bg-yellow-200', status: 'free' },
    '8-7': { label: '116', color: 'bg-yellow-200', status: 'free' }, '9-7': { label: '199', color: 'bg-yellow-200', status: 'free' }, '11-7': { label: '164', color: 'bg-yellow-200', status: 'free' }, '12-7': { label: '177', color: 'bg-yellow-200', status: 'free' },
    '14-7': { label: '162', color: 'bg-yellow-200', status: 'free' }, '15-7': { label: '167', color: 'bg-yellow-200', status: 'free' },
    // Col I (8)
    '2-8': { label: '146', color: 'bg-yellow-200', status: 'free' }, '3-8': { label: '71', color: 'bg-yellow-200', status: 'free' }, '5-8': { label: '170', color: 'bg-yellow-200', status: 'free' }, '6-8': { label: '141', color: 'bg-yellow-200', status: 'free' },
    '8-8': { label: '165', color: 'bg-yellow-200', status: 'free' }, '9-8': { label: '161', color: 'bg-yellow-200', status: 'free' }, '11-8': { label: '143', color: 'bg-yellow-200', status: 'free' }, '12-8': { label: '208', color: 'bg-yellow-200', status: 'free' },
    '14-8': { label: '154', color: 'bg-yellow-200', status: 'free' }, '15-8': { label: '157', color: 'bg-yellow-200', status: 'free' }, '17-8': { label: '156', color: 'bg-yellow-200', status: 'free' }, '18-8': { label: '107', color: 'bg-yellow-200', status: 'free' },
    // Col K (10)
    '2-10': { label: '129', color: 'bg-yellow-200', status: 'free' }, '3-10': { label: '136', color: 'bg-yellow-200', status: 'free' }, '5-10': { label: '127', color: 'bg-yellow-200', status: 'free' }, '6-10': { label: '135', color: 'bg-yellow-200', status: 'free' },
    '8-10': { label: '144', color: 'bg-yellow-200', status: 'free' }, '9-10': { label: '111', color: 'bg-yellow-200', status: 'free' }, '11-10': { label: '132', color: 'bg-yellow-200', status: 'free' }, '12-10': { label: '130', color: 'bg-yellow-200', status: 'free' },
    '14-10': { label: '140', color: 'bg-yellow-200', status: 'free' }, '15-10': { label: '103', color: 'bg-yellow-200', status: 'free' }, '17-10': { label: '155', color: 'bg-yellow-200', status: 'free' }, '18-10': { label: '147', color: 'bg-yellow-200', status: 'free' },
    // Col L (11)
    '2-11': { label: '117', color: 'bg-yellow-200', status: 'free' }, '3-11': { label: '100', color: 'bg-yellow-200', status: 'free' }, '5-11': { label: '86', color: 'bg-yellow-200', status: 'free' }, '6-11': { label: '125', color: 'bg-yellow-200', status: 'free' },
    '8-11': { label: '115', color: 'bg-yellow-200', status: 'free' }, '9-11': { label: '102', color: 'bg-yellow-200', status: 'free' }, '11-11': { label: '122', color: 'bg-yellow-200', status: 'free' }, '12-11': { label: '150', color: 'bg-yellow-200', status: 'free' },
    '14-11': { label: '126', color: 'bg-yellow-200', status: 'free' }, '15-11': { label: '109', color: 'bg-yellow-200', status: 'free' }, '17-11': { label: '159', color: 'bg-yellow-200', status: 'free' }, '18-11': { label: '196', color: 'bg-yellow-200', status: 'free' },
    // Col N (13)
    '2-13': { label: '83', color: 'bg-yellow-200', status: 'free' }, '3-13': { label: '96', color: 'bg-yellow-200', status: 'free' }, '5-13': { label: '131', color: 'bg-yellow-200', status: 'free' }, '6-13': { label: '138', color: 'bg-yellow-200', status: 'free' },
    '8-13': { label: '94', color: 'bg-yellow-200', status: 'free' }, '9-13': { label: '93', color: 'bg-yellow-200', status: 'free' }, '11-13': { label: '123', color: 'bg-yellow-200', status: 'free' }, '12-13': { label: '85', color: 'bg-yellow-200', status: 'free' },
    '14-13': { label: '174', color: 'bg-yellow-200', status: 'free' }, '15-13': { label: '121', color: 'bg-yellow-200', status: 'free' }, '17-13': { label: '110', color: 'bg-yellow-200', status: 'free' }, '18-13': { label: '108', color: 'bg-yellow-200', status: 'free' },
    // Col O (14)
    '5-14': { label: '81', color: 'bg-yellow-200', status: 'free' }, '6-14': { label: '89', color: 'bg-yellow-200', status: 'free' }, '8-14': { label: '88', color: 'bg-yellow-200', status: 'free' }, '9-14': { label: '58', color: 'bg-yellow-200', status: 'free' },
    '11-14': { label: '55', color: 'bg-yellow-200', status: 'free' }, '12-14': { label: '68', color: 'bg-yellow-200', status: 'free' }, '14-14': { label: '80', color: 'bg-yellow-200', status: 'free' }, '15-14': { label: '67', color: 'bg-yellow-200', status: 'free' },
    '17-14': { label: '104', color: 'bg-yellow-200', status: 'free' }, '18-14': { label: '105', color: 'bg-yellow-200', status: 'free' },
    // Col Q (16)
    '2-16': { label: '69', color: 'bg-yellow-200', status: 'free' }, '3-16': { label: '60', color: 'bg-yellow-200', status: 'free' }, '5-16': { label: '65', color: 'bg-yellow-200', status: 'free' }, '6-16': { label: '73', color: 'bg-yellow-200', status: 'free' },
    '8-16': { label: '72', color: 'bg-yellow-200', status: 'free' }, '9-16': { label: '75', color: 'bg-yellow-200', status: 'free' }, '11-16': { label: '79', color: 'bg-yellow-200', status: 'free' }, '12-16': { label: '70', color: 'bg-yellow-200', status: 'free' },
    '14-16': { label: '51', color: 'bg-yellow-200', status: 'free' }, '15-16': { label: '50', color: 'bg-yellow-200', status: 'free' }, '17-16': { label: '28', color: 'bg-yellow-200', status: 'free' }, '18-16': { label: '52', color: 'bg-yellow-200', status: 'free' },
    // Col R (17)
    '2-17': { label: '47', color: 'bg-yellow-200', status: 'free' }, '3-17': { label: '32', color: 'bg-yellow-200', status: 'free' }, '5-17': { label: '74', color: 'bg-yellow-200', status: 'free' }, '6-17': { label: '78', color: 'bg-yellow-200', status: 'free' },
    '8-17': { label: '35', color: 'bg-yellow-200', status: 'free' }, '9-17': { label: '76', color: 'bg-yellow-200', status: 'free' }, '11-17': { label: '43', color: 'bg-yellow-200', status: 'free' }, '12-17': { label: '45', color: 'bg-yellow-200', status: 'free' },
    '14-17': { label: '57', color: 'bg-yellow-200', status: 'free' }, '15-17': { label: '77', color: 'bg-yellow-200', status: 'free' }, '17-17': { label: '62', color: 'bg-yellow-200', status: 'free' }, '18-17': { label: '54', color: 'bg-yellow-200', status: 'free' },
    // Col T (19)
    '2-19': { label: '64', color: 'bg-yellow-200', status: 'free' }, '3-19': { label: '41', color: 'bg-yellow-200', status: 'free' }, '5-19': { label: '30', color: 'bg-yellow-200', status: 'free' }, '6-19': { label: '27', color: 'bg-yellow-200', status: 'free' },
    '8-19': { label: '16', color: 'bg-yellow-200', status: 'free' }, '9-19': { label: '61', color: 'bg-yellow-200', status: 'free' }, '11-19': { label: '53', color: 'bg-yellow-200', status: 'free' }, '12-19': { label: '23', color: 'bg-yellow-200', status: 'free' },
    '14-19': { label: '59', color: 'bg-yellow-200', status: 'free' }, '15-19': { label: '46', color: 'bg-yellow-200', status: 'free' }, '17-19': { label: '48', color: 'bg-yellow-200', status: 'free' }, '18-19': { label: '31', color: 'bg-yellow-200', status: 'free' },
    // Col U (20)
    '2-20': { label: '1', color: 'bg-yellow-200', status: 'free' }, '3-20': { label: '12', color: 'bg-yellow-200', status: 'free' }, '5-20': { label: '29', color: 'bg-yellow-200', status: 'free' }, '6-20': { label: '8a', color: 'bg-yellow-200', status: 'free' },
    '8-20': { label: '13A', color: 'bg-yellow-200', status: 'free' }, '9-20': { label: '33', color: 'bg-yellow-200', status: 'free' }, '11-20': { label: '24', color: 'bg-yellow-200', status: 'free' }, '12-20': { label: '34', color: 'bg-yellow-200', status: 'free' },
    '14-20': { label: '8', color: 'bg-yellow-200', status: 'free' }, '15-20': { label: '15', color: 'bg-yellow-200', status: 'free' }, '17-20': { label: '18', color: 'bg-yellow-200', status: 'free' }, '18-20': { label: '19', color: 'bg-yellow-200', status: 'free' },
    // Col W (22)
    '2-22': { label: '2A', color: 'bg-yellow-200', status: 'free' }, '3-22': { label: '29a', color: 'bg-yellow-200', status: 'free' }, '5-22': { label: '5', color: 'bg-yellow-200', status: 'free' }, '6-22': { label: '42', color: 'bg-yellow-200', status: 'free' },
    '9-22': { label: '22', color: 'bg-yellow-200', status: 'free' }, '12-22': { label: '9', color: 'bg-yellow-200', status: 'free' }, '14-22': { label: '40', color: 'bg-yellow-200', status: 'free' }, '15-22': { label: '14', color: 'bg-yellow-200', status: 'free' },
    
    // Special Blocks from image
    '20-13': { label: '166', color: 'bg-yellow-200', status: 'free' },
    '21-13': { label: '118', color: 'bg-yellow-200', status: 'free' },
    '20-19': { label: '44', color: 'bg-yellow-200', status: 'free' },
    '21-19': { label: '21', color: 'bg-yellow-200', status: 'free' },
    '20-20': { label: '124', color: 'bg-yellow-200', status: 'free' },
    '21-20': { label: '137', color: 'bg-yellow-200', status: 'free' },

    // Hall Area (Special)
    '24-19': { label: '39 Zovak\n114 Nemitz', color: 'bg-gray-300', status: 'occupied' }
  }

  const [racks, setRacks] = useState(initialRackData)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // @ts-ignore
      const [customerList, spotList] = await Promise.all([
        // @ts-ignore
        window.electron.ipcRenderer.invoke('get-customers'),
        // @ts-ignore
        window.electron.ipcRenderer.invoke('get-tire-spots')
      ])
      
      setCustomers(customerList)
      
      // Merge initial data with DB spots
      const mergedRacks = { ...initialRackData }
      spotList.forEach((spot: any) => {
        if (mergedRacks[spot.id]) {
          let color = mergedRacks[spot.id].color
          if (spot.status === 'reserved') color = 'bg-blue-200'
          if (spot.status === 'occupied') color = 'bg-red-200'
          if (spot.status === 'free') color = 'bg-yellow-200'
          if (spot.status === 'blocked') color = 'bg-gray-500'

          mergedRacks[spot.id] = {
            ...mergedRacks[spot.id],
            label: spot.label || mergedRacks[spot.id].label,
            status: spot.status || mergedRacks[spot.id].status,
            color
          }
        }
      })

      syncRacksWithCustomers(customerList, mergedRacks)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  const syncRacksWithCustomers = (customerList: any[], baseRacks: Record<string, any>) => {
    const newRacks = { ...baseRacks }
    
    customerList.forEach(customer => {
      if (customer.tireStorageSpot && newRacks[customer.tireStorageSpot]) {
        newRacks[customer.tireStorageSpot] = {
          ...newRacks[customer.tireStorageSpot],
          status: 'occupied',
          color: customer.tireStorageSpot === '24-19' ? 'bg-gray-300' : 'bg-red-200'
        }
      }
    })
    setRacks(newRacks)
  }

  // Blocked cells (pillars/walls) - 0-indexed
  const blockedCells = [
    // Col A (0)
    { r: 0, c: 0 }, { r: 3, c: 0 }, { r: 6, c: 0 }, { r: 13, c: 0 },
    // Col C (2)
    { r: 2, c: 2 },
    // Col H (7)
    { r: 17, c: 7 }, { r: 18, c: 7 },
    // Col O (14)
    { r: 2, c: 14 }, { r: 3, c: 14 },
    // Col W (22)
    { r: 8, c: 22 }, { r: 11, c: 22 }, { r: 17, c: 22 }, { r: 18, c: 22 },
    // Col X (23)
    { r: 8, c: 23 }, { r: 11, c: 23 }, { r: 17, c: 23 }, { r: 18, c: 23 },
    // Bottom area blocks
    { r: 20, c: 22 }, { r: 20, c: 23 }
  ]

  const isBlocked = (row: number, col: number) => {
    return blockedCells.some(cell => cell.r === row && cell.c === col)
  }

  const getCellType = (row: number, col: number) => {
    // Bottom Left "Reserviert" Area (Rows 25-28, Cols A-E)
    // 0-indexed: Rows 24-27, Cols 0-4
    if (row >= 24 && col <= 4) return 'reserved-area'

    // Bottom Right "In Halle Liegend" Area (Rows 25-28, Cols T-X)
    // 0-indexed: Rows 24-27, Cols 19-23
    if (row >= 24 && col >= 19) return 'hall-area'

    // Stairs (Treppe) (Rows 21-23, Cols A-C)
    // 0-indexed: Rows 20-22, Cols 0-2
    if (row >= 20 && row <= 22 && col <= 2) return 'stairs'

    // Blocked cells
    if (isBlocked(row, col)) return 'blocked'

    // Check for Rack
    if (racks[`${row}-${col}`]) return 'rack'

    // Main Grid Area (Rows 1-20)
    // 0-indexed: Rows 0-19
    if (row < 20) {
      if (aisleCols.includes(col)) return 'aisle'
      return 'floor' // Default to floor if not a rack
    }

    // Rows 21-24 (indices 20-23) outside of stairs are floor/aisle extensions
    if (row >= 20 && row < 24) {
       // Check if it's a rack in this area (the special blocks)
       if (racks[`${row}-${col}`]) return 'rack'
       return 'floor'
    }

    return 'floor'
  }

  const handleSpotClick = (row: number, col: number) => {
    const type = getCellType(row, col)
    
    // Allow clicking on hall-area, but redirect to the main cell
    let targetRow = row
    let targetCol = col
    
    if (type === 'hall-area') {
      targetRow = 24
      targetCol = 19
    } else if (type === 'reserved-area') {
      targetRow = 24
      targetCol = 0
    } else if (type === 'aisle' || type === 'floor' || type === 'stairs' || type === 'blocked') {
      return
    }

    const colLabel = getColLabel(targetCol)
    const coordinateKey = `${targetRow}-${targetCol}`
    const rackInfo = racks[coordinateKey]
    
    let displayId = type === 'hall-area' ? 'Halle' : (type === 'reserved-area' ? 'Reserviert' : `${colLabel}${targetRow + 1}`)
    if (rackInfo?.label) {
      displayId = rackInfo.label
    }

    const linkedCustomers = customers.filter(c => c.tireStorageSpot === coordinateKey)

    setSelectedSpot({
      id: coordinateKey,
      displayId,
      row: targetRow,
      col: targetCol,
      status: (rackInfo?.status as any) || 'free',
      label: rackInfo?.label || '',
      customerIds: linkedCustomers.map(c => c.id)
    })
  }

  const handleSave = async () => {
    if (selectedSpot) {
      // Update local state
      const key = `${selectedSpot.row}-${selectedSpot.col}`
      const newRacks = { ...racks }
      
      // Determine color based on status
      let color = 'bg-white'
      if (selectedSpot.status === 'reserved') color = 'bg-blue-200'
      if (selectedSpot.status === 'occupied') color = 'bg-red-200'
      if (selectedSpot.status === 'blocked') color = 'bg-gray-500'
      if (selectedSpot.status === 'free') color = 'bg-yellow-200'
      
      newRacks[key] = {
        label: selectedSpot.label || '',
        color,
        status: selectedSpot.status
      }
      
      setRacks(newRacks)
      
      // Update Database
      try {
        // 1. Update the spot itself (label and status)
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('update-tire-spot', {
          id: selectedSpot.id,
          label: selectedSpot.label,
          status: selectedSpot.status
        })

        // 2. Find customers who were previously linked to this spot but are no longer
        const previouslyLinked = customers.filter(c => c.tireStorageSpot === selectedSpot.id)
        const currentIds = selectedSpot.customerIds || []
        
        for (const customer of previouslyLinked) {
          if (!currentIds.includes(customer.id)) {
            // @ts-ignore
            await window.electron.ipcRenderer.invoke('update-customer', {
              id: customer.id,
              tireStorageSpot: null
            })
          }
        }

        // 3. Link new customers
        for (const id of currentIds) {
          const customer = customers.find(c => c.id === id)
          if (customer && customer.tireStorageSpot !== selectedSpot.id) {
            // @ts-ignore
            await window.electron.ipcRenderer.invoke('update-customer', {
              id: customer.id,
              tireStorageSpot: selectedSpot.id
            })
          }
        }

        loadData()
        setSelectedSpot(null)
      } catch (err) {
        console.error('Failed to update database:', err)
      }
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Package className="w-8 h-8" />
          Reifenlager
        </h1>
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-600 border border-yellow-300 dark:border-yellow-700 rounded"></div>
            <span>Frei</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 dark:bg-red-600 border border-red-300 dark:border-red-700 rounded"></div>
            <span>Belegt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 dark:bg-blue-600 border border-blue-300 dark:border-blue-700 rounded"></div>
            <span>Reserviert</span>
          </div>
          <div className="flex items-cegray-500 dark:bg-gray-500 border border-gray-600 dark:border-gray-600 rounded"></div>
            <span>Gesperrt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-nter gap-2">
            <div className="w-4 h-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"></div>
            <span>Standard</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex gap-4 overflow-hidden">
        {/* Grid Area */}
        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-200 dark:bg-gray-900">
          <div 
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `30px repeat(${cols}, minmax(30px, 1fr))`,
              width: '100%',
              minWidth: 'fit-content'
            }}
          >
            {/* Header Row */}
            <div className="h-8 bg-gray-100 dark:bg-gray-800 sticky top-0 z-10"></div>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={`head-${i}`} className="h-8 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 text-xs bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 sticky top-0 z-10">
                {getColLabel(i)}
              </div>
            ))}

            {/* Grid Rows */}
            {Array.from({ length: rows }).map((_, row) => (
              <>
                {/* Row Label */}
                <div key={`row-${row}`} className="w-8 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 text-xs bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 sticky left-0 z-10">
                  {row + 1}
                </div>
                {/* Cells */}
                {Array.from({ length: cols }).map((_, col) => {
                  const type = getCellType(row, col)
                  const isAisle = type === 'aisle'
                  const aisleChar = isAisle ? getAisleChar(col, row) : null

                  // Merged Areas Logic
                  // Reserved Area: Start at 24,0. Span 4 rows, 5 cols.
                  if (type === 'reserved-area') {
                    if (row === 24 && col === 0) {
                      const rackInfo = racks[`${row}-${col}`]
                      const linkedCustomers = customers.filter(c => c.tireStorageSpot === `${row}-${col}`)
                      const lines = rackInfo?.label ? rackInfo.label.split('\n') : []

                      return (
                        <div
                          key={`${row}-${col}`}
                          onClick={() => handleSpotClick(row, col)}
                          className={`
                            bg-gray-300 dark:bg-gray-700 border-2 border-gray-500 dark:border-gray-600 flex flex-col relative cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors overflow-hidden
                            ${selectedSpot?.id === `${row}-${col}` ? 'ring-4 ring-blue-500 z-20' : ''}
                          `}
                          style={{ gridRow: 'span 4', gridColumn: 'span 5' }}
                        >
                          <div className="bg-gray-600 dark:bg-gray-800 text-white text-[10px] px-1 text-center font-bold py-1 uppercase tracking-wider">
                            Reserviert
                          </div>
                          <div className="flex-1 p-2 flex flex-col gap-1 overflow-auto">
                             {lines.map((line, idx) => (
                               <div key={`label-${idx}`} className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">
                                 {line}
                               </div>
                             ))}
                             {linkedCustomers.map(cust => (
                               <button
                                 key={cust.id}
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   navigate(`/customers/${cust.id}`)
                                 }}
                                 className="text-left text-xs font-bold text-gray-700 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors leading-tight"
                               >
                                 {cust.lastName} {cust.firstName}
                               </button>
                             ))}
                          </div>
                        </div>
                      )
                    }
                    return null // Skip other cells in this area
                  }

                  // Hall Area: Start at 24,19. Span 4 rows, 5 cols.
                  if (type === 'hall-area') {
                    if (row === 24 && col === 19) {
                      const rackInfo = racks[`${row}-${col}`]
                      const linkedCustomers = customers.filter(c => c.tireStorageSpot === `${row}-${col}`)
                      const lines = rackInfo?.label ? rackInfo.label.split('\n') : []

                      return (
                        <div
                          key={`${row}-${col}`}
                          onClick={() => handleSpotClick(row, col)}
                          className={`
                            bg-gray-400 dark:bg-gray-700 border-2 border-red-500 flex flex-col relative cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors overflow-hidden
                            ${selectedSpot?.id === `${row}-${col}` ? 'ring-4 ring-blue-500 z-20' : ''}
                          `}
                          style={{ gridRow: 'span 4', gridColumn: 'span 5' }}
                        >
                          <div className="bg-red-700 text-white text-[10px] px-1 text-center font-bold py-1 uppercase tracking-wider">
                            In Halle Liegend!
                          </div>
                          <div className="flex-1 p-2 flex flex-col gap-1 overflow-auto">
                             {/* Show manual label lines */}
                             {lines.map((line, idx) => (
                               <div key={`label-${idx}`} className="text-xs font-bold text-white dark:text-gray-100 leading-tight">
                                 {line}
                               </div>
                             ))}
                             
                             {/* Show linked customers as interactive buttons */}
                             {linkedCustomers.map(cust => (
                               <button
                                 key={cust.id}
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   navigate(`/customers/${cust.id}`)
                                 }}
                                 className="text-left text-xs font-bold text-white dark:text-blue-300 hover:text-blue-200 transition-colors leading-tight"
                               >
                                 {cust.lastName} {cust.firstName}
                               </button>
                             ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }

                  if (type === 'stairs') {
                     return (
                        <div 
                            key={`${row}-${col}`}
                            className="bg-gray-600 dark:bg-gray-800 border border-gray-700 dark:border-gray-900 relative"
                        >
                          {row === 22 && col === 0 && (
                            <span className="absolute bottom-0 left-1 text-xs text-white dark:text-gray-400">Treppe</span>
                          )}
                        </div>
                     )
                  }

                  if (type === 'blocked') {
                    return (
                      <div 
                        key={`${row}-${col}`}
                        className="bg-gray-700 dark:bg-black border border-gray-800 dark:border-gray-900"
                      />
                    )
                  }

                  if (type === 'aisle') {
                    const isNumber = aisleChar && !isNaN(parseInt(aisleChar))
                    return (
                      <div 
                        key={`${row}-${col}`}
                        className="bg-gray-300 dark:bg-gray-800 flex items-center justify-center relative"
                      >
                        {aisleChar && (
                           <span className={`font-black text-red-600 dark:text-red-500 uppercase ${isNumber ? 'text-3xl' : 'text-xl'}`}>
                             {aisleChar}
                           </span>
                        )}
                      </div>
                    )
                  }

                  if (type === 'floor') {
                    // Special floor labels
                    // "frei" sticker at approx row 25, col 9 (J)
                    if (row === 24 && col === 9) {
                      return (
                        <div key={`${row}-${col}`} className="bg-gray-200 dark:bg-gray-900 relative">
                           <div className="absolute top-0 left-0 w-8 h-12 bg-yellow-200 dark:bg-yellow-600 border border-yellow-400 dark:border-yellow-700 flex items-center justify-center z-20 shadow-sm" style={{ width: '30px' }}>
                              <span className="text-[10px] font-bold transform -rotate-90 dark:text-white">frei</span>
                           </div>
                        </div>
                      )
                    }

                    // 166 / 118 block
                    if (row === 20 && col === 13) return null
                    if (row === 21 && col === 13) return null
                    
                    // 44 / 21 block
                    if (row === 20 && col === 19) return null
                    if (row === 21 && col === 19) return null

                    // 124 / 137 block
                    if (row === 20 && col === 20) return null
                    if (row === 21 && col === 20) return null

                    // Perbix block
                    if (row === 21 && col === 22) {
                       return (
                        <div 
                          key={`${row}-${col}`} 
                          className="bg-gray-600 dark:bg-gray-800 border border-gray-700 dark:border-gray-900 flex items-center justify-center text-[10px] text-white dark:text-gray-300 font-bold"
                          style={{ gridColumn: 'span 2' }}
                        >
                          Perbix
                        </div>
                       )
                    }
                    if (row === 21 && col === 23) return null // Covered by span

                    return <div key={`${row}-${col}`} className="bg-gray-200 dark:bg-gray-900"></div>
                  }

                  // Rack
                  if (type === 'rack') {
                    const key = `${row}-${col}`
                    const rackInfo = racks[key]
                    const linkedCustomers = customers.filter(c => c.tireStorageSpot === key)
                    
                    if (rackInfo) {
                      // Always show the rack label if it exists, otherwise show customer name
                      const displayLabel = rackInfo.label || (linkedCustomers.length > 0 ? linkedCustomers[0].lastName : '')

                      // Map light colors to dark colors
                      const colorMap: Record<string, string> = {
                        'bg-yellow-200': 'bg-yellow-200 dark:bg-yellow-600',
                        'bg-red-200': 'bg-red-200 dark:bg-red-600',
                        'bg-blue-200': 'bg-blue-200 dark:bg-blue-600',
                        'bg-white': 'bg-white dark:bg-gray-700',
                        'bg-gray-500': 'bg-gray-500 dark:bg-gray-500',
                        'bg-gray-300': 'bg-gray-300 dark:bg-gray-600'
                      }
                      const colorClass = colorMap[rackInfo.color || ''] || (rackInfo.color || 'bg-white dark:bg-gray-700')

                      return (
                        <div
                          key={key}
                          onClick={() => handleSpotClick(row, col)}
                          className={`
                            h-8 border border-gray-400 dark:border-gray-600 ${colorClass} hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer 
                            flex items-center justify-center text-[9px] font-bold text-gray-800 dark:text-white transition-colors overflow-hidden px-0.5
                            ${selectedSpot?.row === row && selectedSpot?.col === col ? 'ring-2 ring-blue-500 z-10' : ''}
                          `}
                          title={linkedCustomers.length > 0 ? linkedCustomers.map(c => `${c.lastName}, ${c.firstName}`).join('\n') : rackInfo.label}
                        >
                          <span className="truncate">{displayLabel}</span>
                        </div>
                      )
                    }
                    // If no rack info but type is rack (shouldn't happen with current logic but fallback to floor)
                    return <div key={`${row}-${col}`} className="bg-gray-200 dark:bg-gray-900"></div>
                  }
                  return null
                })}
              </>
            ))}
          </div>
        </div>

        {/* Sidebar / Details Panel */}
        <div className="w-80 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 flex flex-col">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Info className="w-4 h-4" />
            Details
          </h2>
          
          {selectedSpot ? (
            <div className="space-y-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Platz</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedSpot.displayId}</div>
              </div>

              <div>
                <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                  id="status-select"
                  value={selectedSpot.status}
                  onChange={(e) => setSelectedSpot({ ...selectedSpot, status: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="free">Frei (Gelb)</option>
                  <option value="occupied">Belegt (Rot)</option>
                  <option value="reserved">Reserviert (Blau)</option>
                  <option value="blocked">Gesperrt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verknüpfte Kunden</label>
                <div className="space-y-2 mb-2">
                  {(selectedSpot.customerIds || []).map(id => {
                    const cust = customers.find(c => c.id === id)
                    if (!cust) return null
                    return (
                      <div key={id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-100 dark:border-blue-800">
                        <button 
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          className="text-sm font-medium text-blue-800 dark:text-blue-200 hover:underline text-left"
                        >
                          {cust.lastName}, {cust.firstName}
                        </button>
                        <button 
                          onClick={() => {
                            const newIds = (selectedSpot.customerIds || []).filter(cid => cid !== id)
                            setSelectedSpot({ ...selectedSpot, customerIds: newIds })
                          }}
                          className="text-blue-400 hover:text-red-500 transition-colors"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex gap-2">
                  <select
                    id="customer-select"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return
                      const custId = parseInt(e.target.value)
                      if (!(selectedSpot.customerIds || []).includes(custId)) {
                        const newIds = [...(selectedSpot.customerIds || []), custId]
                        setSelectedSpot({ 
                          ...selectedSpot, 
                          customerIds: newIds,
                          status: 'occupied'
                        })
                      }
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 text-sm"
                  >
                    <option value="">-- Kunde hinzufügen --</option>
                    {customers
                      .filter(c => !(selectedSpot.customerIds || []).includes(c.id))
                      .map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.lastName}, {customer.firstName}
                        </option>
                      ))}
                  </select>
                  <div className="p-2 bg-blue-600 text-white rounded flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="rack-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedSpot.id === '24-19' ? 'Inhalt (Mehrzeilig)' : 'Rack Beschriftung'}
                </label>
                {selectedSpot.id === '24-19' ? (
                  <textarea
                    id="rack-label"
                    value={selectedSpot.label || ''}
                    onChange={(e) => setSelectedSpot({ ...selectedSpot, label: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                    rows={5}
                    placeholder="z.B. 39 Zovak..."
                  />
                ) : (
                  <input 
                    id="rack-label"
                    type="text" 
                    value={selectedSpot.label || ''}
                    onChange={(e) => setSelectedSpot({ ...selectedSpot, label: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                    placeholder="Rack ID..."
                  />
                )}
              </div>

              <div>
                <label htmlFor="tire-info" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reifen Info</label>
                <textarea 
                  id="tire-info"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                  rows={3}
                  placeholder="z.B. Winterreifen, DOT 2023..."
                ></textarea>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Speichern
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Wählen Sie einen Lagerplatz aus dem Plan aus, um Details zu sehen.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

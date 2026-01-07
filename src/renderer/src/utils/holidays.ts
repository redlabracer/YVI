export interface Holiday {
  date: Date
  name: string
}

function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

export function getHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: 'Neujahr' },
    { date: new Date(year, 4, 1), name: 'Tag der Arbeit' },
    { date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' },
    { date: new Date(year, 10, 1), name: 'Allerheiligen' },
    { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
    { date: new Date(year, 11, 26), name: '2. Weihnachtstag' },
  ]

  const easter = getEasterDate(year)
  
  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  holidays.push({ date: addDays(easter, -2), name: 'Karfreitag' })
  holidays.push({ date: addDays(easter, 1), name: 'Ostermontag' })
  holidays.push({ date: addDays(easter, 39), name: 'Christi Himmelfahrt' })
  holidays.push({ date: addDays(easter, 50), name: 'Pfingstmontag' })
  holidays.push({ date: addDays(easter, 60), name: 'Fronleichnam' })

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

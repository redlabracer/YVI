// afterPack Hook für electron-builder
// Kopiert die .prisma/client Dateien nach node_modules/@prisma/client
// damit der relative Import funktioniert

const path = require('path')
const fs = require('fs')

exports.default = async function(context) {
  const appOutDir = context.appOutDir
  
  // Bei asar: false ist die Struktur anders
  let resourcesDir = path.join(appOutDir, 'resources', 'app')
  
  // Fallback wenn app-Ordner nicht existiert (asar: false)
  if (!fs.existsSync(resourcesDir)) {
    resourcesDir = path.join(appOutDir, 'resources')
  }
  
  // Pfade
  const prismaClientSrc = path.join(resourcesDir, 'node_modules', '.prisma', 'client')
  const prismaClientDest = path.join(resourcesDir, 'node_modules', '@prisma', 'client', 'node_modules', '.prisma', 'client')
  
  console.log('afterPack: Kopiere Prisma Client Dateien...')
  console.log('  appOutDir:', appOutDir)
  console.log('  resourcesDir:', resourcesDir)
  console.log('  Von:', prismaClientSrc)
  console.log('  Nach:', prismaClientDest)
  
  // Kopiere rekursiv
  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
      console.log('  Quelle existiert nicht:', src)
      
      // Versuche direkten Pfad in win-unpacked
      const altSrc = path.join(appOutDir, 'node_modules', '.prisma', 'client')
      if (fs.existsSync(altSrc)) {
        console.log('  Verwende alternativen Pfad:', altSrc)
        src = altSrc
      } else {
        console.log('  Alternativer Pfad existiert auch nicht:', altSrc)
        return
      }
    }
    
    const stats = fs.statSync(src)
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }
      const files = fs.readdirSync(src)
      for (const file of files) {
        copyRecursive(path.join(src, file), path.join(dest, file))
      }
    } else {
      fs.copyFileSync(src, dest)
    }
  }
  
  copyRecursive(prismaClientSrc, prismaClientDest)
  console.log('afterPack: Prisma Client Dateien kopiert!')
}

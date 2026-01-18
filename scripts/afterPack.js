// afterPack Hook für electron-builder
// Kopiert die .prisma/client Dateien nach node_modules/@prisma/client
// damit der relative Import funktioniert

const path = require('path')
const fs = require('fs')

exports.default = async function(context) {
  const appOutDir = context.appOutDir
  const resourcesDir = path.join(appOutDir, 'resources', 'app')
  
  // Pfade
  const prismaClientSrc = path.join(resourcesDir, 'node_modules', '.prisma', 'client')
  const prismaClientDest = path.join(resourcesDir, 'node_modules', '@prisma', 'client', '.prisma', 'client')
  
  console.log('afterPack: Kopiere Prisma Client Dateien...')
  console.log('  Von:', prismaClientSrc)
  console.log('  Nach:', prismaClientDest)
  
  // Erstelle Zielverzeichnis
  if (!fs.existsSync(path.dirname(prismaClientDest))) {
    fs.mkdirSync(path.dirname(prismaClientDest), { recursive: true })
  }
  
  // Kopiere rekursiv
  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
      console.log('  Quelle existiert nicht:', src)
      return
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

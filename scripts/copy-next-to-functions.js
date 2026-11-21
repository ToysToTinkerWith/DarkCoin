const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const sourceDir = path.join(rootDir, ".next")
const functionsDir = path.join(rootDir, "functions")
const targetDir = path.join(functionsDir, ".next")

function assertInside(parent, child) {
  const relative = path.relative(parent, child)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to operate outside ${parent}: ${child}`)
  }
}

if (!fs.existsSync(sourceDir)) {
  throw new Error("Missing .next build output. Run npm run build before copying.")
}

if (!fs.existsSync(functionsDir)) {
  throw new Error("Missing functions directory.")
}

assertInside(rootDir, targetDir)

fs.rmSync(targetDir, { recursive: true, force: true })
// Build caches can be several GB and are not needed by the serving runtime.
// Exclude them while copying, rather than filling the disk and deleting afterward.
fs.cpSync(sourceDir, targetDir, {
  recursive: true,
  filter: source => path.relative(sourceDir, source).split(path.sep)[0] !== "cache",
})

console.log(`Copied ${sourceDir} to ${targetDir}`)

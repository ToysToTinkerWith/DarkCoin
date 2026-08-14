const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const rootDir = path.resolve(__dirname, "..")
const oldEffectsPath = path.join(rootDir, "pages", "arena", "effectsOld.js")
const newEffectsPath = path.join(rootDir, "pages", "arena", "effects.js")
const outputDir = path.join(rootDir, "public", "arena")
const svgPath = path.join(outputDir, "effects-patch-infographic.svg")
const htmlPath = path.join(outputDir, "effects-patch-infographic.html")
const pngPath = path.join(outputDir, "effects-patch-infographic.png")

const fieldLabels = {
  "effects.attackerStatAdjustments.strengthAdj": "Strength",
  "effects.attackerStatAdjustments.dexterityAdj": "Dexterity",
  "effects.attackerStatAdjustments.intelligenceAdj": "Intelligence",
  "effects.attackerStatAdjustments.accuracyAdj": "Accuracy",
  "effects.attackerStatAdjustments.resistAdj": "Resist",
  "effects.attackerStatAdjustments.speedAdj": "Speed",
  "effects.attackerStatAdjustments.critChanceAdj": "Crit Chance",
  "effects.ongoingHpPerTurn": "HP / turn",
  "effects.defenderStatAdjustments.resistAdj": "Defender Resist",
  "effects.effects": "Special",
}

const effectColors = {
  poison: "#75e16c",
  bleed: "#ff5e66",
  burn: "#ff9d42",
  freeze: "#7be8ff",
  slow: "#e6c95d",
  drown: "#56b9ff",
  paralyze: "#efe75c",
  doom: "#ba7cff",
  shield: "#d0dae5",
  strengthen: "#e19a57",
  focus: "#ffe574",
  empower: "#d580ff",
  nurture: "#68df91",
  bless: "#ffe66d",
  hasten: "#72f4ff",
  cleanse: "#dffbff",
}

const iconNames = {
  poison: "Poison",
  bleed: "Bleed",
  burn: "Burn",
  freeze: "Freeze",
  slow: "Slow",
  drown: "Drown",
  paralyze: "Paralyze",
  doom: "Doom",
  shield: "Shield",
  strengthen: "Strengthen",
  focus: "Focus",
  empower: "Empower",
  nurture: "Nurture",
  bless: "Bless",
  hasten: "Hasten",
  cleanse: "Cleanse",
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function parseEffects(filePath) {
  const source = fs.readFileSync(filePath, "utf8")
  const match = source.match(/const EFFECTS\s*=\s*(\[[\s\S]*?\r?\n\]\s*)\r?\n\r?\nfunction isZeroish/)

  if (!match) {
    throw new Error(`Unable to find EFFECTS array in ${filePath}`)
  }

  const icons = new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    }
  )

  return new Function("ICONS", `"use strict"; return (${match[1]});`)(icons)
}

function getAtPath(obj, keyPath) {
  return keyPath.split(".").reduce((next, key) => (next == null ? undefined : next[key]), obj)
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join("; ") : "None"
  if (value === undefined || value === null || value === "") return "None"
  return String(value).trim()
}

function isZeroLike(value) {
  if (Array.isArray(value)) return value.length === 0
  if (value === undefined || value === null) return true

  const text = String(value).trim()
  if (!text) return true

  return /^[-+]?0(?:\.0+)?%?(?:\s|$)/.test(text)
}

function valuesEqualForDiff(oldValue, newValue) {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return true
  return isZeroLike(oldValue) && isZeroLike(newValue)
}

function numericValue(value) {
  const match = displayValue(value).match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function formatDelta(oldValue, newValue) {
  const oldNumber = isZeroLike(oldValue) ? 0 : numericValue(oldValue)
  const newNumber = isZeroLike(newValue) ? 0 : numericValue(newValue)
  if (oldNumber === null || newNumber === null) return "Changed"

  const delta = Number((newNumber - oldNumber).toFixed(2))
  if (Object.is(delta, -0) || delta === 0) return "0"
  return `${delta > 0 ? "+" : ""}${delta}`
}

function titleCase(value) {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

function wrapText(text, maxChars) {
  const words = String(text).trim().split(/\s+/)
  const lines = []
  let line = ""

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })

  if (line) lines.push(line)
  return lines
}

function textBlock(text, x, y, maxChars, fontSize, lineHeight, fill, weight = 500) {
  return wrapText(text, maxChars)
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}">${esc(
          line
        )}</text>`
    )
    .join("\n")
}

function pill(text, x, y, width, height, fill, stroke, textFill, fontSize = 20, weight = 800) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${x + width / 2}" y="${y + height / 2 + fontSize / 3 - 1}" text-anchor="middle" fill="${textFill}" font-size="${fontSize}" font-weight="${weight}">${esc(
    text
  )}</text>`
}

function valueBox(value, x, y, width, height, fill, stroke, color) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
    <text x="${x + width / 2}" y="${y + 27}" text-anchor="middle" fill="${color}" font-size="22" font-weight="850">${esc(
    displayValue(value)
  )}</text>`
}

function changeRow(change, x, y, cardW, accent) {
  const oldX = x + 238
  const newX = x + 495
  const deltaX = x + cardW - 138
  const delta = change.delta
  const deltaFill = delta.startsWith("+")
    ? "rgba(98, 227, 138, .16)"
    : delta.startsWith("-")
      ? "rgba(255, 108, 108, .14)"
      : "rgba(255,255,255,.08)"
  const deltaStroke = delta.startsWith("+")
    ? "rgba(98, 227, 138, .50)"
    : delta.startsWith("-")
      ? "rgba(255, 108, 108, .42)"
      : "rgba(255,255,255,.22)"
  const deltaText = delta.startsWith("+")
    ? "#8ff0ad"
    : delta.startsWith("-")
      ? "#ff9090"
      : "#cfd6e6"

  return `
    <text x="${x + 30}" y="${y + 29}" fill="#f4f7ff" font-size="24" font-weight="850">${esc(change.label)}</text>
    ${valueBox(change.oldValue, oldX, y, 210, 38, "rgba(255,255,255,.055)", "rgba(255,255,255,.13)", "#d6dbea")}
    <text x="${oldX + 230}" y="${y + 28}" fill="${accent}" font-size="26" font-weight="900">-&gt;</text>
    ${valueBox(change.newValue, newX, y, 210, 38, "rgba(255,255,255,.082)", "rgba(255,255,255,.18)", "#ffffff")}
    ${pill(delta, deltaX, y + 1, 104, 36, deltaFill, deltaStroke, deltaText, 19, 900)}
  `
}

function iconBadge(effect, x, y, color) {
  const iconFile = iconNames[effect.name] || titleCase(effect.name)

  return `
    <circle cx="${x + 46}" cy="${y + 46}" r="44" fill="rgba(255,255,255,.06)" stroke="${color}" stroke-width="3"/>
    <circle cx="${x + 46}" cy="${y + 46}" r="35" fill="${color}" opacity=".10"/>
    <image href="../dragonshorde/trees/${esc(iconFile)}.svg" x="${x + 16}" y="${y + 16}" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>
  `
}

function card(effect, x, y, cardW, cardH) {
  const color = effectColors[effect.name] || "#9ee8ff"
  const typeColor = effect.effectType === "positive" ? "#7bf3a5" : "#ff8585"
  const rows = effect.changes
    .map((change, index) => changeRow(change, x, y + 104 + index * 44, cardW, color))
    .join("\n")

  return `
    <g filter="url(#cardShadow)">
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="28" fill="#10141f" stroke="rgba(255,255,255,.10)" stroke-width="2"/>
      <rect x="${x}" y="${y}" width="8" height="${cardH}" rx="4" fill="${color}"/>
      <rect x="${x + 8}" y="${y}" width="${cardW - 8}" height="96" rx="28" fill="${color}" opacity=".075"/>
      ${iconBadge(effect, x + 24, y + 22, color)}
      <text x="${x + 124}" y="${y + 52}" fill="#ffffff" font-size="34" font-weight="950">${esc(titleCase(effect.name))}</text>
      ${pill(titleCase(effect.effectType), x + 124, y + 62, 130, 31, "rgba(255,255,255,.06)", "rgba(255,255,255,.14)", typeColor, 17, 900)}
      <text x="${x + 306}" y="${y + 85}" fill="#9ca8bf" font-size="17" font-weight="850">OLD</text>
      <text x="${x + 563}" y="${y + 85}" fill="#9ca8bf" font-size="17" font-weight="850">NEW</text>
      <text x="${x + cardW - 102}" y="${y + 85}" text-anchor="middle" fill="#9ca8bf" font-size="17" font-weight="850">DELTA</text>
      ${rows}
    </g>
  `
}

function buildChanges(oldEffects, newEffects) {
  const oldByName = new Map(oldEffects.map((effect) => [effect.name, effect]))
  const paths = Object.keys(fieldLabels)

  return newEffects
    .map((newEffect) => {
      const oldEffect = oldByName.get(newEffect.name)
      if (!oldEffect) return null

      const changes = paths
        .map((keyPath) => {
          const oldValue = getAtPath(oldEffect, keyPath)
          const newValue = getAtPath(newEffect, keyPath)
          if (valuesEqualForDiff(oldValue, newValue)) return null

          return {
            label: fieldLabels[keyPath],
            oldValue,
            newValue,
            delta: formatDelta(oldValue, newValue),
          }
        })
        .filter(Boolean)

      if (!changes.length) return null

      return {
        name: newEffect.name,
        effectType: newEffect.effectType,
        changes,
      }
    })
    .filter(Boolean)
}

function buildSvg(changedEffects, unchangedNames) {
  const width = 2000
  const cardW = 892
  const cardH = 294
  const gapX = 36
  const gapY = 26
  const marginX = 86
  const gridTop = 330
  const rows = Math.ceil(changedEffects.length / 2)
  const height = gridTop + rows * cardH + (rows - 1) * gapY + 146

  const cards = changedEffects
    .map((effect, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = marginX + col * (cardW + gapX)
      const y = gridTop + row * (cardH + gapY)
      return card(effect, x, y, cardW, cardH)
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Dark Coin Arena Effect Balance Patch</title>
  <desc id="desc">Infographic comparing old and new Arena effect values from effectsOld.js and effects.js.</desc>
  <defs>
    <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070910"/>
      <stop offset="46%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#080a12"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffdf70"/>
      <stop offset="44%" stop-color="#75e16c"/>
      <stop offset="100%" stop-color="#72f4ff"/>
    </linearGradient>
    <filter id="cardShadow" x="-12%" y="-20%" width="124%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity=".42"/>
    </filter>
  </defs>
  <rect width="2000" height="${height}" fill="url(#pageBg)"/>
  <path d="M0 146h2000M0 298h2000" stroke="rgba(255,255,255,.07)" stroke-width="2"/>
  <g opacity=".16">
    <path d="M86 216H1914" stroke="#ffffff" stroke-width="1"/>
    ${Array.from({ length: 18 }, (_unused, index) => {
      const x = 86 + index * 108
      return `<path d="M${x} 330V${height - 96}" stroke="#ffffff" stroke-width="1" opacity=".28"/>`
    }).join("\n")}
  </g>
  <text x="86" y="92" fill="#aeb8cc" font-size="30" font-weight="850" letter-spacing="3">DARK COIN ARENA</text>
  <text x="86" y="174" fill="url(#titleGrad)" font-size="78" font-weight="1000">Effect Balance Patch</text>
  ${textBlock(
    "Only values that changed are shown below. Pulled directly from pages/arena/effectsOld.js and pages/arena/effects.js.",
    90,
    226,
    104,
    27,
    36,
    "#d7deee",
    650
  )}
  ${pill(`${changedEffects.length} effects tuned`, 1512, 74, 332, 48, "rgba(117,225,108,.12)", "rgba(117,225,108,.46)", "#a7f6b8", 25, 950)}
  ${pill(
    `${unchangedNames.map(titleCase).join(" + ")} unchanged`,
    1398,
    140,
    446,
    48,
    "rgba(255,255,255,.06)",
    "rgba(255,255,255,.16)",
    "#dfe5f2",
    24,
    900
  )}
  ${cards}
  <text x="86" y="${height - 64}" fill="#8e99ad" font-size="24" font-weight="700">Values are shown exactly as configured in the effect arrays. Delta is calculated from the first numeric value in each changed field.</text>
</svg>
`
}

function htmlWrapper(svg) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dark Coin Arena Effect Balance Patch</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      min-height: 100%;
      background: #070910;
    }

    body {
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    svg {
      display: block;
      width: 2000px;
      height: auto;
    }
  </style>
</head>
<body>
${svg}
</body>
</html>
`
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate))
}

function renderPng(width, height) {
  const chrome = findChrome()
  if (!chrome) {
    console.warn("Chrome or Edge was not found, so the PNG was not rendered.")
    return
  }

  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/").replace(/ /g, "%20")}`
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--screenshot=${pngPath}`,
      fileUrl,
    ],
    { stdio: "inherit" }
  )

  if (result.status !== 0) {
    throw new Error("Chrome failed to render the effects patch infographic PNG.")
  }
}

function main() {
  const oldEffects = parseEffects(oldEffectsPath)
  const newEffects = parseEffects(newEffectsPath)
  const changedEffects = buildChanges(oldEffects, newEffects)
  const changedNames = new Set(changedEffects.map((effect) => effect.name))
  const unchangedNames = newEffects
    .map((effect) => effect.name)
    .filter((name) => !changedNames.has(name))

  fs.mkdirSync(outputDir, { recursive: true })

  const svg = buildSvg(changedEffects, unchangedNames)
  const widthMatch = svg.match(/width="(\d+)"/)
  const heightMatch = svg.match(/height="(\d+)"/)
  const width = widthMatch ? Number(widthMatch[1]) : 2000
  const height = heightMatch ? Number(heightMatch[1]) : 2500

  fs.writeFileSync(svgPath, svg)
  fs.writeFileSync(htmlPath, htmlWrapper(svg))
  renderPng(width, height)

  console.log(`Compared ${oldEffects.length} old effects against ${newEffects.length} new effects.`)
  console.log(`Changed effects: ${changedEffects.map((effect) => effect.name).join(", ")}`)
  console.log(`Unchanged effects: ${unchangedNames.join(", ") || "none"}`)
  console.log(`Wrote ${svgPath}`)
  console.log(`Wrote ${htmlPath}`)
  console.log(`Wrote ${pngPath}`)
}

main()

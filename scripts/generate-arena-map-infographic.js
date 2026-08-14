const fs = require("fs")
const path = require("path")

const maps = [
  {
    effect: "Poison",
    color: "#66d66f",
    name: "Mire of Sludge",
    icon: "poison",
    passive: "Poison applied by attacks gains +1 flat stack.",
    endName: "Venom Cascade",
    criterion: "Exponential poison stacks hit both champions until one falls.",
  },
  {
    effect: "Bleed",
    color: "#f05b5b",
    name: "Knife Chamber",
    icon: "bleed",
    passive: "Melee hits apply +2 flat bleed stacks.",
    endName: "Blood Cascade",
    criterion: "Exponential bleed stacks hit both champions until one falls.",
  },
  {
    effect: "Burn",
    color: "#ff9b3d",
    name: "Ashen Crucible",
    icon: "burn",
    passive: "Burn damage ticks are 35% stronger.",
    endName: "Inferno Cascade",
    criterion: "Exponential burn stacks hit both champions until one falls.",
  },
  {
    effect: "Freeze",
    color: "#80e8ff",
    name: "Glacier Court",
    icon: "freeze",
    passive: "Freeze speed penalties are 50% stronger.",
    endName: "Whiteout Collapse",
    criterion: "Champion with lower speed at the end game round wins.",
  },
  {
    effect: "Slow",
    color: "#d6b35b",
    name: "Hourglass Ruins",
    icon: "slow",
    passive: "Slow applications gain +2 flat stacks, and magic hits apply +2 flat slow stacks.",
    endName: "Last Grain",
    criterion: "Champion with fewer slow stacks at the end game round wins.",
  },
  {
    effect: "Drown",
    color: "#5bb7ff",
    name: "Abyssal Causeway",
    icon: "drown",
    passive: "Drown accuracy penalties are 30% stronger, and ranged attacks apply +1 flat drown stack.",
    endName: "Tide Claim",
    criterion: "Champion with higher dexterity at the end game round wins.",
  },
  {
    effect: "Paralyze",
    color: "#d7d05b",
    name: "Stormcoil Spire",
    icon: "paralyze",
    passive: "Paralyze accuracy penalties are 40% stronger, and melee hits apply +2 flat paralyze stacks.",
    endName: "Lightning Rod",
    criterion: "Champion with fewer paralyze stacks at the end game round wins.",
  },
  {
    effect: "Doom",
    color: "#b06cff",
    name: "Eclipse Sepulcher",
    icon: "doom",
    passive: "Doom applications gain +1 flat stack, and doom resist penalties are 30% stronger.",
    endName: "Eclipse Cascade",
    criterion: "Exponential doom stacks hit both champions until one falls.",
  },
  {
    effect: "Shield",
    color: "#c8d3dd",
    name: "Aegis Bastion",
    icon: "shield",
    passive: "Shield gains block 40% more damage.",
    endName: "Bastion Lock",
    criterion: "Champion with more shield stacks at the end game round wins.",
  },
  {
    effect: "Strengthen",
    color: "#d99b60",
    name: "Titan Ring",
    icon: "strengthen",
    passive: "Strengthen potency is 40% stronger.",
    endName: "Titan's Measure",
    criterion: "Champion with higher strength at the end game round wins.",
  },
  {
    effect: "Focus",
    color: "#f2e17a",
    name: "Eagle-Eye Perch",
    icon: "focus",
    passive: "Missed attacks grant +1 flat focus stack.",
    endName: "True Shot",
    criterion: "Champion with highest dexterity at the end game round wins.",
  },
  {
    effect: "Empower",
    color: "#d27dff",
    name: "Arcane Conduit",
    icon: "empower",
    passive: "Empower applications gain +2 flat stack.",
    endName: "Mana Overload",
    criterion: "Champion with higher intelligence at the end game round wins.",
  },
  {
    effect: "Nurture",
    color: "#66d98a",
    name: "Verdant Hollow",
    icon: "nurture",
    passive: "Nurture healing is 20% stronger.",
    endName: "Overgrowth",
    criterion: "Champion with the most speed at the end game round wins.",
  },
  {
    effect: "Bless",
    color: "#ffe16a",
    name: "Sun-Blessed Dais",
    icon: "bless",
    passive: "First bless gained each battle grants +20 flat stacks.",
    endName: "Radiant Decree",
    criterion: "Champion with more bless stacks at the end game round wins.",
  },
  {
    effect: "Hasten",
    color: "#72f0ff",
    name: "Quickglass Track",
    icon: "hasten",
    passive: "Hasten speed bonuses are 40% stronger.",
    endName: "Final Dash",
    criterion: "Champion with higher speed at the end game round wins.",
  },
  {
    effect: "Cleanse",
    color: "#d9fbff",
    name: "Purity Well",
    icon: "cleanse",
    passive: "Cleanse removes +1 additional negative stack.",
    endName: "Pure Reflection",
    criterion: "Champion with the highest resist at the end game round wins.",
  },
]

const width = 2400
const height = 2800
const marginX = 100
const cardW = 520
const cardH = 545
const gapX = 40
const gapY = 34
const gridTop = 338

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

function textBlock(text, x, y, maxChars, fontSize, lineHeight, fill, weight = 400) {
  return wrapText(text, maxChars)
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}">${esc(
          line
        )}</text>`
    )
    .join("\n")
}

function icon(type, x, y, color) {
  const common = `stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"`
  const glow = `filter="url(#softGlow)"`
  const fillSoft = `fill="${color}" opacity="0.18"`

  const icons = {
    poison: `
      <g ${glow}>
        <path d="M34 12 h36 l-7 24 v42 c0 19-14 34-29 34S5 97 5 78V36L-2 12h36" ${common}/>
        <path d="M17 68c14-12 33 11 47-1" ${common} opacity="0.75"/>
        <circle cx="23" cy="85" r="6" fill="${color}"/>
        <circle cx="50" cy="80" r="4" fill="${color}" opacity="0.8"/>
      </g>`,
    bleed: `
      <g ${glow}>
        <path d="M42 4C19 35 11 51 11 70c0 20 14 34 31 34s31-14 31-34C73 51 65 35 42 4z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M64 18l26 26M80 8l20 20-45 45-20-20z" ${common}/>
      </g>`,
    burn: `
      <g ${glow}>
        <path d="M50 106c24-10 34-31 22-54-5-10-13-17-14-33-17 11-20 25-16 39-11-6-16-16-17-27C4 55 11 92 50 106z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M48 98c11-10 15-22 7-34-8 8-12 18-7 34z" fill="${color}" opacity="0.75"/>
      </g>`,
    freeze: `
      <g ${glow}>
        <path d="M50 4v100M8 26l84 56M92 26L8 82M28 16l22 22 22-22M28 94l22-22 22 22" ${common}/>
        <circle cx="50" cy="54" r="11" fill="${color}" opacity="0.2"/>
      </g>`,
    slow: `
      <g ${glow}>
        <path d="M18 8h64M18 104h64M28 8c0 25 17 32 22 46-5 14-22 21-22 50M72 8c0 25-17 32-22 46 5 14 22 21 22 50" ${common}/>
        <path d="M38 35h24M38 78h24" ${common} opacity="0.7"/>
      </g>`,
    drown: `
      <g ${glow}>
        <path d="M7 72c13-18 27-18 40 0s27 18 46 0" ${common}/>
        <path d="M7 92c13-18 27-18 40 0s27 18 46 0" ${common} opacity="0.72"/>
        <path d="M49 7c-19 25-27 41-27 57 0 16 12 28 27 28s27-12 27-28C76 48 68 32 49 7z" ${fillSoft} stroke="${color}" stroke-width="7"/>
      </g>`,
    paralyze: `
      <g ${glow}>
        <path d="M58 5L18 60h32l-9 47 43-61H54z" fill="${color}" opacity="0.22" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M16 16l15 10M82 86l-15-10M89 28l-17 7M10 80l17-7" ${common} opacity="0.75"/>
      </g>`,
    doom: `
      <g ${glow}>
        <circle cx="52" cy="55" r="42" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <circle cx="70" cy="45" r="42" fill="#050505"/>
        <path d="M19 82c14 14 38 19 60 4" ${common} opacity="0.68"/>
      </g>`,
    shield: `
      <g ${glow}>
        <path d="M50 6l38 14v31c0 28-15 48-38 58-23-10-38-30-38-58V20z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M50 18v76M28 43h44" ${common} opacity="0.74"/>
      </g>`,
    strengthen: `
      <g ${glow}>
        <path d="M24 62h52v34H24zM30 43h40v19H30zM38 24h24v19H38z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M14 96h72M50 24V6" ${common}/>
      </g>`,
    focus: `
      <g ${glow}>
        <path d="M8 55c14-22 29-33 44-33s30 11 44 33c-14 22-29 33-44 33S22 77 8 55z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <circle cx="52" cy="55" r="18" ${common}/>
        <path d="M52 14v18M52 78v18M11 55h18M75 55h18" ${common} opacity="0.8"/>
      </g>`,
    empower: `
      <g ${glow}>
        <circle cx="50" cy="55" r="42" ${common}/>
        <path d="M50 13l23 42-23 42-23-42z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <circle cx="50" cy="55" r="8" fill="${color}"/>
      </g>`,
    nurture: `
      <g ${glow}>
        <path d="M18 91c47-1 72-31 73-77-45 4-76 28-73 77z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M24 86c18-24 36-42 62-65M43 65l-20-2M58 50l-2-21" ${common}/>
      </g>`,
    bless: `
      <g ${glow}>
        <circle cx="50" cy="55" r="24" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M50 4v20M50 86v20M0 55h20M80 55h20M15 20l14 14M71 76l14 14M85 20L71 34M29 76L15 90" ${common}/>
      </g>`,
    hasten: `
      <g ${glow}>
        <path d="M13 31h36M5 55h42M13 79h36" ${common} opacity="0.75"/>
        <path d="M48 16l43 39-43 39V70H25V40h23z" ${fillSoft} stroke="${color}" stroke-width="7"/>
      </g>`,
    cleanse: `
      <g ${glow}>
        <path d="M50 7C30 34 19 54 19 72c0 20 14 34 31 34s31-14 31-34C81 54 70 34 50 7z" ${fillSoft} stroke="${color}" stroke-width="7"/>
        <path d="M83 12v20M73 22h20M22 17v14M15 24h14" ${common}/>
      </g>`,
  }

  return `<g transform="translate(${x} ${y}) scale(0.82)">${icons[type]}</g>`
}

function card(map, index) {
  const col = index % 4
  const row = Math.floor(index / 4)
  const x = marginX + col * (cardW + gapX)
  const y = gridTop + row * (cardH + gapY)
  const chipW = Math.max(126, map.effect.length * 14 + 48)

  return `
    <g transform="translate(${x} ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="0" fill="url(#cardFill)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
      <rect x="0" y="0" width="${cardW}" height="6" fill="${map.color}" opacity="0.85"/>
      <circle cx="68" cy="78" r="55" fill="${map.color}" opacity="0.08"/>
      ${icon(map.icon, 27, 34, map.color)}
      <rect x="${cardW - chipW - 28}" y="34" width="${chipW}" height="36" fill="${map.color}" opacity="0.13" stroke="${map.color}" stroke-width="1.5"/>
      <text x="${cardW - chipW / 2 - 28}" y="58" text-anchor="middle" fill="${map.color}" font-size="18" font-weight="800" letter-spacing="3">${esc(map.effect.toUpperCase())}</text>
      ${textBlock(map.name.toUpperCase(), 142, 116, 20, 34, 39, "#ffffff", 800)}
      <line x1="28" y1="164" x2="${cardW - 28}" y2="164" stroke="rgba(255,255,255,0.17)" stroke-width="2"/>

      <text x="30" y="214" fill="${map.color}" font-size="20" font-weight="800" letter-spacing="3">PASSIVE EFFECT</text>
      ${textBlock(map.passive, 30, 252, 36, 25, 32, "rgba(255,255,255,0.84)", 500)}

      <text x="30" y="365" fill="${map.color}" font-size="20" font-weight="800" letter-spacing="3">END GAME</text>
      ${textBlock(map.endName, 30, 404, 28, 28, 34, "#ffffff", 800)}
      ${textBlock(map.criterion, 30, 462, 37, 24, 31, "rgba(255,255,255,0.82)", 500)}
    </g>
  `
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#121212"/>
      <stop offset="52%" stop-color="#050505"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#191919"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <radialGradient id="headerGlow" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="56%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      text { font-family: Georgia, "Times New Roman", serif; }
    </style>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#headerGlow)"/>
  <path d="M0 254 C520 205 820 330 1200 270 C1620 203 1940 246 2400 180" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="3"/>
  <path d="M0 267 C530 221 833 354 1212 290 C1630 225 1954 270 2400 205" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>

  <text x="${width / 2}" y="92" text-anchor="middle" fill="rgba(255,255,255,0.66)" font-size="26" font-weight="700" letter-spacing="13">DARK COIN ARENA</text>
  <text x="${width / 2}" y="178" text-anchor="middle" fill="#ffffff" font-size="78" font-weight="900" letter-spacing="10">BATTLE MAPS</text>
  <text x="${width / 2}" y="236" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="30" font-weight="500">Every fight rolls a battlefield with a passive boost and an end game judgment.</text>

  ${maps.map(card).join("\n")}

  <rect x="100" y="2668" width="2200" height="74" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="${width / 2}" y="2715" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-size="27" font-weight="700">
    Tie breakers: higher current health wins, then the lowest champion NFT assetId wins.
  </text>
</svg>
`

const outDir = path.join(process.cwd(), "public", "arena")
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, "arena-maps-infographic.svg")
const htmlPath = path.join(outDir, "arena-maps-infographic.html")
fs.writeFileSync(outPath, svg, "utf8")
fs.writeFileSync(
  htmlPath,
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Dark Coin Arena Battle Maps Infographic</title>
    <style>
      html,
      body {
        margin: 0;
        background: #000;
      }
      svg {
        display: block;
        width: ${width}px;
        height: ${height}px;
      }
    </style>
  </head>
  <body>
${svg}
  </body>
</html>
`,
  "utf8"
)
console.log(outPath)

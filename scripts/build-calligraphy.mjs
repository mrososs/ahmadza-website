import * as fontkit from 'fontkit'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const font = fontkit.openSync(resolve('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff'))
const color = '#eadbb8'

function word(value, center, baseline, scale) {
  const run = font.layout(value)
  const width = run.positions.reduce((sum, position) => sum + position.xAdvance, 0)
  let x = center - width * scale / 2
  return run.glyphs.map((glyph, index) => {
    const position = run.positions[index]
    const path = glyph.path.toSVG().replace(/^<path d="/, '').replace(/"\s*\/>$/, '')
    const result = `<path d="${path}" transform="translate(${(x + position.xOffset * scale).toFixed(2)} ${(baseline - position.yOffset * scale).toFixed(2)}) scale(${scale} ${-scale})"/>`
    x += position.xAdvance * scale
    return result
  }).join('')
}

const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 340" role="img" aria-labelledby="title"><title id="title">أحمد زايد</title>
<g fill="${color}">${word('أحمد', 490, 148, .105)}${word('زايد', 445, 265, .15)}</g>
<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
<path stroke-width="3" d="M94 222c74-8 112-52 132-100 8-19 19-35 34-42-19 39-15 82 11 99M830 75c-57 25-91 79-112 129-28 66-70 106-126 113"/>
<path stroke-width="2" d="M66 239c75-2 137-23 186-75M855 56c-54 19-98 61-125 114M212 281c131 35 315 41 475-12M242 291c128 31 283 34 391-1" opacity=".75"/>
<path stroke-width="2" d="M144 141c-16-7-22-24-15-37 6-12 21-15 29-5 9 13-2 28-12 20M773 231c17 4 28 19 25 33-3 15-19 21-28 12-10-11-1-28 10-22"/>
</g><g fill="${color}"><circle cx="212" cy="281" r="3"/><circle cx="687" cy="269" r="3"/><path d="M461 33l8 14-8 14-8-14zM461 306l6 10-6 10-6-10z"/></g></svg>`

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 170" role="img" aria-labelledby="title"><title id="title">أحمد زايد</title>
<g fill="${color}">${word('أحمد', 92, 71, .052)}${word('زايد', 88, 132, .067)}</g>
<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
<path stroke-width="1.8" d="M22 91c15-14 19-34 17-53 10 15 17 22 27 24M154 35c-17 14-23 34-20 54 4 25-8 44-29 61M22 139c35 18 97 21 137-4"/>
<path stroke-width="1" d="M16 95c13-5 22-14 29-27M164 30c-10 5-18 13-24 23M48 153c28 8 62 9 89 0" opacity=".8"/>
</g><g fill="${color}"><path d="M90 11l5 8-5 8-5-8z"/><circle cx="22" cy="139" r="2"/><circle cx="159" cy="135" r="2"/></g></svg>`

writeFileSync(resolve('public/ornaments/ahmad-zayed-hero.svg'), hero)
writeFileSync(resolve('public/ornaments/ahmad-zayed-logo.svg'), logo)

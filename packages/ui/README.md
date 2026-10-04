# @hackyeah/ui: the jungle pixel kit

Everything you see in Climbing Monkey is drawn with plain React Native `View`s. There are no images, SVG or font files, so the same code renders on Android, iOS and the web.

## How the pixel art works

1. **Pictures are text.** A sprite is a list of strings, one character per pixel. `.` is transparent, every other character is a palette key. See `src/pixel/sprites.ts`; the monkey and the icons are readable right in the source.
2. **Rectangles, not pixels.** `gridToRects` in `src/pixel/raster.ts` merges same-colour pixels into runs along each row, then stacks identical runs from row to row. `PixelArt` draws one absolutely positioned `View` per rectangle. A 12x12 icon is usually 10 to 20 Views.
3. **Code-drawn pictures** use `PixelCanvas` (lines, rectangles, polygons). The jungle scene (`src/pixel/scene.ts`) and the charts (`src/pixel/charts.ts`) are generated this way, so they fit any screen width.
4. **Text** uses a 5x7 bitmap font in `src/pixel/font.ts`. `PixelText` renders it and passes the plain string to screen readers through `accessibilityLabel`. Body copy stays in the system font for readability.

## Components

| Component | What it is |
|---|---|
| `Panel` | The main container: a sign with stepped pixel corners, a hard shadow and an optional wooden title tab. Variants: `sign`, `banana` (focus), `wood`, `quiet` (symptom screens), `alert`. |
| `Button`, `Chip`, `IconButton` | Chunky keys that sink onto their shadow when pressed. `IconButton` is a small icon-only key (the music toggle) with a 44 px touch target. |
| `Toggle` | An on/off settings switch with ON or OFF written on it (the sound effects switch in Settings). Screen readers hear a switch with its name and state. |
| `PixelBox` | The stepped-corner rectangle all of the above are built from. |
| `PixelText`, `Icon`, `PixelArt` | Bitmap text, 12x12 icons, any sprite. |
| `Meter`, `Pips`, `Tag` | Segmented XP bar, one square per logged climb, small state stamps such as EXAMPLE or PAUSED. |
| `TerrainTriangle`, `MovementRadar` | The profile charts, rasterised as pixel art. Unknown values stay dashed and are never drawn as zero. |
| `Monkey`, `Gazelle`, `JungleHero` | The pets and the jungle scene at the top of the profile. Animation moves in whole pixel steps and stops when the OS asks for reduced motion. |
| `Screen`, `TabBar` | Page shell and the wooden tab bar. |

## Sounds

`Button`, `Chip`, `IconButton`, `Toggle`, `CheckRow`, the tab bar, the rail and the breadcrumbs ask for a soft `tap` when pressed (a chip being chosen asks for a brighter `select`), and `SpeechBubble` asks for a quiet `typing` murmur about every second letter as a line types out (none on spaces or punctuation, none when the line is skipped or with reduced motion). The kit only asks: the app provides the player through `UiSoundContext` (`packages/app/src/sfx.tsx`). Without a provider the kit is silent, so tests and platforms without sound need nothing.

## Colours

`theme.ts` has a day palette (sunny canopy, cream signs) and a night palette (dark moss signs, cream text), picked from the OS setting. Components read text colours from `ToneContext`, so text stays readable on banana, wood or the green background without passing colours around.

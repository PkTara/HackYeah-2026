# @hackyeah/ui: the jungle pixel kit

Everything you see in Climbing Monkey is drawn with plain React Native `View`s. There are no images, SVG or font files, so the same code renders on Android, iOS and the web.

## How the pixel art works

1. **Pictures are text.** A sprite is a list of strings, one character per pixel. `.` is transparent, every other character is a palette key. See `src/pixel/sprites.ts`; the monkey and the icons are readable right in the source.
2. **Rectangles, not pixels.** `gridToRects` in `src/pixel/raster.ts` merges same-colour pixels into runs along each row, then stacks identical runs from row to row. `PixelArt` draws one absolutely positioned `View` per rectangle. A 12x12 icon is usually 10 to 20 Views.
3. **Code-drawn pictures** use `PixelCanvas` (lines, rectangles, polygons). The jungle, savanna and ocean scenes (`src/pixel/scene.ts`, `savanna.ts`, `ocean.ts`) and the charts (`src/pixel/charts.ts`) are generated this way, so they fit any screen width.
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
| `TerrainTriangle`, `RateTriangle`, `MovementRadar` | The profile charts, rasterised as pixel art. Unknown values stay dashed and are never drawn as zero. `RateTriangle` is the generic three-corner chart: the monkey's walls, the gazelle's run types and the dolphin's strokes all use it. |
| `Monkey`, `Gazelle`, `Dolphin`, `JungleHero`, `SportHero` | The pets and the scenes at the top of each profile: the monkey climbs one hold up the trunk per quest; in `SportHero` the gazelle runs to the next marker post (`src/pixel/savanna.ts`) and the dolphin swims to the next buoy (`src/pixel/ocean.ts`). The gazelle and dolphin share `FramePet` (two frames, a bob, a leap on XP). Animation moves in whole pixel steps and stops when the OS asks for reduced motion. |
| `MonkeyGuide`, `SpeechBubble` | The setup guide: the monkey hangs from a vine holding a prop for the current question (`MONKEY_PROPS` in `src/pixel/sprites.ts`) and talks through a bubble that types out. |
| `FingerMap`, `CheckRow`, `HandAnatomy`, `LayerSlider` | The finger close-up with tappable spots, a checkbox row, and the layered hand anatomy viewer with its layer slider. |
| `Screen`, `TabBar`, `NavRail`, `Breadcrumbs` | Page shell, the wooden tab bar on phones, the side rail on wide screens, and the trail back from a pushed page. |

## Sounds

`Button`, `Chip`, `IconButton`, `Toggle`, `CheckRow`, the tab bar, the rail and the breadcrumbs ask for a soft `tap` when pressed (a chip being chosen asks for a brighter `select`), and `SpeechBubble` asks for a quiet `typing` murmur about every second letter as a line types out (none on spaces or punctuation, none when the line is skipped or with reduced motion). The kit only asks: the app provides the player through `UiSoundContext` (`packages/app/src/sfx.tsx`). Without a provider the kit is silent, so tests and platforms without sound need nothing.

## Colours

`theme.ts` has a day palette (sunny canopy, cream signs) and a night palette (dark moss signs, cream text), picked from the OS setting. Gazelle mode swaps the jungle for a savanna palette (dry earth, golden grass, sunset orange) and dolphin mode for an ocean palette (deep water, coral, dock-wood blue) by setting `WorldContext` to `'savanna'` or `'ocean'`; every component reads colours through `useTheme()`, so nothing else changes. Components read text colours from `ToneContext`, so text stays readable on banana, wood or the green background without passing colours around.

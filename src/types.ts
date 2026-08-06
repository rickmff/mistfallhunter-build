export type ShapeId = 'bar' | 'tri' | 'sq' | 'hex'

export type RawShape = ShapeId | 'circ'

export type AffixCategory = 'offense' | 'defense' | 'utility'

export type SlotId =
  | 'weapon'
  | 'helm'
  | 'chest'
  | 'gloves'
  | 'pants'
  | 'boots'
  | 'amulet'
  | 'ring'

export type WineTierId = 'none' | 'tonic' | 'ale' | 'blood' | 'brew'

export type GemMaterial = 'Agate' | 'Onyx' | 'Amethyst' | 'Moonstone' | 'Peridot'

export type BuildMode = 'full' | 'min'

export interface ClassDef {
  id: string
  name: string
  role: string
}

export interface Listing {
  price: number
  qty: number
  preset: string | null
  shapes: RawShape[]
}

export interface SlotDef {
  id: SlotId
  name: string
  sockets: number
  base: string
  listings: Listing[]
  presetPool?: string[]
}

export interface AffixDef {
  id: string
  name: string
  cat: AffixCategory
  threshold: number | null
  desc: string
}

export interface WineTierDef {
  id: WineTierId
  name: string
  points: number
  maxPerAffix: number
  cost: string
}

export interface GemDef {
  name: string
  mat: GemMaterial
  shape: ShapeId
  price: number
  qty: number
  affix: string
}

export interface GameDb {
  thresholdLevel: number
  maxGemLevel: number
  maxTarget: number
  maxPresetsPerPiece: number
  maxPresetPerAffix: number
  wineMaxLevel: number
  classes: ClassDef[]
  slots: SlotDef[]
  affixes: AffixDef[]
  wineTiers: WineTierDef[]
}

export interface ShapeDef {
  label: string
  color: string
  path: string
}

export interface BuildPick {
  id: string
  lvl: number
}

export interface WineState {
  tier: WineTierId
  points: Record<string, number>
}

export interface BuildState {
  cls: string
  picks: BuildPick[]
  wine: WineState
  mode: BuildMode
}

export type BlockReason = 'capacity' | 'unknown' | 'shape' | null

export interface GemBuy {
  name: string | null
  mat: GemMaterial | null
  shape: ShapeId | null
  unit: number | null
  qty: number
  sub: number
}

export interface AffixResult {
  id: string
  name: string
  cat: AffixCategory
  priority: number
  wineOnly: boolean
  target: number
  threshold: number | null
  wineBonus: number
  avail: number
  demand: number
  socketsNeeded: number
  presetPts: number
  socketsUsed: number
  gemLevels: number
  achieved: number
  short: number
  reached: boolean
  blockedBy: BlockReason
  shapeBlocked: boolean
  gemBuys: GemBuy[]
  gemPts: number
  gemName: string | null
  gemMat: GemMaterial | null
  gemUnit: number | null
  gemSub: number
}

export interface OpenSocket {
  i: number
  shape: ShapeId | null
  used: boolean
}

export interface PlacedGem {
  affix: string
  cat: AffixCategory
  level: number
  socket: number
}

export interface PieceOption {
  id: SlotId
  name: string
  base: string
  sockets: number
  preset: string | null
  gemSockets: number
  price: number
  qty: number
  shapes: (ShapeId | null)[]
  rawPrice: number
  premium: number
  shapeExtra: number
  hypothetical?: boolean
  _sup?: number[]
  _ai?: number
}

export interface BoughtPiece extends PieceOption {
  free: number
  gems: PlacedGem[]
  openSockets: OpenSocket[]
  presetUseful: boolean
  presetGross: number | null
  presetSaving: number | null
}

export interface PresetCeiling {
  slot: SlotId
  name: string
  max: number
}

export interface PresetHuntEntry {
  id: string
  name: string
  cat: AffixCategory
  openPts: number
  unit: number | null
  gemName: string | null
  potential: number | null
  ceilings: PresetCeiling[]
}

export interface Plan {
  results: AffixResult[]
  chosen: BoughtPiece[]
  boughtPieces: BoughtPiece[]
  usedPieces: BoughtPiece[]
  MGL: number
  mode: BuildMode
  D: number
  totalSocketsAll: number
  presetUsed: number
  presetSavings: number
  presetGross: number
  presetSavingUnknown: number
  presetSlotsFree: number
  presetHunt: PresetHuntEntry[]
  unidentified: number
  catalogSize: number
  toHunt: BoughtPiece[]
  feasibleSockets: boolean
  feasible: boolean
  shapeBlocked: AffixResult[]
  unknownSockets: number
  knownCost: number
  baseCost: number
  premiumCost: number
  shapeExtraCost: number
  gemsCost: number
  gemUnknown: number
  gemCount: number
  grandTotal: number
  distinctActive: number
}

export interface Verdict {
  ok: boolean | null
  color: 'info' | 'success' | 'warning'
  label: string
  text: string
}

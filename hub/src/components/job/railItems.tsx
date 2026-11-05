import {
  Briefcase, Calculator, Camera, CalendarDays, CircleDollarSign, Clock, FileText, Folder, LayoutList, ListChecks, MapPin, Phone, Pin, Receipt, StickyNote, Star, Target, Users, Wallet,
} from 'lucide-react'
import { BOXES, boxDef, type BoxId, type RailIcon, type RailItem } from '../../lib/jobLayout'

/** The small icon set a rail item can pick from. */
export const RAIL_ICON_COMPONENTS: Record<RailIcon, typeof FileText> = {
  list: LayoutList,
  quote: Receipt,
  people: Users,
  file: FileText,
  money: Wallet,
  pin: Pin,
  note: StickyNote,
  tasks: ListChecks,
  calendar: CalendarDays,
  map: MapPin,
  star: Star,
  clock: Clock,
}

export const RAIL_ICON_LABEL: Record<RailIcon, string> = {
  list: 'List', quote: 'Quote', people: 'People', file: 'File', money: 'Money', pin: 'Pin', note: 'Note', tasks: 'Tasks', calendar: 'Calendar', map: 'Map', star: 'Star', clock: 'Clock',
}

/** The icon a box gets when the rail item has no icon of its own. */
const BOX_ICON: Partial<Record<BoxId, typeof FileText>> = {
  job: Briefcase, contact: Users, company: Briefcase, notes: StickyNote, tasks: ListChecks, history: LayoutList, milestones: Target,
  quotes: Receipt, people: Users, documents: FileText, photos: Camera, invoices: Wallet, payments: CircleDollarSign, costing: Calculator, pinned: Pin,
  next: Target, money: CircleDollarSign, otherJobs: Briefcase, siteAccess: MapPin, recentFiles: Folder, map: MapPin, visits: CalendarDays,
  quotePreview: Receipt, inspection: FileText, calculator: Calculator, addNote: StickyNote, addTask: ListChecks, calls: Phone, stage: Target,
}

export const iconFor = (item: RailItem) => (item.icon ? RAIL_ICON_COMPONENTS[item.icon] : item.kind === 'all' ? LayoutList : (item.box && BOX_ICON[item.box]) || Folder)

export const itemLabel = (item: RailItem) => item.label?.trim() || (item.kind === 'all' ? 'All sections' : item.box ? boxDef(item.box).label : '')

/**
 * The rail when nobody has customised it: All, one item per visible right-panel box, then jumps to Notes and Tasks
 * (kept in the middle panel by default). `rightBoxes` are the visible right-panel box ids in order.
 */
export function autoRailItems(rightBoxes: BoxId[]): RailItem[] {
  return [
    { id: 'all', kind: 'all' },
    { id: 'd1', kind: 'divider' },
    ...rightBoxes.map((b) => ({ id: `b-${b}`, kind: 'box' as const, box: b })),
    { id: 'd2', kind: 'divider' },
    { id: 'b-notes', kind: 'box', box: 'notes', label: 'Notes' },
    { id: 'b-tasks', kind: 'box', box: 'tasks', label: 'Tasks' },
  ]
}

export const BOX_CHOICES = BOXES.map((b) => ({ id: b.id, label: b.label }))

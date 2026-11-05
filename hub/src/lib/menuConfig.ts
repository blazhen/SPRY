import { href } from './router'

/**
 * The top menu (Round 9): which items sit in the bar, which sit inside More, which are hidden, and in what order.
 * Saved with the rest of the layout (lib/jobLayout.ts, field `menu`), edited in Edit layout, section "Menu".
 * Absent = the default below. A saved menu is always a full split of the items, so a new item added later
 * lands inside More instead of vanishing.
 */
export type MenuId = 'todo' | 'jobs' | 'quotes' | 'invoices' | 'contacts' | 'week' | 'calendar' | 'templates' | 'terms' | 'prices' | 'foam' | 'settings'

export interface MenuItemDef {
  id: MenuId
  label: string
  /** Shorter name for narrow bars (This week is Week under 1024 px). */
  short?: string
  to: string
}

export const MENU_ITEMS: MenuItemDef[] = [
  { id: 'todo', label: 'To do', to: href.todo() },
  { id: 'jobs', label: 'Jobs', to: href.jobs() },
  { id: 'quotes', label: 'Quotes', to: href.quotes() },
  { id: 'invoices', label: 'Invoices', to: href.invoices() },
  { id: 'contacts', label: 'Contacts', to: href.contacts() },
  { id: 'week', label: 'This week', short: 'Week', to: href.week() },
  { id: 'calendar', label: 'Calendar', to: href.calendar() },
  { id: 'templates', label: 'Templates', to: href.templates() },
  { id: 'terms', label: 'Terms', to: href.terms() },
  { id: 'prices', label: 'Price list', to: href.prices() },
  { id: 'foam', label: 'Foam prices', to: href.foam() },
  { id: 'settings', label: 'Settings', to: href.settings() },
]

/** Settings can never be hidden: it is the only way back to the switches. */
export const MENU_LOCKED: MenuId = 'settings'

export type MenuPlace = 'top' | 'more' | 'hidden'

export interface MenuConfig {
  top: MenuId[]
  more: MenuId[]
  hidden: MenuId[]
}

export const menuDef = (id: MenuId): MenuItemDef => MENU_ITEMS.find((m) => m.id === id) as MenuItemDef
export const PLACE_LABEL: Record<MenuPlace, string> = { top: 'Top menu', more: 'Inside More', hidden: 'Hidden' }

export function defaultMenu(): MenuConfig {
  return {
    top: ['todo', 'jobs', 'contacts', 'week'],
    more: ['calendar', 'quotes', 'invoices', 'templates', 'terms', 'prices', 'foam', 'settings'],
    hidden: [],
  }
}

const isId = (x: unknown): x is MenuId => MENU_ITEMS.some((m) => m.id === x)

/** Repair anything odd: unknown ids dropped, repeats dropped, missing items go to More, Settings never hidden. */
export function sanitizeMenu(raw: unknown): MenuConfig {
  if (!raw || typeof raw !== 'object') return defaultMenu()
  const r = raw as Partial<Record<MenuPlace, unknown>>
  const seen = new Set<MenuId>()
  const take = (list: unknown): MenuId[] => {
    if (!Array.isArray(list)) return []
    const out: MenuId[] = []
    for (const x of list) {
      if (isId(x) && !seen.has(x)) {
        seen.add(x)
        out.push(x)
      }
    }
    return out
  }
  const top = take(r.top)
  const more = take(r.more)
  const hidden = take(r.hidden).filter((id) => id !== MENU_LOCKED)
  for (const m of MENU_ITEMS) if (!seen.has(m.id) || (m.id === MENU_LOCKED && !top.includes(m.id) && !more.includes(m.id))) more.push(m.id)
  return { top, more, hidden }
}

export const isDefaultMenu = (m: MenuConfig | undefined): boolean => !m || JSON.stringify(m) === JSON.stringify(defaultMenu())

export const placeOf = (m: MenuConfig, id: MenuId): MenuPlace => (m.top.includes(id) ? 'top' : m.hidden.includes(id) ? 'hidden' : 'more')

/** Move one item one step up or down inside its list. Returns the same object when it cannot move. */
export function moveInMenu(m: MenuConfig, id: MenuId, dir: -1 | 1): MenuConfig {
  const place = placeOf(m, id)
  const list = [...m[place]]
  const i = list.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return m
  ;[list[i], list[j]] = [list[j], list[i]]
  return { ...m, [place]: list }
}

/** Put an item at the end of another list. Settings cannot go to Hidden. */
export function moveToPlace(m: MenuConfig, id: MenuId, place: MenuPlace): MenuConfig {
  if (place === 'hidden' && id === MENU_LOCKED) return m
  if (placeOf(m, id) === place) return m
  return {
    top: m.top.filter((x) => x !== id),
    more: m.more.filter((x) => x !== id),
    hidden: m.hidden.filter((x) => x !== id),
    [place]: [...m[place].filter((x) => x !== id), id],
  } as MenuConfig
}

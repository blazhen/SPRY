import { ArrowDown, ArrowUp, EyeOff, Eye } from 'lucide-react'
import { MENU_LOCKED, PLACE_LABEL, defaultMenu, isDefaultMenu, menuDef, moveInMenu, moveToPlace, type MenuConfig, type MenuId, type MenuPlace } from '../../lib/menuConfig'

const PLACES: MenuPlace[] = ['top', 'more', 'hidden']

/**
 * The Menu section of Edit layout: which items are in the top bar, which are inside More, which are hidden, and their order.
 * Works on the layout draft like the boxes and the rail (Done saves, Cancel throws away, Undo and Reset cover it).
 * Settings cannot be hidden. On a phone the bottom bar keeps its five tabs; this menu decides what its More lists.
 */
export function MenuEditor({ menu, onChange }: { menu: MenuConfig; onChange: (m: MenuConfig, message: string) => void }) {
  const label = (id: MenuId) => menuDef(id).label
  const go = (id: MenuId, place: MenuPlace) => {
    const next = moveToPlace(menu, id, place)
    if (next !== menu) onChange(next, `${label(id)} moved to: ${PLACE_LABEL[place]}`)
  }
  const step = (id: MenuId, dir: -1 | 1) => {
    const next = moveInMenu(menu, id, dir)
    if (next !== menu) onChange(next, `${label(id)} moved ${dir === -1 ? 'up' : 'down'}`)
  }
  return (
    <section className="le-rail le-menu" aria-label="Menu" data-le-menu>
      <h3 className="le-panel-h">Menu (the top bar)</h3>
      <p className="le-hint">Choose what sits in the top bar, what sits inside More, and what you do not want at all. Settings always stays.</p>
      <div className="le-menu-grid">
        {PLACES.map((place) => (
          <div key={place} className="le-menu-col" data-le-menu-place={place}>
            <h4 className="le-tray-h">{PLACE_LABEL[place]}</h4>
            {menu[place].length === 0 ? (
              <p className="le-hint">{place === 'hidden' ? 'Nothing hidden.' : 'Nothing here.'}</p>
            ) : (
              <ol className="le-rail-list">
                {menu[place].map((id, i) => (
                  <li key={id} className="le-rail-row" data-le-menu-item={id}>
                    <span className="le-rail-name">{label(id)}</span>
                    <button type="button" className="le-btn" aria-label={`Move ${label(id)} up`} title="Move up" disabled={i === 0} onClick={() => step(id, -1)}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="le-btn" aria-label={`Move ${label(id)} down`} title="Move down" disabled={i === menu[place].length - 1} onClick={() => step(id, 1)}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    {PLACES.filter((p) => p !== place && !(p === 'hidden' && id === MENU_LOCKED)).map((p) => (
                      <button key={p} type="button" className="btn btn-neutral btn-sm" data-le-menu-move={`${id}:${p}`} onClick={() => go(id, p)}>
                        {p === 'hidden' ? <EyeOff size={16} aria-hidden="true" /> : place === 'hidden' ? <Eye size={16} aria-hidden="true" /> : null}
                        {p === 'top' ? 'To top bar' : p === 'more' ? 'To More' : 'Hide'}
                        <span className="sr-only"> {label(id)}</span>
                      </button>
                    ))}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-neutral btn-sm" data-le-menu-reset disabled={isDefaultMenu(menu)} onClick={() => onChange(defaultMenu(),'Menu reset to the default')}>
        Reset the menu
      </button>
    </section>
  )
}

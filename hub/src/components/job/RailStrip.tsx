import { LayoutGrid } from 'lucide-react'
import { go, href, useRoute } from '../../lib/router'
import { useJobLayout } from '../../lib/jobLayout'
import { setEditingLayout } from '../../lib/layoutEdit'
import { usePaneState } from './JobSide'
import { autoRailItems, iconFor, itemLabel } from './railItems'

/**
 * The slim icon rail of the job page (wide screens), part of the fixed frame. What is in it, in what order, with which
 * names and icons, and where it sits (right, left, or hidden) is chosen in Edit layout and saved with the layout. By
 * default: All, one item per right-panel box, then Notes and Tasks. Every item is a focus view of the whole workspace
 * (toggle, aria-pressed): the middle panel shows that box and its composer, the left panel stays. All is the normal page. Each item shows its name on
 * hover and keyboard focus, or beside the icon when "icons and names" is chosen. The last button is always Edit layout.
 */
export function RailStrip() {
  const { sections } = usePaneState()
  const route = useRoute()
  const jobId = route.name === 'job' ? route.id : ''
  // The open focus view (or the box a quote or invoice workspace belongs to) is the pressed item.
  const current = route.name === 'job' ? (route.work ? (route.work.kind === 'quote' ? 'quotes' : 'invoices') : route.view) : undefined
  const cfg = useJobLayout()
  const rail = cfg.rail
  const items = (rail.items ?? autoRailItems(sections)).filter((i) => i.kind !== 'box' || (i.box && cfg.boxes.some((b) => b.id === i.box && !b.hidden)))

  // Dividers at the ends or doubled up are dropped so the rail never starts or ends with a line.
  const clean = items.filter((it, i) => it.kind !== 'divider' || (i > 0 && i < items.length - 1 && items[i - 1].kind !== 'divider'))

  return (
    <nav className="jf-rail no-print" data-names={rail.names ? '' : undefined} aria-label="Right pane: choose what to show">
      {clean.map((it) => {
        if (it.kind === 'divider') return <span key={it.id} className="jf-rail-sep" aria-hidden="true" />
        const Icon = iconFor(it)
        const name = itemLabel(it)
        const tip = (
          <span className="jf-rail-tip" aria-hidden={rail.names ? undefined : true}>
            {name}
          </span>
        )
        if (it.kind === 'all') {
          return (
            <button key={it.id} type="button" className="jf-rail-btn" data-rail="all" aria-pressed={!current} aria-label={name} onClick={() => go(href.job(jobId))}>
              <Icon size={22} aria-hidden="true" />
              {tip}
            </button>
          )
        }
        const box = it.box as NonNullable<typeof it.box>
        return (
          <button key={it.id} type="button" className="jf-rail-btn" data-rail={box} aria-pressed={current === box} aria-label={name} onClick={() => go(current === box ? href.job(jobId) : href.jobView(jobId, box))}>
            <Icon size={22} aria-hidden="true" />
            {tip}
          </button>
        )
      })}
      <span className="jf-rail-sep" aria-hidden="true" />
      <button type="button" className="jf-rail-btn" data-rail-edit aria-label="Edit layout" onClick={() => setEditingLayout(true)}>
        <LayoutGrid size={22} aria-hidden="true" />
        <span className="jf-rail-tip" aria-hidden={rail.names ? undefined : true}>
          Edit layout
        </span>
      </button>
    </nav>
  )
}

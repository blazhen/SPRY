import { chaseDaysOf, foamOf, isExtraOn, leadSourcesOf, lostReasonsOf, type ExtraKey } from './extras'
import { useStore } from './store'

/** Is this extra showing? Only with its switch on (Settings, Extras). */
export function useExtra(key: ExtraKey): boolean {
  const s = useStore()
  return isExtraOn(s.settings.extras, key)
}

/** The extras settings with the defaults filled in. */
export function useExtraSettings() {
  const s = useStore()
  const x = s.settings.extras
  return { chaseDays: chaseDaysOf(x), foam: foamOf(x), lostReasons: lostReasonsOf(x), leadSources: leadSourcesOf(x), raw: x }
}

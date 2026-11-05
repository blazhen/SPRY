import type { Mode } from './ContactComposerSection'

/** Anything on the contact page can ask the composer in the middle panel to open a tab and take focus: composeOnContact('task'). */
export const CONTACT_COMPOSE = 'contact-compose'
export function composeOnContact(mode: Mode): void {
  window.dispatchEvent(new CustomEvent(CONTACT_COMPOSE, { detail: mode }))
}

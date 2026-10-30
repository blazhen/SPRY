// Starting notes and extra contact details. All made up. Dates are relative to today.
import { addDaysISO, todayISO } from '../lib/format'
import type { ContactExtra, Note } from '../types'

export function seedNotes(): Note[] {
  const today = todayISO()
  const out: Note[] = []
  let n = 0
  const add = (kind: Note['kind'], targetId: string, author: string, daysAgo: number, hhmm: string, text: string, pinned = false) => {
    n++
    out.push({ id: `n${n}`, kind, targetId, author, at: `${addDaysISO(today, -daysAgo)}T${hhmm}:00`, text, pinned })
  }
  // Notes belong to a person (the CRM keeps notes on a contact only, never on a job).
  // A note about a job starts with [Job name], so the job page can tag it "About this job".
  const JOB: Record<string, { name: string; contact: string }> = {
    j1: { name: 'Bupa aged care installation', contact: 'c1' },
    j2: { name: 'Whitfield new build, Lot 14', contact: 'c4' },
    j3: { name: 'Carter shed insulation', contact: 'c6' },
    j5: { name: 'Harper extension', contact: 'c5' },
    j6: { name: 'Ng warehouse', contact: 'c2' },
    j7: { name: 'Bell garage conversion', contact: 'c7' },
    j8: { name: 'Okafor extension, Narre Warren', contact: 'c8' },
    j9: { name: 'Lee warehouse retrofit', contact: 'c9' },
    j11: { name: 'Dutta home extension', contact: 'c11' },
  }
  const addJob = (jobId: string, author: string, daysAgo: number, hhmm: string, text: string, pinned = false, contactId?: string) =>
    add('contact', contactId ?? JOB[jobId].contact, author, daysAgo, hhmm, `[${JOB[jobId].name}] ${text}`, pinned)
  // Jobs
  addJob('j1', 'Glenn', 28, '15:10', 'Site visit done. Roof is sheet metal, about 420 square metres. Walls are brick veneer.')
  addJob('j1', 'Office', 20, '09:20', 'Photos from the visit are in the shared folder.')
  addJob('j1', 'Glenn', 12, '11:40', 'Travis wants the ceiling price lifted a little. New version to follow.')
  addJob('j1', 'Glenn', 3, '08:15', 'Owners are asking for the new quote. Aim to send it this week.', true)
  addJob('j1', 'Glenn', 10, '14:20', 'Harper will do the roof access check on the day.', false, 'c5')
  addJob('j1', 'Office', 6, '09:05', 'Whitfield may build the new wing next year, keep them in the loop.', false, 'c4')
  addJob('j2', 'Glenn', 8, '10:30', 'Wall frames are not finished. Dana will confirm the date.')
  addJob('j2', 'Office', 2, '14:05', 'Dana rang to ask about the Lot 14 price. Told her it is coming.')
  addJob('j3', 'Glenn', 4, '13:00', 'Shed has lined walls, so InjectaCore fill is the right choice.')
  addJob('j5', 'Glenn', 4, '10:05', 'Quote sent. Priya said she would look that evening.')
  addJob('j5', 'Office', 1, '16:30', 'No reply yet. Follow up tomorrow.')
  addJob('j6', 'Glenn', 22, '16:15', 'Lachlan said yes on the phone. Install on the 20th or later.')
  addJob('j6', 'Glenn', 9, '09:10', 'Foam ordered. Delivery is booked for the day before the install.')
  addJob('j7', 'Glenn', 3, '12:00', 'Marcus has a dog in the yard. Ring the bell and wait.')
  addJob('j8', 'Glenn', 25, '09:30', 'Hannah also asked her builder for a quote. Ours is the cheaper one.')
  addJob('j8', 'Glenn', 10, '16:45', 'Rang Hannah, no answer. Left a message.', true)
  addJob('j9', 'Office', 9, '12:30', 'Ben is happy. Ask for a review.')
  addJob('j11', 'Office', 5, '10:25', 'Sam said he will pay the deposit this week.')
  // Contacts
  add('contact', 'c1', 'Glenn', 30, '09:20', 'First call. Looks after the Bupa site for Quadricon.')
  add('contact', 'c1', 'Glenn', 12, '11:35', 'Likes a text before a call. Works until 4pm.', true)
  add('contact', 'c1', 'Office', 3, '16:10', 'Texted asking for the new version of the quote.')
  add('contact', 'c2', 'Glenn', 60, '10:00', 'Repeat client. Always pays on time.', true)
  add('contact', 'c2', 'Glenn', 22, '16:00', 'Accepted the Ng warehouse quote.')
  add('contact', 'c4', 'Office', 8, '10:40', 'Builder at Whitfield Homes. Has several lots coming up.')
  add('contact', 'c5', 'Glenn', 4, '10:10', 'Prefers email. Best reached after 3pm.', true)
  add('contact', 'c5', 'Office', 1, '16:35', 'Left a voicemail about the quote.')
  add('contact', 'c8', 'Glenn', 10, '16:50', 'Did not answer. Try again in the evening.')
  add('contact', 'c11', 'Office', 5, '10:30', 'Works from home, any time is fine.')
  add('contact', 'c11', 'Glenn', 14, '09:40', 'Accepted the quote. Asked about the install date.')
  return out
}

const base: ContactExtra = {
  contactType: 'Lead',
  source: 'Referral',
  ownerId: 'glenn',
  tags: [],
  dnd: { sms: false, email: false, call: false },
  property: { type: 'Not noted', storeys: 'Not noted', roofType: 'Not noted', areaNote: 'Not noted' },
  consent: { marketing: true, sms: true, email: true },
  contactSince: '2026-09-01',
}

/** Extra details by contact id. A contact not listed gets sensible blanks. */
const extras: Record<string, Partial<ContactExtra>> = {
  c1: { contactType: 'Customer', source: 'Referral', tags: ['Commercial', 'Aged care'], property: { type: 'Aged care building', storeys: '2', roofType: 'Sheet metal', areaNote: 'About 420 m2 of roof' }, consent: { marketing: true, sms: true, email: true, givenOn: '2026-09-15' } },
  c2: { contactType: 'Customer', source: 'Repeat client', tags: ['Repeat', 'Commercial'], property: { type: 'Warehouse', storeys: '1', roofType: 'Sheet metal', areaNote: 'Large shed' } },
  c3: { contactType: 'Builder', source: 'Referral', tags: ['Builder'], property: { type: 'Shopfront', storeys: '1', roofType: 'Flat', areaNote: 'Small' } },
  c4: { contactType: 'Builder', source: 'Website', tags: ['Builder', 'New build'], property: { type: 'New build', storeys: '2', roofType: 'Tile', areaNote: 'Lot 14' } },
  c5: { contactType: 'Customer', source: 'Facebook', tags: ['Extension'], dnd: { sms: false, email: false, call: true } },
  c6: { source: 'Google', tags: ['Shed'], property: { type: 'Shed', storeys: '1', roofType: 'Sheet metal', areaNote: 'Lined walls' } },
  c7: { source: 'Google', tags: ['Garage'], property: { type: 'Garage conversion', storeys: '1', roofType: 'Tile', areaNote: 'Double garage' } },
  c8: { contactType: 'Customer', source: 'Referral', tags: ['Extension'], consent: { marketing: false, sms: true, email: true, givenOn: '2026-09-20' } },
  c9: { contactType: 'Customer', source: 'Repeat client', tags: ['Repeat', 'Commercial'], property: { type: 'Warehouse', storeys: '1', roofType: 'Sheet metal', areaNote: 'Retrofit' } },
  c10: { contactType: 'Lead', source: 'Facebook', tags: ['Lost'], dnd: { sms: true, email: false, call: false } },
  c11: { contactType: 'Customer', source: 'Website', tags: ['Extension'], property: { type: 'Home extension', storeys: '1', roofType: 'Tile', areaNote: 'Roof and walls' } },
}

export function extraFor(contactId: string): ContactExtra {
  const e = extras[contactId] ?? {}
  return { ...base, ...e, property: { ...base.property, ...e.property }, consent: { ...base.consent, ...e.consent }, dnd: { ...base.dnd, ...e.dnd } }
}

import { routes } from '@/data/routes'
import { photos, type SitePage } from '@/data/pages'
import type { GalleryArea } from '@/data/gallery'

/**
 * The three residential service pages.
 *
 * They live at the addresses the old WordPress site used for the same
 * services, so the rankings those pages hold carry straight across. Titles
 * and descriptions are the SEO agency's live ones for those addresses, word
 * for word. The H1 is the search phrase the live title targets.
 *
 * Everything said here is sourced: Glenn's own copy on the old service pages
 * (the 400mm subfloor clearance, open and closed cell for roofs, retrofitting
 * existing walls and roofs), the agency's residential outline (InjectaCore,
 * the assessment caveats), the gallery facts Glenn supplied (Benalla,
 * Cremorne), and claims already on this site (the share of heat lost by
 * surface, re-occupancy depending on the foam). Claims on the old pages that
 * the site has avoided since Glenn flagged them, such as percentage savings
 * and "twice as effective", are deliberately left out.
 *
 * The walls page is also the retrofit wall insulation page in the Service
 * Agreement: the old site's title for that address is already "Retrofit Wall
 * Insulation Melbourne", and InjectaCore is the product it introduces.
 */

export type ServiceId = 'underfloor' | 'roof' | 'walls'

export interface ServicePageData extends SitePage {
  id: ServiceId
  path: string
  /** The page's name in the breadcrumb trail and in "related" links. */
  crumb: string
  /** Which gallery jobs to show as proof. */
  galleryArea: GalleryArea
  cta: { heading: string; text: string }
}

export const servicePages: Record<ServiceId, ServicePageData> = {
  /* -------------------------------------------------------------- floors */
  underfloor: {
    id: 'underfloor',
    path: routes.underfloor,
    crumb: 'Underfloor Insulation',
    galleryArea: 'underfloor',
    seoTitle: 'Subfloor Insulation Melbourne | Underfloor Foam Insulation',
    seoDescription:
      'Keep your home warmer with expert underfloor spray insulation in Melbourne. Quality foam under floor insulation for lasting comfort. Contact us for a free quote!',
    intro: {
      eyebrow: 'Residential',
      headingLines: ['Underfloor & Subfloor', 'Insulation Melbourne'],
      accentWord: 'Melbourne',
      lede: 'A suspended timber floor sits above open, moving air. That is why the floor is cold in July, and why insulating the roof alone never quite fixes the room. We spray the underside of the floor from below, so the insulation bonds to the boards and joists and stays there for the life of the building.',
    },
    hero: photos.underfloor,
    sections: [
      {
        id: 'cold-floors',
        eyebrow: 'The problem',
        keyword: 'Why Underfloor Insulation Matters',
        heading: 'Why cold floors happen',
        accentWord: 'cold',
        blocks: [
          { p: 'Most older Melbourne homes sit on stumps or brick piers with a ventilated space underneath. The air in that space is outside air. In winter it chills the floorboards from below and finds its way up through every gap between them, which is where the draught across the floor comes from.' },
          { p: 'Turning the heating up does not fix it. Warm air rises, so the room heats from the ceiling down while the floor stays cold. Pre-1990 homes in Victoria usually have no insulation under the floor at all.' },
        ],
        tone: 'base',
      },
      {
        id: 'method',
        eyebrow: 'How it works',
        keyword: 'Underfloor Spray Foam Insulation',
        heading: 'Spray foam under the floor',
        accentWord: 'under',
        blocks: [
          { p: 'The foam is applied as a liquid to the underside of the floor, between the joists. It expands into the gaps between the boards and around pipes and wiring, then cures into one continuous layer bonded to the timber.' },
          { p: 'Because it seals as well as insulates, it stops air coming up between the boards as well as slowing the heat going down. That is usually the first difference people notice: the draught is gone.' },
          { p: 'Underfloor batts and foil are cut to fit and held up with supports, so they leave gaps at every joist and can drop over time. Bonded foam does not sag, slip or fall out of place.' },
        ],
        tone: 'surface',
      },
      {
        id: 'suitable',
        eyebrow: 'Before we start',
        keyword: 'Subfloor Insulation Requirements',
        heading: 'Is your home suitable?',
        accentWord: 'suitable?',
        blocks: [
          { p: 'We need to be able to get under the floor. As a guide, there should be at least 400mm of clear space beneath it, so the crew can reach every part safely. Spray foam underfloor insulation suits:' },
          {
            list: [
              'Suspended timber floors on stumps or piers',
              'Homes with floorboards over an accessible subfloor',
              'Renovations where the subfloor is already open',
              'Commercial buildings with a timber floor over a crawl space',
            ],
          },
          { p: 'We also look at subfloor ventilation, moisture and the services running under the floor before recommending a foam. A damp subfloor is investigated and the cause dealt with before anything is sprayed.' },
        ],
        tone: 'base',
      },
      {
        id: 'on-the-day',
        eyebrow: 'On the day',
        keyword: 'Subfloor Insulation Installation',
        heading: 'What to expect',
        accentWord: 'expect',
        blocks: [
          {
            list: [
              'We check access and clear a path for the hose to reach the subfloor.',
              'The underside of the floor is sprayed bay by bay, between the joists.',
              'The area is kept clear of people and pets while we spray.',
              'Most house floors are done in a day.',
            ],
          },
          { p: 'The space needs some time before it is used again. Depending on the foam, that is anywhere from about an hour to a full day, and the crew will tell you which applies before they leave.' },
        ],
        link: { label: 'See the before and after under a house in our gallery', href: routes.gallery },
        tone: 'surface',
      },
    ],
    cta: {
      heading: 'Warm floors, without pulling them up',
      text: 'Tell us about your home and the space under the floor, and we will come back with honest advice and a written quote.',
    },
  },

  /* ---------------------------------------------------------------- roof */
  roof: {
    id: 'roof',
    path: routes.roofCeiling,
    crumb: 'Roof & Ceiling Insulation',
    galleryArea: 'roof',
    seoTitle: 'Roof & Ceiling Insulation Australia | SprayIT Solutions',
    seoDescription:
      'Expert roof and ceiling insulation in Melbourne for homes and businesses. Enjoy better energy efficiency and year-round comfort. Call today for a free quote!',
    intro: {
      eyebrow: 'Residential',
      headingLines: ['Roof & Ceiling', 'Insulation Melbourne'],
      accentWord: 'Melbourne',
      lede: 'Heat rises, and the roof is where most homes lose the most of it. We spray open or closed cell foam to the underside of the roof or at ceiling level, following the shape of the roof rather than stopping where a cut piece of insulation runs out.',
    },
    hero: photos.roof,
    sections: [
      {
        id: 'biggest-loss',
        eyebrow: 'Why the roof',
        keyword: 'Why Roof Insulation Matters',
        heading: 'The biggest single loss in most homes',
        accentWord: 'biggest',
        blocks: [
          { p: 'In most homes around a third of the heating is lost through the roof. In summer the same roof lets heat in, which is why upstairs rooms and rooms under a skillion roof are the hardest to keep cool.' },
          { p: 'Batts laid on a ceiling leave gaps at every joist, downlight and corner, and they settle over time. Spray foam fills the space it is applied to and stays where it is put, for the life of the building.' },
        ],
        tone: 'base',
      },
      {
        id: 'approach',
        eyebrow: 'Where the foam goes',
        keyword: 'Roof and Ceiling Spray Foam Insulation',
        heading: 'Under the roof, or at the ceiling',
        accentWord: 'roof,',
        blocks: [
          { p: 'Depending on the building, the foam is applied to the underside of the roof itself or at ceiling level. The right approach depends on the roof construction, the existing insulation, ventilation and condensation control, so those are assessed before we recommend a product.' },
          { p: 'Spray foam can be applied to an existing roof or ceiling without major renovation, as long as we can reach it. When a roof is being replaced or opened up, the foam can go on while it is off. On a curved roof in Cremorne the sheeting came off one sheet at a time, the old insulation was removed and replaced with open cell foam.' },
          { p: 'We insulate around roof and ceiling penetrations while keeping the required clearances around downlights, flues and electrical equipment.' },
        ],
        tone: 'surface',
      },
      {
        id: 'product',
        eyebrow: 'Open or closed cell',
        keyword: 'Open Cell vs Closed Cell Roof Insulation',
        heading: 'Choosing the foam',
        accentWord: 'foam',
        blocks: [
          { p: 'Open cell foam expands a long way as it cures, so it fills deep roof spaces economically and lets vapour pass through. On a house roof in Benalla we applied 200mm of Icynene LDC-50 open cell foam behind the trusses.' },
          { p: 'Closed cell foam is denser. It gives the highest insulation value where the depth is limited, and it resists water and vapour. Some homes have one in the walls and the other under the roof.' },
        ],
        link: { label: 'Open cell against closed cell, in full', href: routes.sprayFoam },
        tone: 'base',
      },
      {
        id: 'condensation',
        eyebrow: 'Condensation',
        keyword: 'Roof Condensation Control',
        heading: 'A drier roof as well as a warmer one',
        accentWord: 'drier',
        blocks: [
          { p: 'A roof that is cold on the underside collects condensation, and condensation leads to damp, mould and corrosion. Sealing and insulating the underside keeps it closer to the temperature of the room below.' },
          { p: 'Where condensation is already a problem, the cause is checked first. Foam is not a fix for an active leak or for a roof space with no ventilation where it needs some.' },
        ],
        tone: 'surface',
      },
    ],
    cta: {
      heading: 'Keep the heat where you paid for it',
      text: 'Tell us how your roof is built and how the house feels, and we will come back with honest advice and a written quote.',
    },
  },

  /* --------------------------------------------------------------- walls */
  walls: {
    id: 'walls',
    path: routes.walls,
    crumb: 'Wall & Retrofit Insulation',
    galleryArea: 'walls',
    seoTitle: 'Retrofit Wall Insulation Melbourne | Spray Foam Wall Insulation',
    seoDescription:
      'Upgrade existing walls with spray foam wall insulation in Melbourne. Expert retrofit wall insulation & wall injection insulation. Get a free quote today!',
    intro: {
      eyebrow: 'Residential',
      headingLines: ['Retrofit Wall', 'Insulation Melbourne'],
      accentWord: 'Melbourne',
      lede: 'Insulating the walls of a home that is already built is the job most people assume is impossible. It is not. Existing wall cavities can be filled through small access points without removing the linings, and open walls in a renovation or a new build are sprayed before they are lined.',
    },
    hero: photos.walls,
    sections: [
      {
        id: 'two-ways',
        eyebrow: 'The options',
        keyword: 'Wall Injection and Spray Foam Wall Insulation',
        heading: 'Two ways to insulate a wall',
        accentWord: 'Two',
        blocks: [
          {
            terms: [
              ['Existing walls, InjectaCore', 'For suitable existing wall cavities, we install InjectaCore, a specialist injection-foam insulation system. It goes in through small access points, so the internal linings stay on, nobody has to move out, and the access points are made good afterwards.'],
              ['Open walls, spray foam', 'At the construction stage, or when a renovation has the wall open, we spray polyurethane foam into the frame before the internal lining goes on. It fills the cavity flush to the studs and seals around pipes and wiring.'],
            ],
          },
          { p: 'The wall construction, the condition of the cavity, moisture and the existing materials are assessed before we recommend either system.' },
        ],
        tone: 'base',
      },
      {
        id: 'why-walls',
        eyebrow: 'Why walls',
        keyword: 'Why Retrofit Wall Insulation',
        heading: 'The surface older homes leave empty',
        accentWord: 'empty',
        blocks: [
          { p: 'Around a quarter of the heat a home loses goes out through the walls. Pre-1990 homes in Victoria usually have no wall insulation at all, so in an older brick veneer or weatherboard home the walls are often the largest uninsulated surface in the house.' },
          { p: 'Insulating one surface and leaving the others helps, but heating and cooling take whichever path is still open. That is why the walls are worth doing alongside the roof and the floor.' },
        ],
        tone: 'surface',
      },
      {
        id: 'right-for-you',
        eyebrow: 'Is it right for you',
        keyword: 'Is Retrofit Wall Insulation Right for You?',
        heading: 'Signs your walls need it',
        accentWord: 'walls',
        blocks: [
          {
            list: [
              'Rooms that are cold against the outside walls in winter',
              'External walls that heat up and radiate into the room on summer afternoons',
              'An older brick veneer or weatherboard home with empty cavities',
              'A renovation that already has the walls open',
            ],
          },
          { p: 'Not every cavity suits injected foam. Some are blocked, damp or too narrow, and we will tell you if yours is one of them before you pay for anything.' },
        ],
        tone: 'base',
      },
      {
        id: 'quieter',
        eyebrow: 'A side effect',
        keyword: 'Acoustic Wall Insulation',
        heading: 'Quieter as well as warmer',
        accentWord: 'Quieter',
        blocks: [
          { p: 'Filling a wall cavity also cuts the sound that travels through it. Homes on busy roads notice it first, and so do bedrooms that share a wall with a living area.' },
        ],
        link: { label: 'How open cell foam improves sound control', href: '/spray-foam-acoustic-insulation-icynene-noise-reduction/' },
        tone: 'surface',
      },
    ],
    cta: {
      heading: 'Insulated walls, linings left on',
      text: 'Tell us how your home is built and which rooms are the problem, and we will come back with honest advice and a written quote.',
    },
  },
}

export const serviceOrder: ServiceId[] = ['underfloor', 'roof', 'walls']

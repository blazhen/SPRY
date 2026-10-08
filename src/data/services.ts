import type { ImageAsset } from '@/lib/images'
import { routes } from '@/data/routes'

export interface SubService {
  label: string
  blurb: string
}

export interface Service {
  id: 'residential' | 'commercial'
  index: string
  title: string
  lede: string
  href: string
  image: ImageAsset
  subServices: SubService[]
}

/** The two halves of the business, each linking through to its own route. */
export const services: Service[] = [
  {
    id: 'residential',
    index: '01',
    title: 'Residential',
    lede: 'Homes that hold their temperature. We seal the three places a house leaks most: under the floor, through the roof, and out through the walls.',
    href: routes.residential,
    // The client's own job, replacing the stock living room.
    image: {
      id: '/work/walls-finished.webp',
      alt: 'Room with foam sprayed into every wall cavity and across the ceiling, before the linings go on',
      size: [1400, 1050],
    },
    subServices: [
      {
        label: 'Underfloor',
        blurb: 'Stops the draft coming up through the boards, and the squeaks with it.',
      },
      {
        label: 'Roof & Ceiling',
        blurb: 'Applied to the underside of the roof so the house retains heat far longer.',
      },
      {
        label: 'Wall',
        blurb: 'A continuous barrier through the cavity, even in 80-year-old brick homes.',
      },
    ],
  },
  {
    id: 'commercial',
    index: '02',
    title: 'Commercial',
    lede: 'Sheds, plants and remote sites. Our rigs travel to the job, whatever its size and wherever it is, and we work around your operation.',
    href: routes.commercial,
    // The client's own job, replacing the stock warehouse aisle.
    image: {
      id: '/gallery/img-2371.webp',
      alt: 'Large indoor basketball hall with sprayed walls and roof, marked floor and a basketball ring',
      size: [1100, 825],
    },
    subServices: [
      {
        label: 'Factory & Warehouse',
        blurb: 'Large-span roofs and walls sealed to cut condensation and running costs.',
      },
      {
        label: 'Farming',
        blurb: 'Sheds, dairies and storage kept stable through Australian temperature swings.',
      },
      {
        label: 'Mining',
        blurb: 'Remote-site capable, with protective polyurea and aliphatic coating systems.',
      },
    ],
  },
]

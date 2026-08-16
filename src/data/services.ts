import type { ImageAsset } from '@/lib/images'

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
    href: '/residential',
    image: {
      id: 'photo-1590725140246-20acdee442be',
      alt: 'Warm timber-lined A-frame living room with soft lamplight and a comfortable sofa',
      clientSwap: true,
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
    href: '/commercial',
    image: {
      id: 'photo-1553413077-190dd305871c',
      alt: 'Long aisle of high racking inside a working distribution warehouse',
      clientSwap: true,
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

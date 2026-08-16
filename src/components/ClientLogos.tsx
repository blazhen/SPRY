import { clients, clientsHeading, type Client } from '@/data/clients'
import Marquee from '@/components/Marquee'

const BRANDS = `${import.meta.env.BASE_URL}brands/`

/** Slot height in pixels. Every logo is contained inside this, whatever its shape. */
const SLOT_H = 46

/**
 * Trust band.
 *
 * Real brand assets, in their own colours, on the light bone ground. The band
 * is deliberately the one light section on a dark page: these logos arrive as
 * full-colour files with dark ink and, in two cases, a baked-in white or
 * coloured box, none of which survive being placed on near-black.
 *
 * Each logo is contained in a fixed-height slot so a portrait mark (Steggles)
 * and a wide wordmark (Amart) carry the same optical weight. Greyscale at
 * rest, colour on hover, which keeps the strip calm without hiding the brands.
 */
export default function ClientLogos() {
  const logo = (client: Client) => {
    const scale = SLOT_H / client.h

    return (
      <span
        className={[
          'pointer-events-auto flex shrink-0 items-center justify-center rounded-md px-2 transition duration-500 ease-expo',
          'opacity-75 grayscale hover:opacity-100 hover:grayscale-0',
          // A reversed asset is white on transparency, so on the bone ground it
          // needs its own dark chip to be visible at all.
          client.reversed ? 'bg-ink px-4 py-2' : '',
        ].join(' ')}
      >
        <img
          src={`${BRANDS}${client.file}`}
          alt={`${client.name} logo`}
          width={Math.round(client.w * scale)}
          height={SLOT_H}
          style={{ height: SLOT_H, width: Math.round(client.w * scale) }}
          className="block object-contain"
          // Deliberately eager. The strip is always moving, so a logo that
          // loads as it enters the frame pops in visibly; the whole set is
          // around 130 KB of small marks, which is cheaper than that flicker.
          decoding="async"
        />
      </span>
    )
  }

  return (
    <section className="relative bg-bone py-section text-ink" aria-labelledby="clients-heading">
      <div className="shell">
        <div className="flex flex-wrap items-baseline justify-between gap-6 border-b border-ink/12 pb-8">
          <h2 id="clients-heading" className="max-w-2xl text-h3 font-semibold">
            {clientsHeading}
          </h2>
          <p className="text-small text-ink/60">
            {clients.length} brands · Australia-wide &amp; international
          </p>
        </div>
      </div>

      <Marquee
        items={clients.map((client) => client.name)}
        duration={44}
        ariaLabel="Brands we have worked with"
        className="mask-edges mt-12"
        renderItem={(name) => {
          const client = clients.find((c) => c.name === name)
          return client ? logo(client) : null
        }}
        separator={
          <span className="mx-[2.2rem] inline-block size-[5px] shrink-0 rotate-45 bg-accent/50 align-middle" />
        }
      />
    </section>
  )
}

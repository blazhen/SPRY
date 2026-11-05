import { useEffect, useState } from 'react'
import { attachmentSrc } from '../../lib/attachments'
import { usePhotos } from '../../lib/photoList'
import { Dialog } from '../ui'
import './photos.css'

export interface CustomerPhoto {
  id: string
  caption: string
  sub: string
  url: string
}

/** Demo mode only: the same photos the server would hand out (Inspection photos marked "On the quote"), from this browser. */
export function useMockCustomerPhotos(jobId: string): CustomerPhoto[] {
  const list = usePhotos(jobId).filter((p) => p.photo.purpose === 'inspection' && p.photo.onQuote)
  const key = list.map((p) => p.id).join(',')
  const [out, setOut] = useState<CustomerPhoto[]>([])
  useEffect(() => {
    let live = true
    void Promise.all(list.map(async (p) => ({ id: p.id, caption: p.photo.caption, sub: p.photo.sub, url: (await attachmentSrc(p)) ?? '' }))).then((r) => live && setOut(r.filter((x) => x.url)))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return out
}

/** What the customer sees on the quote page: the inspection photos staff chose, with their captions. */
export function CustomerPhotos({ photos }: { photos: CustomerPhoto[] }) {
  const [big, setBig] = useState<CustomerPhoto | null>(null)
  if (photos.length === 0) return null
  return (
    <section className="panel mt-6 p-5 sm:p-6" aria-labelledby="cust-photos-h" data-customer-photos>
      <h2 id="cust-photos-h" className="text-[1.5rem]">
        Photos from our inspection
      </h2>
      <ul className="ph-grid mt-3">
        {photos.map((p) => (
          <li key={p.id} className="ph-tile" data-customer-photo={p.id}>
            <button type="button" className="ph-tile-btn" onClick={() => setBig(p)} aria-label={`Enlarge photo: ${p.caption || p.sub || 'inspection photo'}`}>
              <img src={p.url} alt={p.caption || (p.sub ? `${p.sub} photo` : 'Inspection photo')} className="ph-tile-img" loading="lazy" decoding="async" />
            </button>
            {(p.caption || p.sub) && <p className="ph-tile-cap">{p.caption || p.sub}</p>}
          </li>
        ))}
      </ul>
      <Dialog open={!!big} onClose={() => setBig(null)} title={big?.caption || 'Inspection photo'} size="lg">
        {big && <img src={big.url} alt={big.caption || 'Inspection photo'} style={{ width: '100%', height: 'auto', borderRadius: 8 }} />}
      </Dialog>
    </section>
  )
}

import { usePhotos } from '../../lib/photoList'
import { routesTo } from '../../lib/photoPurposes'
import { updatePhoto } from '../../lib/attachments'
import { toast } from '../ui'
import { PhotoImg } from './PhotosBox'
import './photos.css'

/** In the quote editor: Inspection photos of the job, each with a switch to attach it to the quote. Staff only for now. */
export function QuotePhotos({ jobId }: { jobId: string }) {
  const list = usePhotos(jobId).filter((p) => routesTo(p.photo.purpose, 'quote'))
  if (list.length === 0) return null
  return (
    <section className="stack-sm" data-quote-photos aria-label="Inspection photos">
      <h3 className="t-section">Inspection photos ({list.length})</h3>
      <ul className="ph-grid">
        {list.map((p) => (
          <li key={p.id} className="ph-tile" data-quote-photo={p.id}>
            <div className="ph-tile-btn">
              <PhotoImg a={p} className="ph-tile-img" />
            </div>
            <label className="ph-check">
              <input type="checkbox" checked={p.photo.onQuote} onChange={async (e) => { if (!(await updatePhoto(p.id, { onQuote: e.target.checked }))) toast('It could not be changed. Please try again.') }} />
              <span>Show to the customer</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="hint">Ticked photos, with their captions, show on the customer's quote page. Check the captions first.</p>
    </section>
  )
}

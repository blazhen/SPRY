import { openAttachment } from '../../lib/attachments'
import { fmtDate } from '../../lib/format'
import { usePhotos } from '../../lib/photoList'
import { routesTo } from '../../lib/photoPurposes'
import { toast } from '../ui'
import { PhotoImg } from './PhotosBox'
import './photos.css'

/** Job costing documents: the photos taken as "Materials or receipt" (the purpose list says which purposes go here). */
export function CostingDocs({ jobId }: { jobId: string }) {
  const docs = usePhotos(jobId).filter((p) => routesTo(p.photo.purpose, 'costing'))
  return (
    <div className="stack-sm" data-costing-docs>
      <h3 className="t-body font-bold">Receipts and materials photos ({docs.length})</h3>
      {docs.length === 0 ? (
        <p className="hint">None yet. Use Take photos and choose Materials or receipt.</p>
      ) : (
        <ul className="ph-grid">
          {docs.map((p) => (
            <li key={p.id} className="ph-tile" data-costing-doc={p.id}>
              <button type="button" className="ph-tile-btn" aria-label={`Open ${p.photo.caption || 'receipt photo'}`} onClick={async () => { const w = await openAttachment(p, 'open'); if (w) toast(w) }}>
                <PhotoImg a={p} className="ph-tile-img" />
              </button>
              <p className="ph-tile-cap">{p.photo.caption || 'No caption'}</p>
              <p className="ph-tile-meta">{fmtDate(p.photo.takenAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

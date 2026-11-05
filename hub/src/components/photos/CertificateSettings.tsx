import { useEffect, useId, useState } from 'react'
import { DEFAULT_WARRANTY } from '../../lib/certificate'
import { updateExtras } from '../../lib/store'
import { useExtraSettings } from '../../lib/useExtras'
import { Notice, toast } from '../ui'
import './photos.css'

/** Settings: the warranty wording printed on the completion certificate. Placeholder until Glenn confirms it. */
export function CertificateSettings() {
  const x = useExtraSettings().raw?.certificate
  const id = useId()
  const [text, setText] = useState(x?.warranty ?? DEFAULT_WARRANTY)
  useEffect(() => setText(x?.warranty ?? DEFAULT_WARRANTY), [x?.warranty])
  const confirmed = x?.confirmed === true
  return (
    <section className="card stack" data-certificate-settings aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="t-section">
        Certificate wording
      </h2>
      {!confirmed && (
        <Notice tone="warn">
          <span data-cert-wording-placeholder>Placeholder wording until Glenn confirms it. Certificates made now say DRAFT.</span>
        </Notice>
      )}
      <div>
        <label className="label" htmlFor={`${id}-t`}>
          Warranty text on the certificate
        </label>
        <textarea id={`${id}-t`} className="field" rows={6} value={text} maxLength={3000} onChange={(e) => setText(e.target.value)} />
      </div>
      <label className="ph-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => updateExtras({ certificate: { warranty: text.trim() || DEFAULT_WARRANTY, confirmed: e.target.checked } })} data-cert-confirmed />
        <span>Glenn has confirmed this wording</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" data-cert-save disabled={!text.trim() || text.trim() === (x?.warranty ?? DEFAULT_WARRANTY)} onClick={() => { updateExtras({ certificate: { warranty: text.trim(), confirmed } }); toast('Done: certificate wording saved') }}>
          Save the wording
        </button>
        <button type="button" className="btn btn-neutral" onClick={() => { updateExtras({ certificate: undefined }); toast('Wording back to the placeholder') }}>
          Back to the placeholder
        </button>
      </div>
    </section>
  )
}

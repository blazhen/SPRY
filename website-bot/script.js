/**
 * Copy buttons, theme, print, and the section nav.
 *
 * The copy has to land in a rich text editor with its headings and lists
 * intact, so it is written to the clipboard as HTML and as plain text at the
 * same time and the editor takes whichever it prefers. The agent instructions
 * are the exception: those go into a plain instruction field, so they are
 * copied as text only.
 */
(function () {
  'use strict'

  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }

  /* ------------------------------------------------------------- copying */

  /* Strip the markup a rich text editor has no use for, and flatten the
     styling attributes so the pasted document inherits the editor's own. */
  function cleanHtml(node) {
    var c = node.cloneNode(true)
    $$('[data-strip], button', c).forEach(function (el) { el.remove() })
    $$('*', c).forEach(function (el) {
      el.removeAttribute('class')
      el.removeAttribute('style')
      el.removeAttribute('id')
    })
    return c.innerHTML.replace(/\s+/g, ' ').replace(/> </g, '>\n<').trim()
  }

  /* Plain text that still reads as a document: headings on their own line,
     list items bulleted, one blank line between blocks. */
  function plainText(node) {
    var c = node.cloneNode(true)
    $$('[data-strip], button', c).forEach(function (el) { el.remove() })
    var out = []
    $$('h3, h4, p, li', c).forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!t) return
      if (el.tagName === 'LI') out.push('- ' + t)
      else if (el.tagName === 'H3' || el.tagName === 'H4') out.push('\n' + t.toUpperCase())
      else out.push(t)
    })
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  function flash(btn, msg) {
    var label = btn.getAttribute('data-label')
    if (label === null) { label = btn.textContent.trim(); btn.setAttribute('data-label', label) }
    var svg = btn.querySelector('svg')
    btn.textContent = msg
    if (svg) btn.insertBefore(svg, btn.firstChild)
    btn.classList.add('done')
    clearTimeout(btn._t)
    btn._t = setTimeout(function () {
      btn.textContent = label
      if (svg) btn.insertBefore(svg, btn.firstChild)
      btn.classList.remove('done')
    }, 1800)
  }

  /* Last resort where the async clipboard is unavailable, which is the case
     on a file:// page in some browsers. Selecting the node and copying keeps
     the formatting, which a plain-text fallback would lose. */
  function selectAndCopy(node) {
    var sel = window.getSelection()
    var range = document.createRange()
    range.selectNodeContents(node)
    sel.removeAllRanges()
    sel.addRange(range)
    var ok = false
    try { ok = document.execCommand('copy') } catch (e) { ok = false }
    sel.removeAllRanges()
    return ok
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = $('#' + btn.getAttribute('data-copy') + '-src')
      if (!src) return
      var asPlain = btn.getAttribute('data-plain') === '1'
      var text = asPlain ? src.textContent.trim() : plainText(src)

      if (navigator.clipboard && window.ClipboardItem && !asPlain) {
        var items = {
          'text/html': new Blob([cleanHtml(src)], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }
        navigator.clipboard.write([new window.ClipboardItem(items)])
          .then(function () { flash(btn, 'Copied') })
          .catch(function () { flash(btn, selectAndCopy(src) ? 'Copied' : 'Select and copy') })
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(function () { flash(btn, 'Copied') })
          .catch(function () { flash(btn, selectAndCopy(src) ? 'Copied' : 'Select and copy') })
        return
      }
      flash(btn, selectAndCopy(src) ? 'Copied' : 'Select and copy')
    })
  })

  /* ------------------------------------------------------------- counts */

  $$('[data-count-for]').forEach(function (el) {
    var src = $('#' + el.getAttribute('data-count-for') + '-src')
    if (!src) return
    var words = (src.textContent || '').trim().split(/\s+/).filter(Boolean).length
    el.textContent = words.toLocaleString('en-AU') + ' words'
  })

  /* -------------------------------------------------------- theme, print */

  try {
    var t = localStorage.getItem('journey:theme')
    if (t) document.documentElement.setAttribute('data-theme', t)
  } catch (e) { /* private browsing */ }

  if ($('#themeBtn')) $('#themeBtn').addEventListener('click', function () {
    var root = document.documentElement
    var dark = root.getAttribute('data-theme') === 'dark'
      || (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.setAttribute('data-theme', dark ? 'light' : 'dark')
    try { localStorage.setItem('journey:theme', dark ? 'light' : 'dark') } catch (err) { /* private browsing */ }
  })

  if ($('#printBtn')) $('#printBtn').addEventListener('click', function () { window.print() })

  /* ---------------------------------------------------------- section nav */

  /* The row is wider than a phone screen. Touch scrolls it already; this adds
     the same press and pull the journey stage rail has, with a soft fade on
     whichever end still has links behind it. */
  var navRow = $('#navRow')
  if (navRow) {
    var edges = function () {
      var over = navRow.scrollWidth - navRow.clientWidth
      var more = over > 2
      navRow.classList.toggle('grabbable', more)
      navRow.classList.toggle('can-l', more && navRow.scrollLeft > 2)
      navRow.classList.toggle('can-r', more && navRow.scrollLeft < over - 2)
    }
    var grab = null, moved = false
    navRow.addEventListener('pointerdown', function (e) {
      moved = false
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
      if (navRow.scrollWidth - navRow.clientWidth < 3) return
      grab = { x: e.clientX, left: navRow.scrollLeft, id: e.pointerId }
    })
    navRow.addEventListener('pointermove', function (e) {
      if (!grab || e.pointerId !== grab.id) return
      var dx = e.clientX - grab.x
      if (!moved) {
        if (Math.abs(dx) < 6) return
        moved = true
        navRow.classList.add('dragging')
        try { navRow.setPointerCapture(grab.id) } catch (err) { /* older engines */ }
      }
      navRow.scrollLeft = grab.left - dx
      edges()
      e.preventDefault()
    })
    var letGo = function (e) {
      if (!grab || (e && e.pointerId !== undefined && e.pointerId !== grab.id)) return
      try { navRow.releasePointerCapture(grab.id) } catch (err) { /* already gone */ }
      grab = null
      navRow.classList.remove('dragging')
    }
    navRow.addEventListener('pointerup', letGo)
    navRow.addEventListener('pointercancel', letGo)
    navRow.addEventListener('lostpointercapture', letGo)
    navRow.addEventListener('dragstart', function (e) { e.preventDefault() })
    /* a drag must not follow the link it happened to finish on */
    navRow.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false }
    }, true)
    navRow.addEventListener('scroll', edges, { passive: true })
    window.addEventListener('resize', edges)
    edges()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(edges)
  }

  var links = $$('#navRow a')
  var secs = links.map(function (a) { return $(a.getAttribute('href')) }).filter(Boolean)
  if (secs.length && 'IntersectionObserver' in window) {
    var mark = function (id) {
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true')
        else a.removeAttribute('aria-current')
      })
    }
    var seen = {}
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting })
      for (var i = 0; i < secs.length; i += 1) {
        if (seen[secs[i].id]) { mark(secs[i].id); return }
      }
    }, { rootMargin: '-72px 0px -60% 0px' })
    secs.forEach(function (s) { io.observe(s) })
  }
})()

/* ============================================================================
   Renders journey-data.js. No content lives here.

   Two view modes:
     preview  merge fields are swapped for a sample customer, so the page reads
              the way a real person would receive it
     fields   merge fields are shown raw, so whoever builds the workflows can
              see exactly what to paste

   Every panel for every pipeline is rendered into the DOM at load and shown or
   hidden by the rail. That is what lets Print produce the whole document.
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JOURNEY;
  if (!J) return;

  /* ------------------------------------------------------------ helpers */
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  var isLinkKey = function (k) { return /(_url|_link)$/.test(k); };

  /* Agency view. agency.html sets window.JOURNEY_AGENCY; index.html also
     accepts ?agency on the address. Either way the page shows what is only
     useful to whoever builds and reuses this: the Core and Trade specific
     tags, the reuse column in the index, the builder notes, the fields to
     create and the go-live checklist. The client never needs those, so the
     client page leaves them out. */
  var AGENCY = window.JOURNEY_AGENCY === true || /[?&]agency\b/.test(location.search);

  var ICON = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2a7 7 0 0 0-7 7c0 3-2 5-2 5h18s-2-2-2-5a7 7 0 0 0-7-7Z"/><path d="M9 19a3 3 0 0 0 6 0"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  /* ------------------------------------------------------------- state */
  /* Builders paste merge fields, so the agency page opens in Fields mode. The
     two pages remember their view separately. */
  var VIEW_KEY = AGENCY ? 'journey:agency:view' : 'journey:view';
  var state = {
    pipeline: 'residential',
    stage: null,
    view: AGENCY ? 'fields' : 'preview',
  };
  try { state.view = localStorage.getItem(VIEW_KEY) || state.view; } catch (e) {}

  /* Sample values for a pipeline, common ones underneath. */
  function samplesFor(pipelineId) {
    var base = Object.assign({}, J.samples.common);
    var specific = J.samples[pipelineId] || J.samples.residential;
    return Object.assign(base, specific);
  }

  /* Merge fields → spans. Text is escaped first; token keys carry no HTML. */
  function renderTokens(text, mode, samples) {
    return esc(text).replace(TOKEN, function (_, key) {
      if (mode === 'fields') return '<span class="tk">{{' + key + '}}</span>';
      var v = samples[key];
      if (v == null) return '<span class="tk" title="No sample value for this field">{{' + key + '}}</span>';
      var cls = isLinkKey(key) ? 'pz lnk' : 'pz';
      /* a phone number or a short reference should never wrap mid-value */
      if (/^[\d\s+()-]{4,18}$/.test(v) || (/^[A-Z]+-[\w-]+$/.test(v) && v.length <= 12)) cls += ' pz--nw';
      return '<span class="' + cls + '">' + esc(v) + '</span>';
    });
  }

  /* Plain-text substitution, for character counts and for copy text. */
  function fillTokens(text, samples) {
    return text.replace(TOKEN, function (m, key) { return samples[key] != null ? samples[key] : m; });
  }

  /* Bracketed fill-ins like [payment terms] are hand-completed on send. */
  function markFills(html) {
    return html.replace(/\[([^\[\]{}]{2,60})\]/g, '<span class="fill">[$1]</span>');
  }

  /* Email body text → HTML. See the conventions at the top of journey-data.js */
  function bodyHtml(text, mode, samples) {
    var blocks = text.split(/\n[ \t]*\n/);
    return blocks.map(function (block) {
      var lines = block.split('\n');
      var indented = lines.every(function (l) { return /^\s{2,}\S/.test(l); });
      if (indented) {
        var numbered = lines.every(function (l) { return /^\s*\d+\.\s/.test(l); });
        var kv = lines.every(function (l) { return /^\s{2,}\S[^\n]*?\s{2,}\S/.test(l); });
        if (numbered) {
          return '<ol>' + lines.map(function (l) {
            return '<li>' + markFills(renderTokens(l.replace(/^\s*\d+\.\s/, ''), mode, samples)) + '</li>';
          }).join('') + '</ol>';
        }
        if (kv) {
          return '<div class="kv">' + lines.map(function (l) {
            var t = l.replace(/^\s+/, '');
            var i = t.search(/\s{2,}/);
            var k = t.slice(0, i), v = t.slice(i).replace(/^\s+/, '');
            return '<span class="k">' + renderTokens(k, mode, samples) + '</span><span class="v">' + markFills(renderTokens(v, mode, samples)) + '</span>';
          }).join('') + '</div>';
        }
        return '<ul class="plain">' + lines.map(function (l) {
          return '<li>' + markFills(renderTokens(l.replace(/^\s+/, ''), mode, samples)) + '</li>';
        }).join('') + '</ul>';
      }
      return '<p>' + markFills(renderTokens(lines.join(' '), mode, samples)) + '</p>';
    }).join('');
  }

  /* SMS length. GSM-7 basic set fits 160 per single, 153 per segment;
     anything outside it forces UCS-2 at 70 / 67. */
  var GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  var GSM_EXT = "^{}\\[~]|€";
  function smsStats(text) {
    var ucs2 = false, units = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (GSM.indexOf(c) > -1) units += 1;
      else if (GSM_EXT.indexOf(c) > -1) units += 2;
      else { ucs2 = true; break; }
    }
    if (ucs2) {
      var len = text.length;
      return { chars: len, segments: len <= 70 ? 1 : Math.ceil(len / 67), encoding: 'UCS-2' };
    }
    return { chars: units, segments: units <= 160 ? 1 : Math.ceil(units / 153), encoding: 'GSM-7' };
  }

  /* Raw text handed to the clipboard. Tokens intact, ready for the builder. */
  function copyText(m, id) {
    if (m.channel === 'sms') return m.body;
    var from = m.from === 'owner' ? '{{custom_values.from_name_owner}}' : '{{custom_values.from_name_brand}}';
    var out = [
      'ID: ' + id,
      'From: ' + from + ' <{{custom_values.business_email}}>',
      'Reply-to: {{custom_values.business_email}}',
      'Subject: ' + m.subject,
      'Preheader: ' + m.preheader,
      '',
      m.body,
    ];
    if (m.sig) out.push('', m.sig.join('\n'));
    if (m.footer) out.push('', m.footer);
    return out.join('\n');
  }

  function copyToClipboard(text, btn) {
    var done = function () {
      btn.classList.add('done');
      btn.innerHTML = ICON.tick + 'Copied';
      setTimeout(function () { btn.classList.remove('done'); btn.innerHTML = ICON.copy + 'Copy'; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else { legacyCopy(text); done(); }
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------ renderers */
  function chip(kind, label) {
    var icon = kind === 'email' ? ICON.email : kind === 'sms' ? ICON.sms : '';
    return '<span class="chip chip--' + kind + '">' + icon + label + '</span>';
  }

  function renderEmail(m, id, pipelineId) {
    var mode = state.view, S = samplesFor(pipelineId);
    var fromName = m.from === 'owner' ? '{{custom_values.from_name_owner}}' : '{{custom_values.from_name_brand}}';
    var initials = m.from === 'owner' ? esc(J.brand.ownerInitials) : 'SI';
    var avaCls = m.from === 'owner' ? 'ava' : 'ava green';
    var toLine = mode === 'fields'
      ? '<span class="tk">{{contact.full_name}}</span> <span class="addr">&lt;<span class="tk">{{contact.email}}</span>&gt;</span>'
      : '<b>' + esc(S['contact.full_name']) + '</b> <span class="addr">&lt;' + esc(S['contact.email']) + '&gt;</span>';

    var html = '<div class="mail">';
    html += '<div class="inbox"><div class="' + avaCls + ' ava--s">' + initials + '</div><div class="inbox__t">'
      + '<div class="inbox__s">' + renderTokens(m.subject, mode, S) + '</div>'
      + '<div class="inbox__p">' + renderTokens(m.preheader, mode, S) + '</div></div><span class="inbox__k">Inbox</span></div>';
    html += '<div class="mail__head"><div class="' + avaCls + '">' + initials + '</div><div class="hdr">'
      + '<div class="hdr__row"><span class="k">From</span><span class="v"><b>' + renderTokens(fromName, mode, S) + '</b> <span class="addr">&lt;' + renderTokens('{{custom_values.business_email}}', mode, S) + '&gt;</span></span></div>'
      + '<div class="hdr__row"><span class="k">To</span><span class="v">' + toLine + '</span></div>'
      + '<div class="hdr__row"><span class="k">Reply-to</span><span class="v">' + renderTokens('{{custom_values.business_email}}', mode, S) + '</span></div>'
      + '</div></div>';
    html += '<div class="mail__subject"><div class="sk">Subject</div><div class="sv">' + renderTokens(m.subject, mode, S) + '</div></div>';
    html += '<div class="mail__pre"><span class="sk">Preheader</span>' + renderTokens(m.preheader, mode, S) + '</div>';
    html += '<div class="mail__body">' + bodyHtml(m.body, mode, S);
    if (m.sig) html += '<p class="sig">' + m.sig.map(function (l) { return '<span>' + renderTokens(l, mode, S) + '</span>'; }).join('') + '</p>';
    html += '</div>';
    if (m.footer) html += '<div class="mail__foot">' + renderTokens(m.footer, mode, S) + '</div>';
    html += '</div>';
    return html;
  }

  function renderSms(m, id, pipelineId) {
    var mode = state.view, S = samplesFor(pipelineId);
    var filled = fillTokens(m.body, S);
    var st = smsStats(filled);
    var stamp = /before/i.test(m.delay) ? m.delay : /day \d|\+\d/i.test(m.delay) ? m.delay : 'Just now';
    var meta = st.chars + ' chars · ' + st.segments + (st.segments === 1 ? ' segment' : ' segments') + ' · ' + st.encoding;
    if (st.segments > 1) meta = '<span class="warn">' + meta + '</span>';
    var optout = m.type === 'MKTG' ? '<span>Reply STOP to opt out</span>' : '<span>Sender identified</span>';
    return '<div class="phone"><div class="phone__notch"></div>'
      + '<div class="phone__who"><b>' + esc(J.brand.name) + '</b>Text message</div>'
      + '<div class="phone__screen"><div class="tstamp">' + esc(stamp) + '</div>'
      + '<div class="tbubble">' + renderTokens(m.body, mode, S) + '</div></div>'
      + '<div class="phone__meta">' + meta + optout + '</div></div>';
  }

  function renderMessage(id, pipelineId) {
    var m = J.messages[id];
    if (!m) return '<div class="empty">Missing message: ' + esc(id) + '</div>';
    var art = el('article', 'note');
    art.setAttribute('data-msg', id);
    var meta = '<div class="note__meta">'
      + chip(m.channel, m.channel === 'sms' ? 'Text' : 'Email')
      + '<span class="msgid">' + esc(id) + '</span>'
      + '<span class="chip chip--' + m.type.toLowerCase() + '">' + (m.type === 'TRANS' ? 'Transactional' : 'Marketing') + '</span>'
      + (AGENCY ? '<span class="chip chip--' + m.reuse.toLowerCase() + '">' + (m.reuse === 'CORE' ? 'Core' : 'Trade specific') + '</span>' : '')
      + (m.manual ? '<span class="chip chip--manual">Manual send</span>' : '')
      + '<span class="timing">' + esc(m.delay) + ' <small>· ' + esc(m.trigger) + '</small></span>'
      + '<button type="button" class="copy" data-copy="' + esc(id) + '">' + ICON.copy + 'Copy</button>'
      + '</div>';
    var stops = '<p class="stops"><b>Stops:</b> ' + esc(m.stops || '') + (m.window === 'business-hours' ? ' <b>Window:</b> waits for the send window.' : ' <b>Window:</b> sends immediately.') + '</p>';
    var pair = m.channel === 'email'
      ? '<div class="pair solo">' + renderEmail(m, id, pipelineId) + '</div>'
      : '<div class="pair solo-sms">' + renderSms(m, id, pipelineId) + '</div>';
    var note = m.note ? '<p class="group__cap" style="margin:.9rem 0 0">' + esc(m.note) + '</p>' : '';
    if (AGENCY && m.agencyNote) note += '<p class="group__cap" style="margin:.5rem 0 0"><b>Agency:</b> ' + esc(m.agencyNote) + '</p>';
    art.innerHTML = meta + stops + pair + note;
    return art;
  }

  function renderTeam(stage, pipelineId) {
    var S = samplesFor(pipelineId), mode = state.view;
    var wrap = el('div', 'team');
    var html = '<div class="team__head">' + ICON.bell + 'Behind the scenes · what your team sees</div><div class="team__grid">';

    html += '<div class="team__col"><h4>Alerts that interrupt</h4>';
    if (!stage.alerts || !stage.alerts.length) html += '<p class="trow__b" style="color:var(--ink-3)">Nothing here interrupts anyone. This stage waits for the daily digest.</p>';
    (stage.alerts || []).forEach(function (n) {
      var a = J.alerts[n - 1];
      html += '<div class="trow"><span class="tprio ' + a.prio + '">' + ({ now: 'Act now', heads: 'Heads up', win: 'Win', fyi: 'Good to know' })[a.prio] + '</span>'
        + '<div class="trow__b"><b>' + esc(a.name) + '</b> · ' + esc(a.to) + ', by ' + esc(a.channel)
        + '<span class="when">Fires when: ' + esc(a.trigger) + '. ' + esc(a.why) + '</span>'
        + '<pre>' + renderTokens(a.body, mode, S) + '</pre></div></div>';
    });
    html += '</div>';

    html += '<div class="team__col"><h4>Tasks that persist until closed</h4>';
    (stage.tasks || []).forEach(function (t) {
      html += '<div class="trow"><div class="trow__b"><span class="task">' + renderTokens(t.title, mode, S) + '</span><br>'
        + '<span class="role">' + esc(t.role) + '</span><span class="when" style="display:inline">Due: ' + esc(t.due) + '</span></div></div>';
    });
    if (stage.automation && stage.automation.length) {
      html += '<h4 style="margin-top:1rem">Automation on the card</h4><ul class="auto">' + stage.automation.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }
    html += '</div></div>';
    if (stage.escalation) html += '<div class="esc"><b>Escalation.</b> ' + esc(stage.escalation) + '</div>';
    wrap.innerHTML = html;
    return wrap;
  }

  function stageFacts(stage, pipeline) {
    var idx = pipeline ? pipeline.stages.indexOf(stage) : -1;
    var wonIdx = pipeline ? pipeline.stages.findIndex(function (s) { return s.won; }) : -1;
    var status = stage.won ? 'Status set to Won' : (idx > -1 && wonIdx > -1 && idx > wonIdx) ? 'Won · delivery' : 'Open · sales';
    var html = '<div class="facts">';
    if (stage.exits) html += '<div class="fact"><b>Exits when</b><span>' + esc(stage.exits) + '</span></div>';
    if (stage.stalls) html += '<div class="fact"><b>Stalls after</b><span>' + esc(stage.stalls) + '</span></div>';
    if (pipeline) html += '<div class="fact' + (status.indexOf('Won') > -1 ? ' won' : '') + '"><b>Status</b><span>' + status + '</span></div>';
    return html + '</div>';
  }

  function renderPanel(stage, pipeline) {
    var pid = pipeline ? pipeline.id : 'residential';
    var sec = el('section', 'panel');
    sec.id = 'p-' + (pipeline ? pipeline.id : 'always-on') + '-' + stage.key;
    sec.setAttribute('role', 'tabpanel');
    sec.setAttribute('aria-label', stage.name);

    var badge = stage.won ? '<span class="badge won">Won</span>' : stage.n ? '<span class="badge">' + String(stage.n).padStart(2, '0') + '</span>' : '<span class="badge">All</span>';
    var head = '<div class="stage__head"><div>'
      + '<div class="stage__k">' + badge + (pipeline ? esc(pipeline.name) + ' · ' : '') + esc(stage.name) + '</div>'
      + '<h2 class="stage__t">' + esc(stage.headline) + '</h2>'
      + (stage.means ? '<p class="stage__means">' + esc(stage.means) + '</p>' : '')
      + '<p class="stage__d">' + esc(stage.intro) + '</p></div>'
      + stageFacts(stage, pipeline) + '</div>';
    sec.innerHTML = head;

    if (!stage.groups || !stage.groups.length) {
      sec.appendChild(el('div', 'empty', 'No automated message at this stage. This one is a conversation, and an email from a workflow would be noise in it. What the team does here is below.'));
    }
    (stage.groups || []).forEach(function (g) {
      sec.appendChild(el('div', 'group__k', esc(g.title)));
      if (g.caption) sec.appendChild(el('p', 'group__cap', esc(g.caption)));
      g.messages.forEach(function (id) { sec.appendChild(renderMessage(id, pid)); });
    });
    sec.appendChild(renderTeam(stage, pid));
    return sec;
  }

  /* --------------------------------------------------------- navigation */
  var main = $('#panels');
  var railEl = $('#rail');
  var segEl = $('#pipelineSeg');
  var pagerPrev = $('#pagerPrev'), pagerNext = $('#pagerNext');

  function pipelineById(id) {
    if (id === 'always-on') return { id: 'always-on', name: 'Always on', stages: [J.alwaysOn], system: true };
    return J.pipelines.filter(function (p) { return p.id === id; })[0] || J.pipelines[0];
  }

  function msgCount(stage) {
    var seen = {};
    (stage.groups || []).forEach(function (g) { g.messages.forEach(function (id) { seen[id] = 1; }); });
    return Object.keys(seen).length;
  }

  function renderAll() {
    main.innerHTML = '';
    J.pipelines.forEach(function (p) { p.stages.forEach(function (s) { main.appendChild(renderPanel(s, p)); }); });
    main.appendChild(renderPanel(J.alwaysOn, null));
  }

  function buildSeg() {
    var items = J.pipelines.map(function (p) { return { id: p.id, label: p.name, n: p.stages.filter(function (s) { return !s.won; }).length + ' stages' }; });
    items.push({ id: 'always-on', label: 'Always on', n: '' });
    segEl.innerHTML = items.map(function (i) {
      return '<button type="button" data-pipeline="' + i.id + '" aria-pressed="' + (i.id === state.pipeline) + '">' + esc(i.label) + (i.n ? '<span class="n">' + esc(i.n) + '</span>' : '') + '</button>';
    }).join('');
  }

  function buildRail() {
    var p = pipelineById(state.pipeline);
    var wonIdx = p.stages.findIndex(function (s) { return s.won; });
    railEl.innerHTML = p.stages.map(function (s, i) {
      var cls = 'node' + (s.won ? ' won' : '') + (wonIdx > -1 && i > wonIdx ? ' delivery' : '') + (p.system ? ' sys' : '');
      var num = s.won ? 'Won' : s.n ? String(s.n).padStart(2, '0') : '';
      var count = msgCount(s);
      return '<button type="button" class="' + cls + '" role="tab" data-stage="' + esc(s.key) + '" aria-selected="' + (s.key === state.stage) + '" tabindex="' + (s.key === state.stage ? 0 : -1) + '">'
        + '<span class="bead"></span><span class="lbl">' + esc(s.name) + '</span><span class="num">' + esc(num) + (count ? ' · ' + count : '') + '</span></button>';
    }).join('');
  }

  function activate(pipelineId, stageKey, opts) {
    opts = opts || {};
    var p = pipelineById(pipelineId);
    state.pipeline = p.id;
    var stage = p.stages.filter(function (s) { return s.key === stageKey; })[0] || p.stages[0];
    state.stage = stage.key;

    segEl.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.pipeline === p.id)); });
    buildRail();
    var active = railEl.querySelector('.node[aria-selected="true"]');
    if (active) {
      active.scrollIntoView({ inline: 'center', block: 'nearest' });
      if (opts.focus) active.focus();
    }
    main.querySelectorAll('.panel').forEach(function (pn) { pn.classList.toggle('on', pn.id === 'p-' + p.id + '-' + stage.key); });

    var i = p.stages.indexOf(stage);
    paintPager(pagerPrev, i > 0 ? p.stages[i - 1] : null, true);
    paintPager(pagerNext, i < p.stages.length - 1 ? p.stages[i + 1] : null, false);

    var hash = '#' + p.id + '/' + stage.key;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    if (!opts.silent) {
      var ctl = $('.controls');
      var y = ctl.getBoundingClientRect().bottom + window.scrollY - ctl.offsetHeight - 8;
      window.scrollTo({ top: Math.max(0, y), behavior: opts.focus ? 'auto' : 'smooth' });
    }
  }

  function paintPager(btn, stage, before) {
    if (!stage) { btn.textContent = ''; btn.removeAttribute('data-goto'); btn.classList.add('ghost'); return; }
    btn.textContent = before ? '←  ' + stage.name : stage.name + '  →';
    btn.setAttribute('data-goto', stage.key);
    btn.classList.remove('ghost');
  }

  /* ----------------------------------------------------------- appendices */
  function stagesUsing(id) {
    var out = [];
    J.pipelines.forEach(function (p) {
      p.stages.forEach(function (s) {
        (s.groups || []).forEach(function (g) {
          if (g.messages.indexOf(id) > -1) out.push({ p: p, s: s });
        });
      });
    });
    (J.alwaysOn.groups || []).forEach(function (g) { if (g.messages.indexOf(id) > -1) out.push({ p: null, s: J.alwaysOn }); });
    var seen = {};
    return out.filter(function (u) { var k = (u.p ? u.p.id : 'always-on') + '/' + u.s.key; if (seen[k]) return false; seen[k] = 1; return true; });
  }

  function buildAppendices() {
    /* custom values */
    $('#tblValues').innerHTML = J.customValues.map(function (v) {
      return '<tr><td><code>' + esc(v.key) + '</code></td><td>' + esc(v.value) + '</td><td>' + esc(v.note) + '</td></tr>';
    }).join('');

    /* message index */
    var ids = Object.keys(J.messages);
    if (AGENCY) {
      var typeTh = $('#tblMessages').parentNode.querySelector('thead th:nth-child(4)');
      if (typeTh && !typeTh.nextElementSibling.textContent.match(/Reuse/)) typeTh.insertAdjacentHTML('afterend', '<th>Reuse</th>');
    }
    $('#tblMessages').innerHTML = ids.map(function (id) {
      var m = J.messages[id];
      var where = stagesUsing(id).map(function (u) {
        var pid = u.p ? u.p.id : 'always-on';
        return '<a href="#' + pid + '/' + u.s.key + '" data-jump="' + pid + '/' + u.s.key + '">' + esc((u.p ? u.p.short + ' · ' : '') + u.s.name) + '</a>';
      }).join(', ');
      return '<tr><td><code>' + esc(id) + '</code></td><td>' + (m.channel === 'sms' ? 'SMS' : 'Email') + '</td>'
        + '<td>' + esc(m.trigger) + '<br><span style="color:var(--ink-3)">' + esc(m.delay) + '</span></td>'
        + '<td><span class="chip chip--' + m.type.toLowerCase() + '">' + (m.type === 'TRANS' ? 'Trans' : 'Mktg') + '</span></td>'
        + (AGENCY ? '<td><span class="chip chip--' + m.reuse.toLowerCase() + '">' + (m.reuse === 'CORE' ? 'Core' : 'Trade') + '</span></td>' : '')
        + '<td>' + (m.channel === 'email' ? esc(m.subject) : '') + '</td><td>' + where + '</td></tr>';
    }).join('');

    /* alerts */
    $('#tblAlerts').innerHTML = J.alerts.map(function (a) {
      return '<tr><td class="mono">' + a.n + '</td><td><b>' + esc(a.name) + '</b><br><span style="color:var(--ink-3)">' + esc(a.why) + '</span></td><td>' + esc(a.trigger) + '</td><td>' + esc(a.to) + '</td><td>' + esc(a.channel) + '</td></tr>';
    }).join('');

    /* roles */
    $('#tblRoles').innerHTML = J.roles.map(function (r) {
      return '<tr><td><code>' + esc(r.key) + '</code></td><td>' + esc(r.who) + '</td><td>' + esc(r.owns) + '</td></tr>';
    }).join('');

    /* quiet hours */
    $('#tblQuiet').innerHTML = J.quietHours.map(function (q) {
      return '<tr><td>' + esc(q.when) + '</td><td>' + esc(q.alerts) + '</td><td>' + esc(q.tasks) + '</td><td>' + esc(q.customer) + '</td></tr>';
    }).join('');

    /* compliance */
    $('#compliance').innerHTML = J.compliance.map(function (c) {
      return '<div class="cx"><h3>' + esc(c.title) + '</h3><p>' + esc(c.body) + '</p></div>';
    }).join('');

    /* build order */
    $('#buildOrder').innerHTML = J.buildOrder.map(function (b) {
      return '<li><span><b>' + esc(b.ids)   + '</b> ' + esc(b.why) + '</span></li>';
    }).join('');

    /* agency page only: fields to create, reuse steps, go-live checklist */
    var fieldsEl = $('#customFields');
    if (fieldsEl && J.customFields) {
      fieldsEl.innerHTML = J.customFields.map(function (g) {
        return '<h3 class="fields__h">' + esc(g.group) + '</h3>'
          + (g.note ? '<p class="sec-lede" style="margin-bottom:.9rem">' + esc(g.note) + '</p>' : '')
          + '<div class="t-scroll" style="margin-bottom:1.6rem"><table><thead><tr>' + g.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>'
          + g.rows.map(function (r) {
            return '<tr>' + r.map(function (cell, i) {
              if (i === 0) return '<td>' + cell.split(', ').map(function (k) { return '<code>' + esc(k) + '</code>'; }).join(', ') + '</td>';
              return '<td>' + esc(cell) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      }).join('');
    }
    var reuseEl = $('#reuseSteps');
    if (reuseEl && J.reuseSteps) reuseEl.innerHTML = J.reuseSteps.map(function (s) { return '<li><span>' + esc(s) + '</span></li>'; }).join('');
    var liveEl = $('#goLive');
    if (liveEl && J.goLive) liveEl.innerHTML = J.goLive.map(function (s) { return '<li><label class="check"><input type="checkbox"> <span>' + esc(s) + '</span></label></li>'; }).join('');

    /* hero stats */
    var stages = 0, tasks = 0;
    J.pipelines.forEach(function (p) { p.stages.forEach(function (s) { if (!s.won) stages += 1; tasks += (s.tasks || []).length; }); });
    tasks += (J.alwaysOn.tasks || []).length;
    var emails = ids.filter(function (id) { return J.messages[id].channel === 'email'; }).length;
    $('#statStages').textContent = stages;
    $('#statMessages').textContent = ids.length;
    $('#statEmails').textContent = emails;
    $('#statSms').textContent = ids.length - emails;
    $('#statTasks').textContent = tasks;
    $('#statAlerts').textContent = J.alerts.length;
    $('#cntMessages').textContent = ids.length;
  }

  /* ------------------------------------------------------------- events */
  segEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-pipeline]');
    if (b) activate(b.dataset.pipeline, null);
  });

  railEl.addEventListener('click', function (e) {
    var b = e.target.closest('.node');
    if (b) activate(state.pipeline, b.dataset.stage);
  });
  railEl.addEventListener('keydown', function (e) {
    var nodes = Array.prototype.slice.call(railEl.querySelectorAll('.node'));
    var i = nodes.indexOf(document.activeElement);
    if (i < 0) return;
    var k = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = (i + 1) % nodes.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = (i - 1 + nodes.length) % nodes.length;
    else if (e.key === 'Home') k = 0;
    else if (e.key === 'End') k = nodes.length - 1;
    else return;
    e.preventDefault();
    activate(state.pipeline, nodes[k].dataset.stage, { focus: true });
  });

  [pagerPrev, pagerNext].forEach(function (b) {
    b.addEventListener('click', function () { var g = b.getAttribute('data-goto'); if (g) activate(state.pipeline, g); });
  });

  document.addEventListener('click', function (e) {
    var c = e.target.closest('button[data-copy]');
    if (c) { var id = c.dataset.copy; copyToClipboard(copyText(J.messages[id], id), c); return; }
    var j = e.target.closest('a[data-jump]');
    if (j) { e.preventDefault(); var parts = j.dataset.jump.split('/'); activate(parts[0], parts[1]); }
  });

  $('#viewSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.dataset.view;
    try { localStorage.setItem(VIEW_KEY, state.view); } catch (err) {}
    $('#viewSeg').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.view === state.view)); });
    renderAll();
    activate(state.pipeline, state.stage, { silent: true });
  });

  $('#themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
    try { localStorage.setItem('journey:theme', dark ? 'light' : 'dark'); } catch (err) {}
  });
  $('#printBtn').addEventListener('click', function () { window.print(); });

  window.addEventListener('hashchange', function () { fromHash(true); });

  function fromHash(scroll) {
    var h = location.hash.replace(/^#/, '').split('/');
    var pid = h[0] || 'residential', sk = h[1] || null;
    if (!pipelineById(pid)) pid = 'residential';
    activate(pid, sk, { silent: !scroll });
  }

  /* --------------------------------------------------------------- boot */
  try { var t = localStorage.getItem('journey:theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  $('#viewSeg').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.view === state.view)); });
  buildSeg();
  renderAll();
  buildAppendices();
  fromHash(false);
})();

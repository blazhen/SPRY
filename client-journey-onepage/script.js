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
  /* The client page. Plain words, no builder detail. */
  var CLIENT = !AGENCY;
  document.documentElement.classList.add(CLIENT ? 'is-client' : 'is-agency');

  var ICON = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2a7 7 0 0 0-7 7c0 3-2 5-2 5h18s-2-2-2-5a7 7 0 0 0-7-7Z"/><path d="M9 19a3 3 0 0 0 6 0"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  };

  /* ----------------------------------------------------------- page switcher
     Four pages, two audiences. The client pages never list the agency ones,
     so a link cannot leak the build sheet into a client's hands. */
  var PAGES = [
    { file: 'index.html', label: 'Journey', who: 'client', desc: 'Every message a customer receives' },
    { file: 'guide.html', label: 'How to run it', who: 'client', desc: 'What runs by itself, and what you do' },
    { file: 'agency.html', label: 'Build sheet', who: 'agency', desc: 'Merge fields, values and setup' },
    { file: 'workflows.html', label: 'Workflows', who: 'agency', desc: 'Every automation to build' },
  ];
  function currentFile() {
    var f = location.pathname.split('/').pop();
    return f && /\.html$/.test(f) ? f : 'index.html';
  }
  function renderPageNav() {
    var host = $('#pageNav');
    if (!host) return;
    var here = currentFile();
    var list = AGENCY ? PAGES : PAGES.filter(function (p) { return p.who === 'client'; });
    var lastWho = null;
    host.innerHTML = list.map(function (p) {
      var out = '';
      if (AGENCY && p.who !== lastWho) {
        if (lastWho) out += '<span class="sep"></span>';
        out += '<span class="pagenav__k">' + (p.who === 'client' ? 'Client' : 'Agency') + '</span>';
        lastWho = p.who;
      }
      return out + '<a href="' + p.file + '"' + (p.file === here ? ' aria-current="page"' : '') + ' title="' + esc(p.desc) + '">' + esc(p.label) + '</a>';
    }).join('');
  }

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
      + (AGENCY ? '<div class="hdr__row"><span class="k">Reply-to</span><span class="v">' + renderTokens('{{custom_values.business_email}}', mode, S) + '</span></div>' : '')
      + '</div></div>';
    html += '<div class="mail__subject"><div class="sk">Subject</div><div class="sv">' + renderTokens(m.subject, mode, S) + '</div></div>';
    if (AGENCY) html += '<div class="mail__pre"><span class="sk">Preheader</span>' + renderTokens(m.preheader, mode, S) + '</div>';
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
    if (CLIENT) {
      meta = st.segments === 1 ? 'One text message' : st.segments + ' text messages';
      optout = m.type === 'MKTG' ? '<span>Includes an opt-out</span>' : '<span>Signed off as ' + esc(J.brand.shortName) + '</span>';
    }
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
      + (AGENCY ? '<span class="msgid">' + esc(id) + '</span>' : '')
      + (AGENCY ? '<span class="chip chip--' + m.type.toLowerCase() + '">' + (m.type === 'TRANS' ? 'Transactional' : 'Marketing') + '</span>' : (m.type === 'MKTG' ? '<span class="chip chip--mktg">Only if they opted in</span>' : ''))
      + (AGENCY ? '<span class="chip chip--' + m.reuse.toLowerCase() + '">' + (m.reuse === 'CORE' ? 'Core' : 'Trade specific') + '</span>' : '')
      + (m.manual ? '<span class="chip chip--manual">' + (CLIENT ? 'Sent by hand' : 'Manual send') + '</span>' : '')
      + '<span class="timing">' + esc(m.delay) + ' <small>· ' + esc(m.trigger) + '</small></span>'
      + (AGENCY ? '<button type="button" class="copy" data-copy="' + esc(id) + '">' + ICON.copy + 'Copy</button>' : '')
      + '</div>';
    var stops = CLIENT
      ? '<p class="stops">' + esc(m.stops || '') + ' ' + (m.window === 'business-hours' ? 'Sent during business hours.' : 'Sent straight away.') + '</p>'
      : '<p class="stops"><b>Stops:</b> ' + esc(m.stops || '') + (m.window === 'business-hours' ? ' <b>Window:</b> waits for the send window.' : ' <b>Window:</b> sends immediately.') + '</p>';
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
        + '<div class="trow__b"><b>' + esc(a.name) + '</b> · ' + esc(roleLabel(a.to)) + ', by ' + esc(a.channel)
        + '<span class="desc">' + esc(a.desc) + '</span>'
        + '<span class="when">Fires when: ' + esc(CLIENT && a.plain ? a.plain.toLowerCase() : a.trigger) + '.' + (AGENCY ? ' ' + esc(a.why) : '') + '</span>'
        + '<pre class="' + (CLIENT ? 'notif' : '') + '">' + renderTokens(a.body, mode, S) + '</pre></div></div>';
    });
    html += '</div>';

    html += '<div class="team__col"><h4>Tasks that persist until closed</h4>';
    (stage.tasks || []).forEach(function (t) {
      html += '<div class="trow"><div class="trow__b"><span class="task">' + renderTokens(t.title, mode, S) + '</span><br>'
        + '<span class="role">' + esc(roleLabel(t.role)) + '</span><span class="when" style="display:inline">Due: ' + esc(t.due) + '</span>'
        + (t.desc ? '<span class="desc">' + esc(t.desc) + '</span>' : '')
        + '</div></div>';
    });
    if (AGENCY && stage.automation && stage.automation.length) {
      html += '<h4 style="margin-top:1rem">Automation on the card</h4><ul class="auto">' + stage.automation.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }
    html += '</div></div>';
    if (stage.escalation) html += '<div class="esc"><b>Escalation.</b> ' + esc(stage.escalation) + '</div>';
    wrap.innerHTML = html;
    return wrap;
  }

  /* Every workflow names the messages it sends, including inside an if
     branch, and every stage names its messages. So which workflows build a
     stage is derivable rather than a field somebody has to remember to fill. */
  var WF_BY_MESSAGE = null;
  function workflowsFor(stage) {
    if (!J.workflows) return [];
    if (!WF_BY_MESSAGE) {
      WF_BY_MESSAGE = {};
      var walk = function (steps, id) {
        (steps || []).forEach(function (st) {
          if (st.t === 'send' && st.id) (WF_BY_MESSAGE[st.id] = WF_BY_MESSAGE[st.id] || []).push(id);
          if (st.t === 'if') { walk(st.then, id); walk(st.else, id); }
        });
      };
      J.workflows.forEach(function (w) { walk(w.steps, w.id); });
    }
    var found = {};
    (stage.groups || []).forEach(function (g) {
      (g.messages || []).forEach(function (mid) {
        (WF_BY_MESSAGE[mid] || []).forEach(function (w) { found[w] = 1; });
      });
    });
    return Object.keys(found).sort();
  }

  function stageTag(stage, pipeline) {
    if (!pipeline || pipeline.system) return '';
    return 'stage-' + (pipeline.id === 'residential' ? 'res' : 'com') + '-' + stage.key;
  }

  function stageFacts(stage, pipeline) {
    var idx = pipeline ? pipeline.stages.indexOf(stage) : -1;
    var wonIdx = pipeline ? pipeline.stages.findIndex(function (s) { return s.won; }) : -1;
    var status = stage.won ? 'Status set to Won' : (idx > -1 && wonIdx > -1 && idx > wonIdx) ? 'Won · delivery' : 'Open · sales';
    var html = '<div class="facts">';
    if (CLIENT) status = stage.won ? 'The sale is won here' : (idx > -1 && wonIdx > -1 && idx > wonIdx) ? 'Sale won, job underway' : 'Still winning the job';
    if (stage.exits) html += '<div class="fact"><b>' + (CLIENT ? 'Moves on when' : 'Exits when') + '</b><span>' + esc(stage.exits) + '</span></div>';
    if (stage.stalls) html += '<div class="fact"><b>' + (CLIENT ? 'Flag it after' : 'Stalls after') + '</b><span>' + esc(stage.stalls) + '</span></div>';
    if (pipeline) html += '<div class="fact' + (status.indexOf('on') > -1 || status.indexOf('Won') > -1 ? ' won' : '') + '"><b>' + (CLIENT ? 'Where the sale is' : 'Status') + '</b><span>' + status + '</span></div>';
    if (AGENCY) {
      var tg = stageTag(stage, pipeline);
      if (tg) html += '<div class="fact fact--tag"><b>Tag on the contact</b><span><code>' + esc(tg) + '</code></span></div>';
      var wfs = workflowsFor(stage);
      html += '<div class="fact fact--wf"><b>Built by</b><span>'
        + (wfs.length
          ? wfs.map(function (w) { return '<a href="workflows.html#' + esc(w.toLowerCase()) + '">' + esc(w) + '</a>'; }).join(' ')
          : 'No automated message here')
        + '</span></div>';
    }
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
      var here = p.stages.findIndex(function (x) { return x.key === state.stage; });
      var cls = 'node' + (s.won ? ' won' : '') + (wonIdx > -1 && i > wonIdx ? ' delivery' : '') + (p.system ? ' sys' : '') + (here > -1 && i < here ? ' done' : '');
      var num = s.won ? 'Won' : s.n ? String(s.n).padStart(2, '0') : '';
      var count = msgCount(s);
      return '<button type="button" class="' + cls + '" role="tab" data-stage="' + esc(s.key) + '" aria-selected="' + (s.key === state.stage) + '" tabindex="' + (s.key === state.stage ? 0 : -1) + '">'
        + '<span class="bead"></span><span class="lbl">' + esc(s.name) + '</span><span class="num">' + esc(num) + (count ? ' · ' + count : '') + '</span></button>';
    }).join('');
  }

  /* Slide the chosen stage to the middle of the rail, or as close as the ends
     allow, so the first and last stages are never left half cut off. */
  function centreNode(node) {
    var over = railEl.scrollWidth - railEl.clientWidth;
    if (over <= 0) { railEl.scrollLeft = 0; return; }
    var nb = node.getBoundingClientRect(), rb = railEl.getBoundingClientRect();
    var want = railEl.scrollLeft + (nb.left - rb.left) - (rb.width - nb.width) / 2;
    railEl.scrollLeft = Math.max(0, Math.min(over, Math.round(want)));
  }

  /* Is there more rail than screen, and on which side? Drives the grab
     cursor, the drag hint and the fade on each edge. */
  function railPosition() {
    var pos = $('.railpos');
    if (!pos || !railEl) return;
    var nodes = railEl.querySelectorAll('.node');
    var at = railEl.querySelector('.node[aria-selected="true"]');
    var i = Array.prototype.indexOf.call(nodes, at);
    pos.textContent = i > -1 && nodes.length ? 'Stage ' + (i + 1) + ' of ' + nodes.length : '';
  }

  function railEdges() {
    if (!railEl) return;
    var over = railEl.scrollWidth - railEl.clientWidth;
    var more = over > 2;
    railEl.classList.toggle('grabbable', more);
    railEl.classList.toggle('rail-over', more);
    railEl.classList.toggle('can-l', more && railEl.scrollLeft > 2);
    railEl.classList.toggle('can-r', more && railEl.scrollLeft < over - 2);
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
      centreNode(active);
      if (opts.focus) active.focus();
    }
    railEdges();
    railPosition();
    main.querySelectorAll('.panel').forEach(function (pn) { pn.classList.toggle('on', pn.id === 'p-' + p.id + '-' + stage.key); });

    var i = p.stages.indexOf(stage);
    paintPager(pagerPrev, i > 0 ? p.stages[i - 1] : null, true);
    paintPager(pagerNext, i < p.stages.length - 1 ? p.stages[i + 1] : null, false);

    var hash = '#' + p.id + '/' + stage.key;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    if (!opts.silent) scrollToStageTop(opts.focus);
  }

  /**
   * Put the reader at the top of the stage they just chose.
   *
   * Measure the panel, never the controls. The controls are sticky, so once
   * the hero has scrolled away both their rect and their offsetTop describe
   * where they are pinned rather than where they belong, and the old sum
   * resolved to the current scroll position: choosing a stage from halfway
   * down a long panel left the reader exactly where they were. The panel is
   * in normal flow, so its document position is the same no matter how far
   * down the page we are.
   */
  function scrollToStageTop(instant) {
    var ctl = $('.controls');
    var panel = main && main.querySelector('.panel.on');
    if (!ctl || !panel) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var y = panel.getBoundingClientRect().top + window.scrollY - ctl.getBoundingClientRect().height - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: instant || reduce ? 'auto' : 'smooth' });
  }

  function paintPager(btn, stage, before) {
    if (!stage) { btn.textContent = ''; btn.removeAttribute('data-goto'); btn.classList.add('ghost'); return; }
    btn.textContent = before ? '←  ' + stage.name : stage.name + '  →';
    btn.setAttribute('data-goto', stage.key);
    btn.classList.remove('ghost');
  }

  /* ----------------------------------------------------------- appendices */
  var set = function (id, html) { var n = document.getElementById(id); if (n) n.innerHTML = html; return n; };
  var text = function (id, t) { var n = document.getElementById(id); if (n) n.textContent = t; };

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

  /* Plain label for a value key, for the client's table. */
  var plainKey = function (key) {
    var t = key.replace(/_/g, ' ').replace(/\be164\b/, 'international format').replace(/\bsms\b/, 'text').replace(/\burl\b/, 'link');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  function buildAppendices() {
    /* custom values */
    set('tblValues', J.customValues.map(function (v) {
      var note = CLIENT ? v.note.replace(/\{\{[^}]+\}\}/g, '').replace(/^"(.*)"$/, '$1') : v.note;
      return '<tr><td>' + (CLIENT ? esc(plainKey(v.key)) : '<code>' + esc(v.key) + '</code>') + '</td><td>' + esc(v.value) + '</td><td>' + esc(note) + '</td></tr>';
    }).join(''));

    /* message index */
    var ids = Object.keys(J.messages);
    var tbl = document.getElementById('tblMessages');
    if (tbl && AGENCY) {
      var typeTh = tbl.parentNode.querySelector('thead th:nth-child(4)');
      if (typeTh && !/Reuse/.test(typeTh.nextElementSibling.textContent)) typeTh.insertAdjacentHTML('afterend', '<th>Reuse</th>');
    }
    set('tblMessages', ids.map(function (id) {
      var m = J.messages[id];
      var where = stagesUsing(id).map(function (u) {
        var pid = u.p ? u.p.id : 'always-on';
        return '<a href="#' + pid + '/' + u.s.key + '" data-jump="' + pid + '/' + u.s.key + '">' + esc((u.p ? u.p.short + ' · ' : '') + u.s.name) + '</a>';
      }).join(', ');
      return '<tr><td>' + (CLIENT ? esc(m.channel === 'sms' ? 'Text' : 'Email') : '<code>' + esc(id) + '</code></td><td>' + (m.channel === 'sms' ? 'SMS' : 'Email')) + '</td>'
        + '<td>' + esc(m.trigger) + '<br><span style="color:var(--ink-3)">' + esc(m.delay) + '</span></td>'
        + '<td>' + (CLIENT ? (m.type === 'TRANS' ? 'About their job' : 'Marketing, opt-in only') : '<span class="chip chip--' + m.type.toLowerCase() + '">' + (m.type === 'TRANS' ? 'Trans' : 'Mktg') + '</span>') + '</td>'
        + (AGENCY ? '<td><span class="chip chip--' + m.reuse.toLowerCase() + '">' + (m.reuse === 'CORE' ? 'Core' : 'Trade') + '</span></td>' : '')
        + '<td>' + (m.channel === 'email' ? esc(m.subject) : '') + '</td><td>' + where + '</td></tr>';
    }).join(''));

    /* alerts, roles, quiet hours, compliance, build order */
    set('tblAlerts', J.alerts.map(function (a) {
      return '<tr><td class="mono">' + a.n + '</td><td><b>' + esc(a.name) + '</b><br><span style="color:var(--ink-3)">' + esc(a.why) + '</span></td><td>' + esc(a.trigger) + '</td><td>' + esc(a.to) + '</td><td>' + esc(a.channel) + '</td></tr>';
    }).join(''));
    set('tblRoles', J.roles.map(function (r) {
      return '<tr><td><code>' + esc(r.key) + '</code></td><td>' + esc(r.who) + '</td><td>' + esc(r.owns) + '</td></tr>';
    }).join(''));
    set('tblQuiet', J.quietHours.map(function (q) {
      return '<tr><td>' + esc(q.when) + '</td><td>' + esc(q.alerts) + '</td><td>' + esc(q.tasks) + '</td><td>' + esc(q.customer) + '</td></tr>';
    }).join(''));
    set('compliance', J.compliance.map(function (c) {
      return '<div class="cx"><h3>' + esc(c.title) + '</h3><p>' + esc(c.body) + '</p></div>';
    }).join(''));
    set('buildOrder', J.buildOrder.map(function (b) {
      return '<li><span><b>' + esc(b.ids) + '</b> ' + esc(b.why) + '</span></li>';
    }).join(''));

    /* agency page only: fields to create, reuse steps, go-live checklist */
    if (J.tags) set('tagList',
      '<p class="sec-lede" style="margin-bottom:1rem">' + esc(J.tags.stageRule) + '</p>'
      + '<div class="tagfam">' + J.tags.families.map(function (f) {
        return '<div class="tagfam__i"><code>' + esc(f.k) + '</code><b>' + esc(f.life) + '</b><p>' + esc(f.why) + '</p></div>';
      }).join('') + '</div>'
      + '<table class="tagtbl"><thead><tr><th>Tag</th><th>What it means</th><th>Set by</th></tr></thead><tbody>'
      + J.tags.list.map(function (t) {
        var by = (J.workflows || []).filter(function (w) { return w.tags && (w.tags.add || []).indexOf(t.t) > -1; }).map(function (w) { return w.id; });
        var off = (J.workflows || []).filter(function (w) { return w.tags && (w.tags.remove || []).indexOf(t.t) > -1; }).map(function (w) { return w.id; });
        return '<tr><td><code>' + esc(t.t) + '</code></td><td>' + esc(t.why) + '</td><td>'
          + (by.length ? by.join(', ') : '<span class="tag__none">' + esc(t.by || 'nothing sets this yet') + '</span>')
          + (off.length ? '<br><span class="tag__off">off again: ' + off.join(', ') + '</span>' : '')
          + '</td></tr>';
      }).join('') + '</tbody></table>');

    if (J.customFields) set('customFields', J.customFields.map(function (g) {
      return '<h3 class="fields__h">' + esc(g.group) + '</h3>'
        + (g.note ? '<p class="sec-lede" style="margin-bottom:.9rem">' + esc(g.note) + '</p>' : '')
        + '<div class="t-scroll" style="margin-bottom:1.6rem"><table><thead><tr>' + g.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>'
        + g.rows.map(function (r) {
          return '<tr>' + r.map(function (cell, i) {
            if (i === 0) return '<td>' + cell.split(', ').map(function (k) { return '<code>' + esc(k) + '</code>'; }).join(', ') + '</td>';
            return '<td>' + esc(cell) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }).join(''));
    if (J.reuseSteps) set('reuseSteps', J.reuseSteps.map(function (s) { return '<li><span>' + esc(s) + '</span></li>'; }).join(''));
    if (J.goLive) set('goLive', J.goLive.map(function (s) { return '<li><label class="check"><input type="checkbox"> <span>' + esc(s) + '</span></label></li>'; }).join(''));

    /* hero stats */
    var stages = 0, tasks = 0;
    J.pipelines.forEach(function (p) { p.stages.forEach(function (s) { if (!s.won) stages += 1; tasks += (s.tasks || []).length; }); });
    tasks += (J.alwaysOn.tasks || []).length;
    var emails = ids.filter(function (id) { return J.messages[id].channel === 'email'; }).length;
    text('statStages', stages);
    text('statMessages', ids.length);
    text('statEmails', emails);
    text('statSms', ids.length - emails);
    text('statTasks', tasks);
    text('statAlerts', J.alerts.length);
    text('cntAlerts', J.alerts.length);
    text('statWorkflows', (J.workflows || []).length);
    text('cntMessages', ids.length);
  }

  /* ------------------------------------------------------------ workflows */
  /* The agency's build list. Each step renders as a typed chip and its text;
     branches nest one level. Sends link to the stage that shows the message. */
  var STEP_LABEL = { do: 'Do', send: 'Send', task: 'Task', alert: 'Alert', wait: 'Wait', if: 'If', move: 'Move', set: 'Set', stop: 'Stop' };

  function msgLabel(id) {
    var m = J.messages[id];
    if (!m) return esc(id);
    var S = samplesFor('residential');
    var body = m.channel === 'email' ? m.subject : fillTokens(m.body, S);
    if (body.length > 72) body = body.slice(0, 70).replace(/\s+\S*$/, '') + '…';
    var u = stagesUsing(id)[0];
    var href = u ? 'agency.html#' + (u.p ? u.p.id : 'always-on') + '/' + u.s.key : '#';
    return '<a class="wf__msg" href="' + href + '"><code>' + esc(id) + '</code></a> <span class="wf__msgtext">' + (m.channel === 'sms' ? 'Text: ' : 'Email: ') + esc(body) + '</span>';
  }

  function stepHtml(st) {
    var S = samplesFor('residential');
    var body = '';
    switch (st.t) {
      case 'send': body = msgLabel(st.id) + (st.note ? ' <span class="wf__note">(' + esc(st.note) + ')</span>' : ''); break;
      case 'task': body = '<span class="task">' + renderTokens(st.title, 'fields', S) + '</span> <span class="role">' + esc(st.role) + '</span><span class="wf__note">due ' + esc(st.due) + '</span>'
        + (st.desc ? '<span class="desc">' + esc(st.desc) + '</span>' : ''); break;
      case 'alert': var a = J.alerts[st.n - 1]; body = '<b>' + esc(a.name) + '</b> to ' + esc(a.to) + ', by ' + esc(a.channel); break;
      case 'wait': body = esc(st.for); break;
      case 'if': body = '<b>' + esc(st.cond) + '</b>'; break;
      case 'move': body = 'Stage to <b>' + esc(st.stage) + '</b>'; break;
      case 'set': body = '<code>' + esc(st.field) + '</code> = ' + esc(st.value); break;
      case 'stop': body = esc(st.when); break;
      default: body = esc(st.text || '');
    }
    var html = '<li class="wf__step wf__step--' + st.t + '"><span class="st st--' + st.t + '">' + STEP_LABEL[st.t] + '</span><div class="wf__body">' + body;
    if (st.t === 'if') {
      html += '<ol class="wf__branch">' + (st.then || []).map(stepHtml).join('') + '</ol>';
      if (st.else && st.else.length) html += '<div class="wf__else">otherwise</div><ol class="wf__branch">' + st.else.map(stepHtml).join('') + '</ol>';
    }
    return html + '</div></li>';
  }

  function renderWorkflows() {
    var host = $('#workflows');
    if (!host || !J.workflows) return;
    var filter = 'all';
    var draw = function () {
      /* Count every step, including the ones inside branches, so the summary
         line says how big a job each workflow actually is. */
      var deepCount = function (steps) {
        return steps.reduce(function (n, s) { return n + 1 + (s.then ? deepCount(s.then) : 0) + (s.else ? deepCount(s.else) : 0); }, 0);
      };
      var shown = J.workflows.filter(function (w) { return filter === 'all' || w.board === filter || w.board === 'both'; });
      var card = function (w) {
        var boardChip = w.board === 'both' ? '<span class="chip chip--trans">Both boards</span>' : '<span class="chip chip--email">' + (w.board === 'residential' ? 'Residential' : 'Commercial') + '</span>';
        var n = deepCount(w.steps);
        var fold = (J.folders || []).filter(function (f) { return f.n === w.folder; })[0];
        return '<details class="wf" id="' + esc(w.id.toLowerCase()) + '">'
          + '<summary><div class="wf__sum"><span class="msgid">' + esc(w.id) + '</span><h3>' + esc(w.name) + '</h3>'
          + (fold ? '<span class="chip chip--fold">' + esc(fold.n + ' ' + fold.name) + '</span>' : '') + boardChip
          + '<span class="wf__when">' + esc(w.trigger) + '</span>'
          + '<span class="wf__steps-n">' + n + ' steps</span>' + ICON.chev.replace('class=', 'data-x=').replace('<svg ', '<svg class="wf__chev" ') + '</div></summary>'
          + '<div class="wf__in">'
          + '<div class="wf__trigger"><b>Trigger</b> ' + esc(w.trigger) + '</div>'
          + (w.why ? '<p class="wf__why">' + esc(w.why) + '</p>' : '')
          + '<ol class="wf__steps">' + w.steps.map(stepHtml).join('') + '</ol>'
          + (w.tags ? '<div class="wf__tags">'
            + (w.tags.add || []).map(function (t) { return '<span class="tag tag--add">+ ' + esc(t) + '</span>'; }).join('')
            + (w.tags.remove || []).map(function (t) { return '<span class="tag tag--rm">- ' + esc(t) + '</span>'; }).join('')
            + (w.tags.note ? '<span class="tag__note">' + esc(w.tags.note) + '</span>' : '')
            + '</div>' : '')
          + '<div class="wf__foot"><b>Stops</b> ' + esc(w.stops || '') + (w.error ? '<br><b>On error</b> ' + esc(w.error) : '') + '</div>'
          + '</div></details>';
      };
      /* Filed by journey phase, so someone looking for a workflow finds it by
         remembering roughly when it happens. A folder with nothing left in it
         after a board filter is not drawn at all. */
      var out = (J.folders || []).map(function (f) {
        var mine = shown.filter(function (w) { return w.folder === f.n; });
        if (!mine.length) return '';
        return '<div class="wfold">'
          + '<div class="wfold__h"><span class="wfold__n">' + esc(f.n) + '</span>'
          + '<h3>' + esc(f.name) + '</h3><span class="wfold__c">' + mine.length + '</span>'
          + '<p>' + esc(f.why) + '</p></div>'
          + mine.map(card).join('') + '</div>';
      }).join('');
      var filed = {};
      (J.folders || []).forEach(function (f) { (f.ids || []).forEach(function (i) { filed[i] = 1; }); });
      var loose = shown.filter(function (w) { return !filed[w.id]; });
      if (loose.length) out += '<div class="wfold"><div class="wfold__h"><span class="wfold__n">--</span><h3>Not filed</h3><span class="wfold__c">' + loose.length + '</span><p>These have no folder. That is a gap in the data, not a category.</p></div>' + loose.map(card).join('') + '</div>';
      host.innerHTML = out;
      text('cntWorkflows', host.querySelectorAll('.wf').length);
    };
    var seg = $('#boardSeg');
    if (seg) seg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-board]');
      if (!b) return;
      filter = b.dataset.board;
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.board === filter)); });
      draw();
    });
    draw();
    /* messages every workflow sends, for the coverage line */
    var sent = {};
    var walk = function (steps) { steps.forEach(function (s) { if (s.t === 'send') sent[s.id] = 1; if (s.then) walk(s.then); if (s.else) walk(s.else); }); };
    J.workflows.forEach(function (w) { walk(w.steps); });
    var manual = Object.keys(J.messages).filter(function (id) { return J.messages[id].manual; });
    var unsent = Object.keys(J.messages).filter(function (id) { return !sent[id] && !J.messages[id].manual; });
    text('cntSent', Object.keys(sent).length);
    set('coverage', unsent.length
      ? '<b>Not sent by any workflow:</b> ' + unsent.map(function (id) { return '<code>' + esc(id) + '</code>'; }).join(' ')
      : 'Every automated message is sent by a workflow above. ' + manual.length + ' are sent by hand from a saved template: ' + manual.map(function (id) { return '<code>' + esc(id) + '</code>'; }).join(' ') + '.');
  }

  /* ---------------------------------------------------------------- guide */
  /* The client's guide. Task and alert text is rendered with generic words in
     place of merge fields, so "CALL the customer" rather than a sample name. */
  var GENERIC = {
    'contact.first_name': 'the customer', 'contact.last_name': '', 'contact.full_name': 'the customer', 'contact.company': 'the company',
    'contact.areas': 'what needs doing', 'contact.phone': 'their number', 'contact.property_type': 'the property', 'contact.timeframe': 'their timeframe',
    'contact.postcode': 'their postcode', 'contact.utm_source': 'where they came from', 'appointment.start_time': 'the time',
    'opportunity.site_address': 'the site', 'opportunity.name': 'the job', 'opportunity.value': 'the value', 'opportunity.deposit_amount': 'the deposit',
    'message.body': 'their message', 'review.rating': '2', 'review.author': 'a customer', 'workflow.name': 'a workflow', 'error.message': 'what broke', 'time': 'the time',
  };
  function plainTokens(t) { return renderTokens(t, 'preview', Object.assign({}, samplesFor('residential'), GENERIC)).replace(/ class="pz[^"]*"/g, ''); }

  /* Role codes read as people on the client pages. */
  function roleLabel(role) {
    if (!CLIENT) return role;
    var map = { OWNER: 'Glenn', OFFICE: 'The office', ESTIMATOR: 'The estimator', CREW_LEAD: 'The crew lead', 'Assigned user': 'Whoever it is assigned to' };
    return String(role).replace(/Assigned user|OWNER|OFFICE|ESTIMATOR|CREW_LEAD/g, function (r) { return map[r] || r; });
  }

  function autoList(stage, pid) {
    var out = [];
    var seen = {};
    var S = samplesFor(pid === 'commercial' ? 'commercial' : 'residential');
    (stage.groups || []).forEach(function (g) {
      g.messages.forEach(function (id) {
        if (seen[id]) return; seen[id] = 1;
        var m = J.messages[id]; if (!m || m.manual) return;
        var label;
        if (m.channel === 'email') label = '<b>Email:</b> ' + esc(fillTokens(m.subject, S)) + ' <span class="g-when-s">' + esc(m.delay.toLowerCase()) + '</span>';
        else {
          var body = fillTokens(m.body, S);
          if (body.length > 96) body = body.slice(0, 94).replace(/\s+\S*$/, '') + '…';
          label = '<b>Text:</b> ' + esc(body) + ' <span class="g-when-s">' + esc(m.delay.toLowerCase()) + '</span>';
        }
        out.push('<li>' + label + (m.type === 'MKTG' ? ' <span class="chip chip--mktg">Only if they opted in</span>' : '') + '</li>');
      });
    });
    (stage.alerts || []).forEach(function (n) { var a = J.alerts[n - 1]; out.push('<li><b>Alert to ' + esc(roleLabel(a.to).replace(/^Whoever/, 'whoever').replace(/^The /, 'the ')) + ':</b> ' + esc(a.plain || a.name) + '</li>'); });
    if (stage.escalation) out.push('<li><b>If nobody moves it:</b> ' + esc(stage.escalation) + '</li>');
    return out.length ? '<ul class="g-list">' + out.join('') + '</ul>' : '<p class="g-none">Nothing sends here. This stage is a conversation.</p>';
  }
  function youList(stage) {
    var out = (stage.clientDo || []).map(function (s) { return '<li>' + esc(s) + '</li>'; });
    var html = out.length ? '<ul class="g-list g-list--you">' + out.join('') + '</ul>' : '<p class="g-none">Nothing. It runs by itself.</p>';
    /* The same thing again, as it will appear in their task list: the title
       they will see, and the description sitting inside it. */
    if ((stage.tasks || []).length) {
      html += '<h4 class="g-tasks__h">In your task list</h4><div class="g-tasks">'
        + stage.tasks.map(function (t) {
          return '<div class="g-task"><div class="g-task__t">' + esc(plainTokens(t.title).replace(/<[^>]+>/g, '')) + '</div>'
            + '<div class="g-task__m">' + esc(roleLabel(t.role)) + ' · due ' + esc(t.due) + '</div>'
            + (t.desc ? '<p class="g-task__d">' + esc(t.desc) + '</p>' : '') + '</div>';
        }).join('') + '</div>';
    }
    return html;
  }

  function renderGuide() {
    var host = $('#guideStages');
    if (!host || !J.guide) return;
    var g = J.guide;
    set('gPrincipleTitle', esc(g.principle.title));
    set('gPrincipleBody', esc(g.principle.body));
    set('gRoutine', g.routine.map(function (r) { return '<div class="g-row"><div class="g-when">' + esc(r.when) + '</div><div>' + esc(r.what) + '</div></div>'; }).join(''));
    set('gAlerts', J.alerts.map(function (a) {
      return '<tr><td><b>' + esc(a.name) + '</b><br><span style="color:var(--ink-3)">' + esc(a.plain || a.trigger) + '</span></td><td>' + esc(roleLabel(a.to)) + '</td><td>' + esc(g.alertActions[a.n] || '') + '</td></tr>';
    }).join(''));
    set('gHowTo', g.howTo.map(function (h) { return '<div class="cx"><h3>' + esc(h.title) + '</h3><p>' + esc(h.body) + '</p></div>'; }).join(''));
    set('gNever', g.never.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join(''));
    set('gIfNothing', g.ifNothing.map(function (r) { return '<div class="g-row"><div class="g-when">' + esc(r.when) + '</div><div>' + esc(r.then) + '</div></div>'; }).join(''));
    set('gAsk', g.ask.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join(''));

    var pid = 'residential';
    var draw = function () {
      var p = pipelineById(pid);
      host.innerHTML = p.stages.map(function (s, i) {
        var num = s.won ? 'Won' : s.n ? String(s.n).padStart(2, '0') : 'All';
        var todo = (s.clientDo || []).length;
        return '<details class="g-stage' + (s.won ? ' g-stage--won' : '') + '"' + (i === 0 ? ' open' : '') + '>'
          + '<summary><div class="g-stage__head"><span class="badge' + (s.won ? ' won' : '') + '">' + esc(num) + '</span>'
          + '<div><h3>' + esc(s.name) + '</h3><p>' + esc(s.means || s.headline) + '</p></div>'
          + '<span class="g-stage__count">' + (todo ? '<b>' + todo + '</b> for you' : 'nothing for you') + '</span>'
          + ICON.chev.replace('<svg ', '<svg class="g-stage__chev" ') + '</div></summary>'
          + '<div class="g-cols"><div class="g-col"><h4>Happens by itself</h4>' + autoList(s, pid) + '</div><div class="g-col g-col--you"><h4>You do</h4>' + youList(s) + '</div></div>'
          + '</details>';
      }).join('');
    };
    var seg = $('#guideSeg');
    if (seg) {
      seg.innerHTML = J.pipelines.map(function (p) { return '<button type="button" data-pipeline="' + p.id + '" aria-pressed="' + (p.id === pid) + '">' + esc(p.name) + '</button>'; }).join('')
        + '<button type="button" data-pipeline="always-on" aria-pressed="false">Any time</button>';
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-pipeline]');
        if (!b) return;
        pid = b.dataset.pipeline;
        seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.pipeline === pid)); });
        draw();
      });
    }
    draw();
  }

  /* ------------------------------------------------------------- events */
  if (segEl) segEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-pipeline]');
    if (b) activate(b.dataset.pipeline, null);
  });

  if (railEl) {
    railEl.addEventListener('click', function (e) {
      var b = e.target.closest('.node');
      if (b) activate(state.pipeline, b.dataset.stage);
    });

    /* Press and pull the rail sideways. Touch scrolls it natively already, so
       only a mouse or a pen is handled here. A press has to travel past a few
       pixels before it counts as a drag, and a drag must not pick the stage it
       happened to finish on. */
    var grab = null, moved = false;
    railEl.addEventListener('pointerdown', function (e) {
      moved = false;
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (railEl.scrollWidth - railEl.clientWidth < 3) return;
      grab = { x: e.clientX, left: railEl.scrollLeft, id: e.pointerId };
    });
    railEl.addEventListener('pointermove', function (e) {
      if (!grab || e.pointerId !== grab.id) return;
      var dx = e.clientX - grab.x;
      if (!moved) {
        if (Math.abs(dx) < 6) return;
        moved = true;
        railEl.classList.add('dragging');
        try { railEl.setPointerCapture(grab.id); } catch (err) { /* older engines */ }
      }
      railEl.scrollLeft = grab.left - dx;
      railEdges();
      e.preventDefault();
    });
    function letGo(e) {
      if (!grab || (e && e.pointerId !== undefined && e.pointerId !== grab.id)) return;
      try { railEl.releasePointerCapture(grab.id); } catch (err) { /* already gone */ }
      grab = null;
      railEl.classList.remove('dragging');
    }
    railEl.addEventListener('pointerup', letGo);
    railEl.addEventListener('pointercancel', letGo);
    railEl.addEventListener('lostpointercapture', letGo);
    railEl.addEventListener('dragstart', function (e) { e.preventDefault(); });
    railEl.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
    railEl.addEventListener('scroll', railEdges, { passive: true });
    window.addEventListener('resize', railEdges);
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
  }

  [pagerPrev, pagerNext].forEach(function (b) {
    if (b) b.addEventListener('click', function () { var g = b.getAttribute('data-goto'); if (g) activate(state.pipeline, g); });
  });

  document.addEventListener('click', function (e) {
    var c = e.target.closest('button[data-copy]');
    if (c) { var id = c.dataset.copy; copyToClipboard(copyText(J.messages[id], id), c); return; }
    var a = e.target.closest('button[data-acc]');
    if (a) {
      var open = a.dataset.acc === 'open';
      document.querySelectorAll(a.dataset.target).forEach(function (d) { d.open = open; });
      return;
    }
    var j = e.target.closest('a[data-jump]');
    if (j && main) { e.preventDefault(); var parts = j.dataset.jump.split('/'); activate(parts[0], parts[1]); }
  });

  /* Open the workflow named in the address, so a link to WF-14 lands on it
     expanded rather than on a closed row the reader has to hunt for. */
  function openFromHash() {
    var id = location.hash.replace(/^#/, '');
    if (!id) return;
    var t = document.getElementById(id);
    if (t && t.tagName === 'DETAILS') {
      t.open = true;
      t.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }

  /* Which section of a long page am I in? Only used where there is a jump
     menu to light up. */
  function spy(navSel, sectionSel) {
    var nav = $(navSel);
    if (!nav || !('IntersectionObserver' in window)) return;
    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        if (links[en.target.id]) links[en.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll(sectionSel).forEach(function (s) { if (s.id) io.observe(s); });
  }

  if ($('#viewSeg')) $('#viewSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.dataset.view;
    try { localStorage.setItem(VIEW_KEY, state.view); } catch (err) {}
    $('#viewSeg').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.view === state.view)); });
    renderAll();
    activate(state.pipeline, state.stage, { silent: true });
  });

  if ($('#themeBtn')) $('#themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
    try { localStorage.setItem('journey:theme', dark ? 'light' : 'dark'); } catch (err) {}
  });
  if ($('#printBtn')) $('#printBtn').addEventListener('click', function () { window.print(); });

  function fromHash(scroll) {
    var h = location.hash.replace(/^#/, '').split('/');
    var pid = h[0] || 'residential', sk = h[1] || null;
    if (!pipelineById(pid)) pid = 'residential';
    activate(pid, sk, { silent: !scroll });
  }
  if (main) window.addEventListener('hashchange', function () { fromHash(true); });

  /* --------------------------------------------------------------- boot */
  try { var t = localStorage.getItem('journey:theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  if ($('#viewSeg')) $('#viewSeg').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.view === state.view)); });
  if (CLIENT) state.view = 'preview';
  renderPageNav();
  buildAppendices();
  renderWorkflows();
  renderGuide();
  if (main) {
    buildSeg();
    renderAll();
    fromHash(false);
    /* The web fonts land after the first measure, and the rail gets wider when
       they do. Put the chosen stage back in the middle once that has settled,
       or the last stage sits a few pixels off the end. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      var a = railEl && railEl.querySelector('.node[aria-selected="true"]');
      if (a) centreNode(a);
      railEdges();
    });
  } else {
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    spy('#gnav', '.gsec');
  }
})();

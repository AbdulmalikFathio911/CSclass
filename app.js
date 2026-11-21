(function () {
  'use strict';

  /* مفتاح التخزين وشكل البيانات ثابتين:
     { "v": 1, "lectures": { "<id>": true }, "psets": { "<id>": "todo" | "doing" | "done" } } */
  var KEY = 'masar-v1';
  var D = window.MASAR_DATA;
  var STATUS = { todo: 'لم يبدأ', doing: 'قيد العمل', done: 'مكتمل' };
  var TABS = ['home', 'lectures', 'psets', 'settings'];

  var state = load();
  var filter = 'all';
  var tab = 'home';

  /* ---------- أدوات ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* نص إنجليزي معزول الاتجاه داخل واجهة عربية */
  function en(text, block) {
    return '<bdi dir="ltr" lang="en" class="en' + (block ? ' en-block' : '') + '">' + esc(text) + '</bdi>';
  }

  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  }

  function lecture(id) {
    id = Number(id);
    for (var i = 0; i < D.lectures.length; i++) if (D.lectures[i].id === id) return D.lectures[i];
    return null;
  }

  function pset(id) {
    for (var i = 0; i < D.psets.length; i++) if (D.psets[i].id === id) return D.psets[i];
    return null;
  }

  /* ---------- التخزين ---------- */
  function blank() { return { v: 1, lectures: {}, psets: {} }; }

  /* يرجّع نسخة نظيفة بنفس الشكل، أو null لو المدخل مش صالح */
  function normalize(o) {
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    if (!o.lectures || typeof o.lectures !== 'object' || !o.psets || typeof o.psets !== 'object') return null;
    var out = blank();
    D.lectures.forEach(function (l) { if (o.lectures[l.id] === true) out.lectures[l.id] = true; });
    D.psets.forEach(function (p) {
      var s = o.psets[p.id];
      if (s === 'todo' || s === 'doing' || s === 'done') out.psets[p.id] = s;
    });
    return out;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return (raw && normalize(JSON.parse(raw))) || blank();
    } catch (e) {
      return blank();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('تعذّر الحفظ على هذا الجهاز.');
      return false;
    }
  }

  function psetStatus(id) { return state.psets[id] || 'todo'; }
  function lecturesDone() { return D.lectures.filter(function (l) { return state.lectures[l.id]; }).length; }
  function psetsDone() { return D.psets.filter(function (p) { return psetStatus(p.id) === 'done'; }).length; }

  /* ---------- العرض ---------- */
  function badge(status) {
    return '<span class="badge badge-' + status + '">' + STATUS[status] + '</span>';
  }

  function psetMeta(p) {
    if (!p.due) return 'يُطرح مع المحاضرة ' + p.out + ' · غير مقيّم';
    return 'يُطرح مع المحاضرة ' + p.out + ' · التسليم مع المحاضرة ' + p.due;
  }

  function renderHome() {
    var total = D.lectures.length;
    var done = lecturesDone();
    var pct = Math.round((done / total) * 100);
    var next = D.lectures.filter(function (l) { return !state.lectures[l.id]; })[0];
    var ps = D.psets.filter(function (p) { return psetStatus(p.id) !== 'done'; })[0];

    var html = '' +
      '<div class="hero">' +
        '<p class="hero-kicker">' + en(D.course.code + ' · ' + D.course.term) + '</p>' +
        '<h2 class="hero-title">' + en(D.course.title, true) + '</h2>' +
        '<div class="hero-progress">' +
          '<p class="hero-pct"><bdi dir="ltr" class="en">' + pct + '%</bdi></p>' +
          '<p class="hero-count">' + done + ' من ' + total + ' محاضرة</p>' +
        '</div>' +
        '<div class="bar" role="progressbar" aria-label="نسبة إنجاز المحاضرات" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
      '</div>';

    if (next) {
      html += '' +
        '<section class="card" id="next-card" aria-labelledby="next-h">' +
          '<h2 class="label" id="next-h">الخطوة الجاية</h2>' +
          '<p class="meta">المحاضرة ' + next.id + ' · الأسبوع ' + next.week + '</p>' +
          '<p class="title-lg" id="next-title">' + en(next.title, true) + '</p>' +
          '<div class="actions">' +
            '<button class="btn btn-primary grow" type="button" data-action="toggle-lecture" data-id="' + next.id + '" data-fid="next-done">' + ic('check') + '<span>علّمها مكتملة</span></button>' +
            '<button class="btn-icon" type="button" data-action="open-lecture" data-id="' + next.id + '" data-fid="next-info" aria-label="تفاصيل المحاضرة ' + next.id + '">' + ic('info') + '</button>' +
          '</div>' +
        '</section>';
    } else {
      html += '' +
        '<section class="card" id="next-card" aria-labelledby="next-h">' +
          '<h2 class="label" id="next-h">الخطوة الجاية</h2>' +
          '<p class="title-lg">أكملت كل المحاضرات</p>' +
          '<p class="body">أحسنت. راجع الواجبات المتبقية إن وُجدت.</p>' +
        '</section>';
    }

    html += '' +
      '<div class="tiles">' +
        '<div class="tile tile-a"><p class="tile-num"><bdi dir="ltr" class="en">' + done + '/' + total + '</bdi></p><p class="tile-label">محاضرات مكتملة</p></div>' +
        '<div class="tile tile-b"><p class="tile-num"><bdi dir="ltr" class="en">' + psetsDone() + '/' + D.psets.length + '</bdi></p><p class="tile-label">واجبات مكتملة</p></div>' +
        '<div class="tile tile-c"><p class="tile-num">' + (total - done) + '</p><p class="tile-label">محاضرات باقية</p></div>' +
      '</div>';

    if (ps) {
      html += '' +
        '<button class="link-card" type="button" data-action="open-pset" data-id="' + ps.id + '" data-fid="home-ps">' +
          '<span class="link-card-text">' +
            '<span class="label">الواجب الحالي</span>' +
            '<span class="title-md">' + en(ps.title, true) + '</span>' +
            '<span class="meta">' + psetMeta(ps) + '</span>' +
          '</span>' +
          badge(psetStatus(ps.id)) +
          ic('chev', 'chev') +
        '</button>';
    }

    $('#screen-home').innerHTML = html;
  }

  function renderLectures() {
    var total = D.lectures.length;
    var done = lecturesDone();
    var chips = [['all', 'الكل', total], ['left', 'الباقي', total - done], ['done', 'المكتملة', done]];

    var html = '<div class="chips" role="group" aria-label="تصفية المحاضرات">' +
      chips.map(function (c) {
        return '<button class="chip" type="button" data-action="filter" data-f="' + c[0] + '" data-fid="f-' + c[0] + '" aria-pressed="' + (filter === c[0]) + '">' +
          '<span>' + c[1] + '</span><span class="chip-n">' + c[2] + '</span></button>';
      }).join('') + '</div>';

    var shown = D.lectures.filter(function (l) {
      var isDone = !!state.lectures[l.id];
      return filter === 'all' || (filter === 'done' ? isDone : !isDone);
    });

    if (!shown.length) {
      html += '<p class="empty">' + (filter === 'done' ? 'لا توجد محاضرات مكتملة بعد.' : 'لا توجد محاضرات باقية. أكملتها كلها.') + '</p>';
    } else {
      var weeks = [];
      shown.forEach(function (l) {
        var last = weeks[weeks.length - 1];
        if (!last || last.week !== l.week) weeks.push({ week: l.week, items: [l] });
        else last.items.push(l);
      });
      html += weeks.map(function (w) {
        return '<div class="group"><h2 class="week">الأسبوع ' + w.week + '</h2><ul class="list">' +
          w.items.map(function (l) {
            var isDone = !!state.lectures[l.id];
            return '<li class="lec" data-lec="' + l.id + '">' +
              '<button class="check" type="button" role="checkbox" aria-checked="' + isDone + '" aria-label="المحاضرة ' + l.id + ' مكتملة" data-action="toggle-lecture" data-id="' + l.id + '" data-fid="chk-' + l.id + '">' +
                '<span class="box">' + ic('check') + '</span></button>' +
              '<button class="lec-main" type="button" data-action="open-lecture" data-id="' + l.id + '" data-fid="lec-' + l.id + '">' +
                '<span class="lec-num"><span class="vh">المحاضرة </span>' + l.id + '</span>' +
                '<span class="lec-title">' + en(l.title, true) + '</span>' +
                ic('chev', 'chev') +
              '</button></li>';
          }).join('') + '</ul></div>';
      }).join('');
    }

    $('#screen-lectures').innerHTML = html;
  }

  function segHtml(p, prefix) {
    var cur = psetStatus(p.id);
    return '<div class="seg" role="radiogroup" aria-label="حالة ' + esc(p.title) + '">' +
      ['todo', 'doing', 'done'].map(function (s) {
        return '<button class="seg-btn" type="button" role="radio" aria-checked="' + (cur === s) + '" data-action="set-pset" data-id="' + p.id + '" data-s="' + s + '" data-fid="' + prefix + '-' + p.id + '-' + s + '">' + STATUS[s] + '</button>';
      }).join('') + '</div>';
  }

  function renderPsets() {
    $('#screen-psets').innerHTML = D.psets.map(function (p) {
      return '<article class="card pset" data-ps="' + p.id + '">' +
        '<button class="pset-head" type="button" data-action="open-pset" data-id="' + p.id + '" data-fid="ps-' + p.id + '">' +
          '<span class="pset-text"><span class="title-md">' + en(p.title, true) + '</span><span class="meta">' + psetMeta(p) + '</span></span>' +
          badge(psetStatus(p.id)) + ic('chev', 'chev') +
        '</button>' +
        segHtml(p, 'seg') +
      '</article>';
    }).join('');
  }

  function render() {
    var active = document.activeElement;
    var fid = active && active.dataset ? active.dataset.fid : null;
    renderHome();
    renderLectures();
    renderPsets();
    if (sheetKind) renderSheet();
    if (fid) {
      var again = document.querySelector('[data-fid="' + fid + '"]');
      if (again && again.offsetParent !== null) again.focus({ preventScroll: true });
    }
  }

  /* ---------- التبويبات ---------- */
  function showTab(name, keepScroll) {
    if (TABS.indexOf(name) === -1) name = 'home';
    tab = name;
    TABS.forEach(function (t) {
      $('#screen-' + t).hidden = t !== name;
      var btn = $('.tab[data-tab="' + t + '"]');
      if (t === name) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    $('#screen-title').textContent = $('#screen-' + name).dataset.title;
    if (!keepScroll) window.scrollTo(0, 0);
    try { history.replaceState(null, '', name === 'home' ? location.pathname + location.search : '#' + name); } catch (e) { /* تجاهل */ }
  }

  /* ---------- الرسائل ---------- */
  var toastTimer;
  function toast(html) {
    var t = $('#toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* ---------- الورقة السفلية ---------- */
  var sheet = $('#sheet');
  var sheetBody = $('#sheet-body');
  var sheetHead = $('#sheet-head');
  var backdrop = $('#backdrop');
  var sheetKind = null;
  var sheetId = null;
  var opener = null;
  var closeTimer;

  function lectureSheet(l) {
    var isDone = !!state.lectures[l.id];
    var events = [];
    D.psets.forEach(function (p) {
      if (p.out === l.id) events.push('يُطرح ' + en(p.title) + (p.graded ? '' : ' (غير مقيّم)'));
      if (p.half === l.id) events.push('تسليم منتصف ' + en(p.title));
      if (p.due === l.id) events.push('التسليم النهائي لـ ' + en(p.title));
    });
    return '' +
      '<div class="row-between"><p class="meta">المحاضرة ' + l.id + ' · الأسبوع ' + l.week + '</p>' +
        '<span class="badge badge-' + (isDone ? 'done' : 'todo') + '">' + (isDone ? 'مكتملة' : 'غير مكتملة') + '</span></div>' +
      '<h2 class="title-lg" id="sheet-title">' + en(l.title, true) + '</h2>' +
      (events.length ? '<ul class="facts">' + events.map(function (e) { return '<li class="body">' + e + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="stack">' +
        '<button class="btn ' + (isDone ? 'btn-secondary' : 'btn-primary') + '" type="button" data-action="toggle-lecture" data-id="' + l.id + '" data-fid="sheet-toggle">' +
          (isDone ? '<span>رجّعها غير مكتملة</span>' : ic('check') + '<span>علّمها مكتملة</span>') + '</button>' +
        '<a class="btn btn-secondary" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + ic('ext') + '<span>صفحة المحاضرة على ' + en('OCW') + '</span></a>' +
      '</div>';
  }

  function psetSheet(p) {
    function fact(k, n) {
      var l = lecture(n);
      return '<li class="fact"><span class="fact-k">' + k + '</span><span>المحاضرة ' + n + ' · الأسبوع ' + l.week + '</span></li>';
    }
    var facts = fact('الطرح', p.out);
    if (p.half) facts += fact('تسليم المنتصف', p.half);
    if (p.due) facts += fact('التسليم النهائي', p.due);
    return '' +
      '<div class="row-between"><p class="meta">' + (p.graded ? 'واجب مقيّم' : 'واجب غير مقيّم') + '</p>' + badge(psetStatus(p.id)) + '</div>' +
      '<h2 class="title-lg" id="sheet-title">' + en(p.title, true) + '</h2>' +
      '<ul class="facts">' + facts + '</ul>' +
      '<p class="meta">المواعيد حسب جدول الكورس الأصلي: محاضرات وأسابيع، بدون تواريخ.</p>' +
      segHtml(p, 'sheetseg') +
      '<a class="btn btn-secondary" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + ic('ext') + '<span>ملف الواجب على ' + en('OCW') + '</span></a>';
  }

  function clearSheet() {
    return '' +
      '<h2 class="title-lg" id="sheet-title">مسح كل البيانات؟</h2>' +
      '<p class="body">سيُحذف تقدّمك في ' + lecturesDone() + ' محاضرة وحالات الواجبات من هذا الجهاز. لا يمكن التراجع.</p>' +
      '<div class="stack">' +
        '<button class="btn btn-danger" type="button" data-action="clear" data-fid="clear-yes">' + ic('trash') + '<span>نعم، امسح</span></button>' +
        '<button class="btn btn-secondary" type="button" data-action="close-sheet" data-fid="clear-no">إلغاء</button>' +
      '</div>';
  }

  function renderSheet() {
    if (sheetKind === 'lecture') sheetBody.innerHTML = lectureSheet(lecture(sheetId));
    else if (sheetKind === 'pset') sheetBody.innerHTML = psetSheet(pset(sheetId));
    else if (sheetKind === 'clear') sheetBody.innerHTML = clearSheet();
  }

  function setInert(on) {
    ['#appbar', '#main', '#tabbar'].forEach(function (sel) {
      var el = $(sel);
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function openSheet(kind, id, from) {
    clearTimeout(closeTimer);
    sheetKind = kind;
    sheetId = id;
    opener = from || document.activeElement;
    renderSheet();
    sheet.hidden = false;
    backdrop.hidden = false;
    sheet.style.transform = '';
    sheetBody.scrollTop = 0;
    void sheet.offsetHeight;
    sheet.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    setInert(true);
    $('.sheet-close').focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!sheetKind) return;
    sheetKind = null;
    sheetId = null;
    sheet.classList.remove('open', 'dragging');
    sheet.style.transform = '';
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setInert(false);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      sheet.hidden = true;
      backdrop.hidden = true;
      sheetBody.innerHTML = '';
    }, 260);
    var back = opener && opener.dataset && opener.dataset.fid
      ? document.querySelector('[data-fid="' + opener.dataset.fid + '"]')
      : opener;
    opener = null;
    if (back && back.focus && back.offsetParent !== null) back.focus({ preventScroll: true });
  }

  /* السحب للأسفل من رأس الورقة */
  var drag = null;
  sheetHead.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    drag = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 };
    try { sheetHead.setPointerCapture(e.pointerId); } catch (err) { /* تجاهل */ }
    sheet.classList.add('dragging');
  });
  sheetHead.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    sheet.style.transform = 'translateY(' + drag.dy + 'px)';
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = drag.dy;
    var speed = dy / Math.max(1, e.timeStamp - drag.t);
    drag = null;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    if (e.type === 'pointerup' && (dy > 96 || (dy > 24 && speed > 0.6))) closeSheet();
  }
  sheetHead.addEventListener('pointerup', endDrag);
  sheetHead.addEventListener('pointercancel', endDrag);

  backdrop.addEventListener('click', closeSheet);

  document.addEventListener('keydown', function (e) {
    if (!sheetKind) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var items = sheet.querySelectorAll('button, a[href]');
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- النسخة الاحتياطية ---------- */
  function exportData() {
    var payload = JSON.stringify({ app: 'masar', v: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
    var name = 'masar-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    var file = null;
    try { file = new File([payload], name, { type: 'application/json' }); } catch (e) { file = null; }

    function download() {
      var url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.hidden = true;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast('تم تنزيل النسخة الاحتياطية.');
    }

    /* على الآيفون ورقة المشاركة أضمن من التنزيل المباشر داخل التطبيق المثبّت */
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'نسخة احتياطية - مسار' }).then(function () {
        toast('تم تجهيز النسخة الاحتياطية.');
      }).catch(function (err) {
        if (!err || err.name !== 'AbortError') download();
      });
    } else {
      download();
    }
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var next = null;
      try {
        var parsed = JSON.parse(String(reader.result));
        next = normalize(parsed && parsed.data ? parsed.data : parsed);
      } catch (e) {
        next = null;
      }
      if (!next) { toast('الملف ليس نسخة احتياطية صالحة من مسار.'); return; }
      state = next;
      save();
      render();
      toast('تم الاسترجاع: ' + lecturesDone() + ' محاضرة و ' + psetsDone() + ' واجب مكتمل.');
    };
    reader.onerror = function () { toast('تعذّرت قراءة الملف.'); };
    reader.readAsText(file);
  }

  $('#import-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (f) importData(f);
    e.target.value = '';
  });

  /* ---------- الأحداث ---------- */
  var actions = {
    'tab': function (el) { showTab(el.dataset.tab); },

    'filter': function (el) { filter = el.dataset.f; render(); },

    'toggle-lecture': function (el) {
      var l = lecture(el.dataset.id);
      if (!l) return;
      if (state.lectures[l.id]) {
        delete state.lectures[l.id];
        toast('المحاضرة ' + l.id + ' رجعت غير مكتملة: ' + en(l.title));
      } else {
        state.lectures[l.id] = true;
        toast('تمّت المحاضرة ' + l.id + ': ' + en(l.title));
      }
      save();
      render();
    },

    'open-lecture': function (el) { openSheet('lecture', Number(el.dataset.id), el); },

    'open-pset': function (el) { openSheet('pset', el.dataset.id, el); },

    'set-pset': function (el) {
      var p = pset(el.dataset.id);
      var s = el.dataset.s;
      if (!p || !STATUS[s]) return;
      state.psets[p.id] = s;
      save();
      render();
      toast(en(p.title) + ': ' + STATUS[s]);
    },

    'close-sheet': function () { closeSheet(); },

    'export': function () { exportData(); },

    'import': function () { $('#import-file').click(); },

    'ask-clear': function (el) { openSheet('clear', null, el); },

    'clear': function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* تجاهل */ }
      state = blank();
      filter = 'all';
      closeSheet();
      render();
      toast('تم مسح كل البيانات.');
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || !actions[el.dataset.action]) return;
    actions[el.dataset.action](el);
  });

  /* ---------- التشغيل ---------- */
  render();
  showTab((location.hash || '').slice(1) || 'home', true);

  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) {
    $('#install-steps').hidden = true;
    $('#install-state').hidden = false;
  }

  /* طلب تخزين دائم حتى لا يمسح المتصفح البيانات تلقائياً */
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () { /* تجاهل */ });
  }

  function showVersion() {
    if (!window.caches) return;
    caches.keys().then(function (keys) {
      var k = keys.filter(function (x) { return x.indexOf('masar-cache-') === 0; }).sort().pop();
      if (k) $('#version').textContent = k.replace('masar-cache-', '');
    }).catch(function () { /* تجاهل */ });
  }

  if ('serviceWorker' in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      /* نسخة جديدة استلمت: نعيد التحميل مرة واحدة حتى تظهر الملفات الجديدة */
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
      else showVersion();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function () {
        return navigator.serviceWorker.ready;
      }).then(showVersion).catch(function () { /* التطبيق يخدم بدون عامل الخدمة */ });
    });
  }
})();

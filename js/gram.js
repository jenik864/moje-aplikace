'use strict';
/*
 * FIFAgram – sociální síť hráčů FIFA67. Každý má profil se svou postavou, přidává fotky
 * vyfocené ve hře (klub Hot Peppers) a textové příspěvky, ostatní dávají lajky a komentáře.
 * Příspěvky, lajky a komentáře jsou uložené zprávy (retained) na stejných MQTT serverech jako žebříček.
 */

const GRAM_NS = 'fifa67/gram/v1/';
const GRAM_PHOTOS_KEY = 'hlavouni.fotky';
const GRAM_SEEN_KEY = 'hlavouni.gramVideno';
const GRAM_BGS = [
  'linear-gradient(135deg,#ff2f6e,#ff9a3c)',
  'linear-gradient(135deg,#6a2cff,#2fb8ff)',
  'linear-gradient(135deg,#0f9b6a,#b6f04a)',
  'linear-gradient(135deg,#111018,#5a0c1e)',
  'linear-gradient(135deg,#ffcf3a,#ff6a3d)',
];
const GRAM_MAX_IMG = 140000;

const Gram = {
  posts: new Map(),    // id -> příspěvek
  likes: new Map(),    // postId -> Set(userId)
  comments: new Map(), // postId -> Map(commentId -> komentář)
  conns: [],
  on: false,
  view: 'feed',
  who: '',             // čí profil se zobrazuje
  draft: null,

  /* ---------- místní galerie fotek z klubu ---------- */

  photos() {
    try {
      const a = JSON.parse(localStorage.getItem(GRAM_PHOTOS_KEY));
      return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.startsWith('data:image/jpeg')) : [];
    } catch (e) {
      return [];
    }
  },
  // Uložit zmenšenou fotku z klubu (posledních 12).
  savePhoto(canvas) {
    const c = document.createElement('canvas'), w = 560, h = Math.round((canvas.height / canvas.width) * w);
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(canvas, 0, 0, w, h);
    let url = c.toDataURL('image/jpeg', 0.72);
    if (url.length > GRAM_MAX_IMG) url = c.toDataURL('image/jpeg', 0.5);
    const list = [url, ...this.photos()].slice(0, 12);
    for (let n = list.length; n > 0; n--) {
      try {
        localStorage.setItem(GRAM_PHOTOS_KEY, JSON.stringify(list.slice(0, n)));
        break;
      } catch (e) { /* plné úložiště: uložit méně */ }
    }
    return url;
  },

  /* ---------- síť ---------- */

  me() {
    const ch = Board.favChar();
    return { id: Board.myId(), nick: Board.nick() || 'Hráč', ch, sk: mySkinFor(ch) };
  },

  connect() {
    if (this.conns.length) return;
    this.status = 'connecting';
    const take = (topic, text) => this.take(topic, text);
    for (const u of Board.urls()) {
      mqttConnect(u, 'f67g' + randomId(8), take).then((c) => {
        if (!this.on) {
          c.close();
          return;
        }
        this.conns.push(c);
        this.status = 'online';
        c.subscribe(GRAM_NS + 'p/#');
        c.subscribe(GRAM_NS + 'l/#');
        c.subscribe(GRAM_NS + 'c/#');
        c.onClose = () => {
          this.conns = this.conns.filter((x) => x !== c);
        };
        this.dirty();
      }).catch(() => {
        if (!this.conns.length) this.status = 'offline';
        this.dirty();
      });
    }
  },
  disconnect() {
    for (const c of this.conns) {
      try { c.close(); } catch (e) { /* nevadí */ }
    }
    this.conns = [];
  },

  // Poslat na všechny servery (když nejsou připojené, připojit se na chvilku).
  send(topic, text) {
    if (this.conns.length) {
      for (const c of this.conns) c.publish(topic, text, true);
      return Promise.resolve(true);
    }
    return Promise.allSettled(Board.urls().map((u) => mqttConnect(u, 'f67s' + randomId(8), () => {}).then((c) => {
      c.publish(topic, text, true);
      setTimeout(() => c.close(), 1500);
    }))).then((r) => r.some((x) => x.status === 'fulfilled'));
  },

  take(topic, text) {
    if (!topic.startsWith(GRAM_NS)) return;
    const parts = topic.slice(GRAM_NS.length).split('/');
    const kind = parts[0];
    if (kind === 'p' && parts.length === 3) {
      const id = parts[2];
      if (!text) {
        this.posts.delete(id);
      } else {
        const p = this.cleanPost(text, parts[1], id);
        if (p) {
          const old = this.posts.get(id);
          if (!old || p.ts >= old.ts) this.posts.set(id, p);
        }
      }
    } else if (kind === 'l' && parts.length === 3) {
      const [, pid, uid] = parts;
      if (!/^[a-z0-9]{4,16}$/i.test(pid) || !/^[a-z0-9]{4,16}$/i.test(uid)) return;
      if (!this.likes.has(pid)) this.likes.set(pid, new Set());
      if (text === '1') this.likes.get(pid).add(uid);
      else this.likes.get(pid).delete(uid);
    } else if (kind === 'c' && parts.length === 3) {
      const [, pid, cid] = parts;
      if (!this.comments.has(pid)) this.comments.set(pid, new Map());
      if (!text) this.comments.get(pid).delete(cid);
      else {
        const c = this.cleanComment(text);
        if (c) this.comments.get(pid).set(cid, c);
      }
    }
    this.dirty();
  },

  cleanPost(text, by, id) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== 'object' || o.by !== by || o.id !== id) return null;
    if (!/^[a-z0-9]{4,16}$/i.test(by) || !/^[a-z0-9]{4,16}$/i.test(id)) return null;
    const img = typeof o.img === 'string' && o.img.startsWith('data:image/jpeg;base64,') && o.img.length <= GRAM_MAX_IMG ? o.img : '';
    const t = String(o.text || '').slice(0, 220);
    if (!img && !t) return null;
    const ch = ROSTER.some((c) => c.id === o.ch) ? o.ch : 'jenda';
    return {
      id, by, img, text: t, bg: Math.max(0, Math.min(GRAM_BGS.length - 1, Math.floor(Number(o.bg) || 0))),
      cap: String(o.cap || '').slice(0, 220), nick: cleanName(o.nick || 'Hráč') || 'Hráč', ch, sk: SKINS[o.sk] && SKINS[o.sk].char === ch ? o.sk : '',
      ts: Math.min(Date.now() + 60000, Math.max(0, Number(o.ts) || 0)),
    };
  },
  cleanComment(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;
    const t = String(o.text || '').slice(0, 160).trim();
    if (!t) return null;
    return { by: String(o.by || '').slice(0, 16), nick: cleanName(o.nick || 'Hráč') || 'Hráč', text: t, ts: Number(o.ts) || 0 };
  },

  publishPost(d) {
    const me = this.me(), id = randomId(10).toLowerCase().replace(/[^a-z0-9]/g, 'x');
    const post = { v: 1, id, by: me.id, nick: me.nick, ch: me.ch, sk: me.sk, ts: Date.now(), img: d.img || '', text: d.text || '', bg: d.bg || 0, cap: d.cap || '' };
    this.posts.set(id, this.cleanPost(JSON.stringify(post), me.id, id));
    this.dirty();
    return this.send(`${GRAM_NS}p/${me.id}/${id}`, JSON.stringify(post));
  },
  deletePost(p) {
    if (p.by !== Board.myId()) return;
    this.posts.delete(p.id);
    this.send(`${GRAM_NS}p/${p.by}/${p.id}`, '');
    this.dirty();
  },
  toggleLike(p) {
    const me = Board.myId(), set = this.likes.get(p.id) || new Set();
    const on = !set.has(me);
    if (on) set.add(me);
    else set.delete(me);
    this.likes.set(p.id, set);
    this.send(`${GRAM_NS}l/${p.id}/${me}`, on ? '1' : '');
    this.dirty();
    return on;
  },
  addComment(p, text) {
    const t = String(text || '').trim().slice(0, 160);
    if (!t) return;
    const me = this.me(), cid = randomId(8).toLowerCase().replace(/[^a-z0-9]/g, 'x');
    const c = { by: me.id, nick: me.nick, text: t, ts: Date.now() };
    if (!this.comments.has(p.id)) this.comments.set(p.id, new Map());
    this.comments.get(p.id).set(cid, c);
    this.send(`${GRAM_NS}c/${p.id}/${cid}`, JSON.stringify(c));
    this.dirty();
  },

  /* ---------- obrazovka ---------- */

  el(id) {
    return document.getElementById(id);
  },

  init() {
    if (this.ready) return;
    this.ready = true;
    const click = (id, fn) => this.el(id).addEventListener('click', () => { Sound.init(); fn(); });
    click('gram-back', () => this.close());
    for (const b of document.querySelectorAll('#gram-nav button[data-v]')) b.addEventListener('click', () => this.go(b.dataset.v, Board.myId()));
    this.el('gram-body').addEventListener('click', (e) => this.onClick(e));
    this.el('gram-body').addEventListener('submit', (e) => this.onSubmit(e));
    this.el('gram-body').addEventListener('dblclick', (e) => {
      const m = e.target.closest('.gp-media');
      if (m) this.likeFromMedia(m);
    });
    // dvojité klepnutí na fotku = lajk (i na telefonu)
    let lastTap = 0;
    this.el('gram-body').addEventListener('pointerup', (e) => {
      const m = e.target.closest('.gp-media');
      if (!m) return;
      const now = performance.now();
      if (now - lastTap < 320) this.likeFromMedia(m);
      lastTap = now;
    });
  },

  open(view) {
    this.init();
    this.on = true;
    Game.screen = 'gram';
    UI.show('gram');
    this.connect();
    this.go(view || 'feed', Board.myId());
    clearInterval(this._tick);
    this._tick = setInterval(() => this.flush(), 400);
  },
  close() {
    this.on = false;
    clearInterval(this._tick);
    this.disconnect();
    this.markSeen();
    Game.screen = 'home';
    UI.show('home');
  },

  go(view, who) {
    this.view = view;
    this.who = who || Board.myId();
    for (const b of document.querySelectorAll('#gram-nav button[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === view && (view !== 'profile' || this.who === Board.myId())));
    this.render();
    this.el('gram-body').scrollTop = 0;
    if (view === 'profile' && this.who === Board.myId()) setTimeout(() => { this.markSeen(); this.render(true); }, 1500);
  },

  dirty() {
    this._dirty = true;
  },
  flush() {
    if (!this.on || !this._dirty) return;
    this._dirty = false;
    // při psaní komentáře nepřekreslovat (ztratil by se text)
    const a = document.activeElement;
    if (a && a.closest && a.closest('#gram-body') && a.tagName === 'INPUT') return;
    if (this.view !== 'new') this.render(true);
  },

  // Složit nový příspěvek (z fotky po vyfocení v klubu, nebo z obrazovky +).
  compose(img) {
    this.draft = { img: img || '', text: '', bg: 0, cap: '' };
    this.open('new');
  },

  ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'teď';
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    if (s < 86400) return `${Math.floor(s / 3600)} h`;
    return `${Math.floor(s / 86400)} d`;
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  sorted(by) {
    return [...this.posts.values()].filter((p) => !by || p.by === by).sort((a, b) => b.ts - a.ts);
  },
  likeCount(p) {
    return (this.likes.get(p.id) || new Set()).size;
  },

  render(soft) {
    const body = this.el('gram-body'), keep = soft ? body.scrollTop : 0;
    const st = this.el('gram-status');
    st.textContent = this.status === 'online' ? '● online' : this.status === 'offline' ? '● offline' : '● připojuji…';
    st.dataset.s = this.status || '';
    if (this.view === 'feed') body.innerHTML = this.feedHtml();
    else if (this.view === 'profile') body.innerHTML = this.profileHtml(this.who);
    else body.innerHTML = this.composeHtml();
    this.paintAvatars();
    if (soft) body.scrollTop = keep;
    const n = this.newCount();
    this.el('gram-badge').hidden = !n;
    this.el('gram-badge').textContent = n;
  },

  postHtml(p) {
    const me = Board.myId(), liked = (this.likes.get(p.id) || new Set()).has(me), lc = this.likeCount(p);
    const cs = [...(this.comments.get(p.id) || new Map()).values()].sort((a, b) => a.ts - b.ts);
    const media = p.img
      ? `<img src="${p.img}" alt="Fotka od ${this.esc(p.nick)}" loading="lazy">`
      : `<div class="gp-text" style="background:${GRAM_BGS[p.bg]}">${this.esc(p.text)}</div>`;
    return `<article class="gp" data-id="${p.id}">
      <header class="gp-head"><button type="button" class="gp-user" data-user="${p.by}"><canvas class="gp-av" data-ch="${p.ch}" data-sk="${p.sk}"></canvas><b>${this.esc(p.nick)}</b></button><span class="gp-time">${this.ago(p.ts)}</span>${p.by === me ? '<button type="button" class="gp-del" data-del="1" aria-label="Smazat">🗑</button>' : ''}</header>
      <div class="gp-media">${media}<span class="gp-pop" aria-hidden="true">❤</span></div>
      <div class="gp-act"><button type="button" class="gp-like" data-like="1" aria-pressed="${liked}" aria-label="To se mi líbí">${liked ? '❤️' : '🤍'}</button><span class="gp-likes">${lc} ${plural(lc, 'lajk', 'lajky', 'lajků')}</span><span class="gp-cc">💬 ${cs.length}</span></div>
      ${p.cap ? `<p class="gp-cap"><b>${this.esc(p.nick)}</b> ${this.esc(p.cap)}</p>` : ''}
      <div class="gp-comments">${cs.slice(-4).map((c) => `<p><b>${this.esc(c.nick)}</b> ${this.esc(c.text)}</p>`).join('')}</div>
      <form class="gp-cform" data-c="1"><input type="text" maxlength="160" placeholder="Přidat komentář…" enterkeyhint="send" aria-label="Komentář"><button type="submit">Odeslat</button></form>
    </article>`;
  },

  feedHtml() {
    const list = this.sorted();
    if (!list.length) {
      return `<div class="gram-empty"><p class="ge-big">📸</p><p><b>Zatím tu nic není.</b></p><p>Vyfoť se v klubu Hot Peppers (📸) nebo přidej příspěvek tlačítkem <b>＋</b>.</p>${this.status !== 'online' ? '<p class="ge-small">Načítám příspěvky…</p>' : ''}</div>`;
    }
    return list.map((p) => this.postHtml(p)).join('');
  },

  profileHtml(uid) {
    const mine = uid === Board.myId();
    const list = this.sorted(uid);
    const any = list[0];
    const me = this.me();
    const nick = mine ? me.nick : any ? any.nick : 'Hráč';
    const ch = mine ? me.ch : any ? any.ch : 'jenda';
    const sk = mine ? me.sk : any ? any.sk : '';
    const likes = list.reduce((s, p) => s + this.likeCount(p), 0);
    const comments = list.reduce((s, p) => s + (this.comments.get(p.id) || new Map()).size, 0);
    const grid = list.map((p) => `<button type="button" class="gg" data-open="${p.id}">${p.img ? `<img src="${p.img}" alt="">` : `<span style="background:${GRAM_BGS[p.bg]}">${this.esc(p.text.slice(0, 40))}</span>`}<i>❤ ${this.likeCount(p)}</i></button>`).join('');
    const nickBox = mine ? `<form class="gram-nick" data-nick="1"><input type="text" maxlength="12" value="${this.esc(Board.nick())}" placeholder="Tvoje přezdívka" aria-label="Přezdívka" ${Account.logged ? 'readonly' : ''}><button type="submit">Uložit</button></form>` : '';
    return `<section class="gram-prof">
      <div class="gpr-top"><canvas class="gpr-av" data-ch="${ch}" data-sk="${sk}"></canvas>
        <div class="gpr-stats"><p><b>${list.length}</b><span>příspěvků</span></p><p><b>${likes}</b><span>lajků</span></p><p><b>${comments}</b><span>komentářů</span></p></div></div>
      <p class="gpr-nick">${this.esc(nick)}</p>
      <p class="gpr-bio">Hraje za ${this.esc(charById(ch).name)} · FIFA67</p>
      ${nickBox}
      ${mine && !Board.nick() ? '<p class="gpr-warn">Nastav si přezdívku, ať tě ostatní poznají.</p>' : ''}
      <div class="gram-grid">${grid || `<p class="gram-empty">${mine ? 'Zatím žádné příspěvky. Přidej první tlačítkem ＋.' : 'Žádné příspěvky.'}</p>`}</div>
    </section>`;
  },

  composeHtml() {
    const d = this.draft || (this.draft = { img: '', text: '', bg: 0, cap: '' });
    const photos = this.photos();
    const gal = photos.map((u, i) => `<button type="button" class="gc-ph${d.img === u ? ' on' : ''}" data-ph="${i}"><img src="${u}" alt="Fotka ${i + 1}"></button>`).join('');
    const preview = d.img ? `<img src="${d.img}" alt="Vybraná fotka">` : `<div class="gp-text" style="background:${GRAM_BGS[d.bg]}">${this.esc(d.text) || 'Napiš něco…'}</div>`;
    return `<section class="gram-new">
      <div class="gn-preview">${preview}</div>
      <p class="gn-kick">Fotky z klubu</p>
      <div class="gn-gal">${gal || '<p class="gn-hint">Zatím žádné. Vyfoť se v klubu Hot Peppers tlačítkem 📸.</p>'}<button type="button" class="gc-txt${d.img ? '' : ' on'}" data-txt="1">Aa<br><small>text</small></button></div>
      ${d.img ? '' : `<div class="gn-bgs">${GRAM_BGS.map((g, i) => `<button type="button" class="gn-bg${d.bg === i ? ' on' : ''}" data-bg="${i}" style="background:${g}" aria-label="Pozadí ${i + 1}"></button>`).join('')}</div>
      <textarea class="gn-text" maxlength="220" placeholder="Text příspěvku…" data-f="text">${this.esc(d.text)}</textarea>`}
      <textarea class="gn-cap" maxlength="220" placeholder="Popisek…" data-f="cap">${this.esc(d.cap)}</textarea>
      <button type="button" class="btn-play gn-send" data-send="1">Sdílet</button>
    </section>`;
  },

  paintAvatars() {
    requestAnimationFrame(() => {
      for (const cv of this.el('gram-body').querySelectorAll('canvas[data-ch]')) {
        const id = cv.dataset.ch, d = duoOf(id), T = d >= 0 ? DUO_TEAMS[d] : charById(id).kit || SIDE_COLORS[0];
        Renderer.portrait(cv, id, T, 1, undefined, { head: true, skin: cv.dataset.sk || '' });
      }
    });
  },

  postOf(el) {
    const a = el.closest('.gp');
    return a && this.posts.get(a.dataset.id);
  },

  likeFromMedia(m) {
    const p = this.postOf(m);
    if (!p) return;
    const pop = m.querySelector('.gp-pop');
    if (pop) {
      pop.classList.remove('go');
      void pop.offsetWidth;
      pop.classList.add('go');
    }
    if (!(this.likes.get(p.id) || new Set()).has(Board.myId())) this.toggleLike(p);
  },

  onClick(e) {
    const t = e.target;
    const p = this.postOf(t);
    if (t.closest('[data-like]') && p) {
      if (this.toggleLike(p)) Sound.click();
      this.render(true);
    } else if (t.closest('[data-del]') && p) {
      this.deletePost(p);
      this.render(true);
    } else if (t.closest('[data-user]')) {
      this.go('profile', t.closest('[data-user]').dataset.user);
    } else if (t.closest('[data-open]')) {
      const id = t.closest('[data-open]').dataset.open;
      this.view = 'feed';
      this.render();
      const a = this.el('gram-body').querySelector(`.gp[data-id="${id}"]`);
      if (a) a.scrollIntoView({ block: 'start' });
    } else if (t.closest('[data-ph]')) {
      this.draft.img = this.photos()[Number(t.closest('[data-ph]').dataset.ph)] || '';
      this.render();
    } else if (t.closest('[data-txt]')) {
      this.draft.img = '';
      this.render();
    } else if (t.closest('[data-bg]')) {
      this.draft.bg = Number(t.closest('[data-bg]').dataset.bg);
      this.syncDraft();
      this.render();
    } else if (t.closest('[data-send]')) {
      this.syncDraft();
      const d = this.draft;
      if (!d.img && !d.text.trim()) {
        UI.toast('Vyber fotku nebo napiš text.');
        return;
      }
      this.publishPost({ img: d.img, text: d.img ? '' : d.text.trim(), bg: d.bg, cap: d.cap.trim() }).then((ok) => {
        if (!ok) UI.toast('Nepodařilo se připojit, zkus to znovu.');
      });
      Sound.fanfare();
      UI.toast('Příspěvek je na FIFAgramu! 📸');
      this.draft = null;
      this.go('feed');
    }
  },

  syncDraft() {
    if (!this.draft) return;
    for (const ta of this.el('gram-body').querySelectorAll('textarea[data-f]')) this.draft[ta.dataset.f] = ta.value;
  },

  onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (f.dataset.c) {
      const p = this.postOf(f), inp = f.querySelector('input');
      if (p && inp.value.trim()) {
        this.addComment(p, inp.value);
        inp.value = '';
        inp.blur();
        this.render(true);
      }
    } else if (f.dataset.nick) {
      const n = Board.setNick(f.querySelector('input').value);
      f.querySelector('input').blur();
      UI.toast(n ? `Přezdívka: ${n}` : 'Přezdívka smazána');
      this.render(true);
    }
  },

  /* ---------- nové lajky a komentáře u mých příspěvků ---------- */

  myScore() {
    let n = 0;
    for (const p of this.sorted(Board.myId())) n += this.likeCount(p) + (this.comments.get(p.id) || new Map()).size;
    return n;
  },
  newCount() {
    let seen = 0;
    try { seen = Number(localStorage.getItem(GRAM_SEEN_KEY)) || 0; } catch (e) { /* nic */ }
    return Math.max(0, this.myScore() - seen);
  },
  markSeen() {
    try { localStorage.setItem(GRAM_SEEN_KEY, String(this.myScore())); } catch (e) { /* nevadí */ }
  },
};

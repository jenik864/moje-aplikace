'use strict';

const STORE_PLAYER = 'hlavouni.hrac';

const Social = {
  pendingWrite: Promise.resolve(),
  nameTaken: '',

  get account() {
    const account = store.get(STORE_PLAYER, null);
    return /^[a-f0-9]{64}$/.test(account?.token) ? account : null;
  },

  get chosenName() {
    const account = this.account;
    return (account?.pendingName !== this.nameTaken && account?.pendingName) || account?.name || '';
  },

  get nickname() {
    return this.chosenName || cleanName(store.get(STORE_NAME, ''));
  },

  async request(path, { method = 'GET', token, body } = {}) {
    if (!/^https?:$/.test(location.protocol)) throw new Error('unavailable');
    const base = new URL(SOCIAL_API || './api/social/', document.baseURI);
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response, data;
    try {
      response = await fetch(new URL(path, base), {
        method, headers, body: body && JSON.stringify(body), signal: controller.signal,
        credentials: 'omit', redirect: 'error', cache: 'no-store',
      });
      if (!response.headers.get('Content-Type')?.includes('application/json') || response.status >= 500) {
        throw new Error('unavailable');
      }
      data = await response.json();
    } catch (error) {
      throw new Error('unavailable');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  persist(account) {
    try {
      localStorage.setItem(STORE_PLAYER, JSON.stringify(account));
    } catch (error) {
      throw new Error('storage');
    }
  },

  write(action) {
    // Přejmenování a výsledky zápasů posíláme po jednom, v pořadí vzniku.
    const next = this.pendingWrite.then(() => navigator.locks
      ? navigator.locks.request(STORE_PLAYER, action)
      : action());
    this.pendingWrite = next.catch(() => {});
    return next;
  },

  async upload(account, name) {
    const { trophies, played, wins, goals, supers, cups, bestStreak } = Profile.get();
    const stats = { trophies, played, wins, goals, supers, cups, bestStreak };
    const player = await this.request('me', { method: 'PUT', token: account.token, body: { name, stats } });
    this.persist({
      token: account.token, id: player.id, name: player.name, played: player.played,
      pendingName: name === undefined ? account.pendingName : undefined,
    });
    if (name !== undefined) this.nameTaken = '';
    return player;
  },

  async saveName(input) {
    const name = input.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 12 || !/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) {
      throw new Error('invalid_name');
    }
    return this.write(async () => {
      const account = this.account || {
        token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join(''),
      };
      // Klíč i zvolenou přezdívku uložíme před odesláním. Opakování používá stejný profil.
      this.persist({ ...account, pendingName: name });
      try {
        return await this.upload(account, name);
      } catch (error) {
        if (error.message === 'unavailable') return null;
        this.persist(account);
        throw error;
      }
    });
  },

  sync() {
    return this.write(async () => {
      const account = this.account;
      if (account?.pendingName && account.pendingName !== this.nameTaken) {
        try {
          return await this.upload(account, account.pendingName);
        } catch (error) {
          if (error.message !== 'name_taken') throw error;
          this.nameTaken = account.pendingName;
        }
      }
      if (account?.id && Profile.get().played > account.played) {
        try {
          return await this.upload(account);
        } catch (error) {
          if (error.message === 'profile_required') return this.upload(account, account.name);
          throw error;
        }
      }
    });
  },
};

const playerEl = (id) => document.getElementById(id);

const PlayerUI = {
  listSequence: 0,
  profileSequence: 0,

  init() {
    const on = (id, action) => playerEl(id).addEventListener('click', action);
    on('btn-players-close', () => this.close());
    on('btn-profile-close', () => this.close());
    on('btn-players-all', () => this.setList('leaderboard'));
    on('btn-players-friends', () => this.setList('friends'));
    on('btn-players-retry', () => this.loadList({ sync: true }));
    on('btn-players-prev', () => this.loadList({ offset: this.previous }));
    on('btn-players-next', () => this.loadList({ offset: this.next }));
    on('btn-players-join', () => this.openOwn(() => this.showList(), () => this.showList()));
    on('btn-friend', () => this.toggleFriend());
    playerEl('players-search-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.search = playerEl('players-search').value.trim();
      this.loadList({ offset: 0 });
    });
    playerEl('profile-name-form').addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveName();
    });
  },

  toHome(button) {
    UI.show('home');
    if (!Touch.enabled) playerEl(button).focus();
  },

  close() {
    if (!UI.el.profile.hidden) this.profileBack();
    else if (!UI.el.players.hidden) this.toHome('btn-players');
    else return false;
    return true;
  },

  openList() {
    this.tab = 'leaderboard';
    this.search = '';
    this.offset = 0;
    playerEl('players-search').value = '';
    this.showList(null, true);
  },

  showList(focusId, sync = false) {
    UI.show('players');
    if (!Touch.enabled) playerEl('btn-players-close').focus();
    this.loadList({ focusId, sync });
  },

  setList(tab) {
    if (tab === this.tab) return;
    this.tab = tab;
    this.loadList({ offset: 0, sync: true });
  },

  async loadList({ offset = this.offset, focusId, sync = false } = {}) {
    this.offset = offset;
    const sequence = ++this.listSequence;
    const current = () => sequence === this.listSequence && !UI.el.players.hidden;
    const isFriends = this.tab === 'friends';
    const info = playerEl('players-status'), results = playerEl('players-results');
    const list = playerEl('players-list');
    const join = playerEl('btn-players-join'), retry = playerEl('btn-players-retry');
    const prev = playerEl('btn-players-prev'), next = playerEl('btn-players-next');
    playerEl('btn-players-all').setAttribute('aria-pressed', String(!isFriends));
    playerEl('btn-players-friends').setAttribute('aria-pressed', String(isFriends));
    playerEl('players-search-form').hidden = isFriends;
    join.hidden = retry.hidden = prev.hidden = next.hidden = results.hidden = true;
    info.textContent = 'Načítám hráče…';
    list.replaceChildren();

    if (sync) await Social.sync().then(() => UI.renderProfile()).catch(() => {});
    if (!current()) return;
    const account = Social.account;
    join.hidden = !!account?.id;
    if (isFriends && !account?.id) {
      info.textContent = 'Nastav si přezdívku a pak si můžeš přidávat přátele ze žebříčku.';
      return;
    }
    const params = new URLSearchParams({ offset, search: isFriends ? '' : this.search });
    try {
      const data = await Social.request(this.tab + '?' + params, { token: isFriends ? account.token : undefined });
      if (!current()) return;
      this.previous = data.previous;
      this.next = data.next;
      prev.hidden = this.previous === null;
      next.hidden = this.next === null;
      if (!data.players.length) {
        info.textContent = isFriends ? 'Přátele přidáš přímo z profilu hráče.'
          : this.search ? 'Této přezdívce žádný hráč neodpovídá.' : 'V žebříčku zatím nikdo není.';
        return;
      }
      info.textContent = '';
      results.hidden = false;
      for (const player of data.players) {
        const row = this.makeRow(player, player.id === account?.id);
        list.append(row);
        if (player.id === focusId && !Touch.enabled) row.firstChild.focus();
      }
      if (!focusId) results.scrollTop = 0;
    } catch (error) {
      if (!current()) return;
      info.textContent = isFriends ? 'Přátele se nepodařilo načíst.' : 'Žebříček je momentálně nedostupný.';
      retry.hidden = false;
    }
  },

  makeRow(player, own) {
    const make = (tag, cls, text) => {
      const el = document.createElement(tag);
      el.className = cls;
      el.textContent = text;
      return el;
    };
    const row = document.createElement('li');
    const button = make('button', 'player-row', '');
    button.type = 'button';
    if (own) button.classList.add('own');
    const rank = rankOf(player.trophies).rank;
    const place = make('span', 'player-place', '#' + player.place);
    if (player.place <= 3) place.dataset.place = player.place;
    const avatar = make('span', 'player-avatar', Array.from(player.name).slice(0, 2).join('').toUpperCase());
    avatar.style.setProperty('--rank', rank.color);
    avatar.setAttribute('aria-hidden', 'true');
    const names = make('span', 'player-names', '');
    names.append(make('b', 'player-name', player.name + (own ? ' (ty)' : '')), make('small', 'player-league', rank.name));
    const identity = make('span', 'player-identity', '');
    identity.append(avatar, names);
    button.append(place, identity, make('b', 'player-trophies', player.trophies));
    button.addEventListener('click', () => {
      if (own) this.openOwn(() => this.showList(player.id));
      else this.openPlayer(player.id);
    });
    row.append(button);
    return row;
  },

  profileFrame(own, back) {
    const sequence = ++this.profileSequence;
    this.visitor = null;
    this.profileBack = back;
    UI.el.profile.classList.toggle('own-profile', own);
    playerEl('profile-title').textContent = own ? 'Můj profil' : 'Profil hráče';
    playerEl('pf-overview').hidden = playerEl('pf-details').hidden = !own;
    playerEl('profile-name-form').hidden = !own;
    playerEl('btn-friend').hidden = true;
    this.profileStatus('');
    UI.show('profile');
    UI.el.profile.scrollTop = 0;
    if (!Touch.enabled) playerEl('btn-profile-close').focus({ preventScroll: true });
    return sequence;
  },

  openOwn(back = () => this.toHome('profile-chip'), onPublished = null) {
    this.profileFrame(true, back);
    this.onPublished = onPublished;
    const account = Social.account;
    playerEl('profile-nick').value = account?.pendingName || Social.nickname;
    UI.renderProfileDetails(Profile.get());
    if (account?.pendingName) {
      this.profileStatus(Social.nameTaken === account.pendingName
        ? 'Tuto přezdívku už někdo používá. Zvol jinou.' : 'Přezdívka čeká na připojení k žebříčku.');
    }
  },

  profileStatus(text, error = false) {
    const status = playerEl('pf-status');
    status.textContent = text;
    status.classList.toggle('error', error);
  },

  async saveName() {
    const sequence = this.profileSequence;
    const button = playerEl('btn-profile-save'), input = playerEl('profile-nick');
    button.disabled = input.disabled = true;
    this.profileStatus('Ukládám přezdívku…');
    try {
      const player = await Social.saveName(input.value);
      UI.renderProfile();
      if (sequence !== this.profileSequence || UI.el.profile.hidden) return;
      input.value = Social.nickname;
      if (player && this.onPublished) return this.onPublished();
      this.profileStatus(player ? 'Přezdívka je uložená v žebříčku.'
        : 'Přezdívka je uložená v tomto prohlížeči. Zveřejní se po připojení k žebříčku.');
    } catch (error) {
      if (sequence !== this.profileSequence || UI.el.profile.hidden) return;
      const messages = {
        invalid_name: 'Použij 2–12 znaků. Začni písmenem nebo číslicí.',
        name_taken: 'Tuto přezdívku už někdo používá. Zvol jinou.',
        storage: 'Prohlížeč nedovolil přezdívku uložit.',
      };
      this.profileStatus(messages[error.message] || 'Přezdívku se nepodařilo uložit.', true);
    } finally {
      button.disabled = input.disabled = false;
    }
  },

  async openPlayer(id) {
    const sequence = this.profileFrame(false, () => this.showList(id));
    this.profileStatus('Načítám profil…');
    try {
      const player = await Social.request('players/' + id, { token: Social.account?.token });
      if (sequence !== this.profileSequence || UI.el.profile.hidden) return;
      this.visitor = player;
      playerEl('profile-title').textContent = player.name;
      playerEl('pf-overview').hidden = playerEl('pf-details').hidden = false;
      UI.renderProfileDetails(player);
      this.renderFriendButton();
      this.profileStatus('');
    } catch (error) {
      if (sequence !== this.profileSequence || UI.el.profile.hidden) return;
      this.profileStatus('Profil hráče se nepodařilo načíst.', true);
    }
  },

  renderFriendButton() {
    const button = playerEl('btn-friend');
    button.hidden = false;
    button.textContent = this.visitor.isFriend ? 'Odebrat z přátel' : 'Přidat do přátel';
    button.classList.toggle('green', !this.visitor.isFriend);
  },

  async toggleFriend() {
    const player = this.visitor, account = Social.account;
    if (!player) return;
    if (!account?.id) {
      const back = () => this.openPlayer(player.id);
      this.openOwn(back, back);
      return;
    }
    const button = playerEl('btn-friend');
    button.disabled = true;
    try {
      const data = await Social.request('friends/' + player.id, {
        method: player.isFriend ? 'DELETE' : 'PUT', token: account.token,
      });
      if (this.visitor !== player || UI.el.profile.hidden) return;
      player.isFriend = data.isFriend;
      this.renderFriendButton();
      this.profileStatus(data.isFriend ? 'Hráč je v tvých přátelích.' : 'Hráč byl odebrán z přátel.');
    } catch (error) {
      if (this.visitor !== player || UI.el.profile.hidden) return;
      this.profileStatus('Změnu se nepodařilo uložit. Zkus to znovu.', true);
    } finally {
      button.disabled = false;
    }
  },
};

// GYM BUDDY – App-Logik. Alle Daten bleiben nur auf diesem Gerät (localStorage).

const KEY = 'gymbuddy.v1';
const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="#0b0b0c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let store = load();
let tab = 'training';
let today = new Date();
let selected = today.getDay();
const openTips = new Set();

// Ziel aus der Projektnotiz: 88 kg bis zur Hochzeit
const GOAL_KG = 88;
const GOAL_DATE = '2027-06-11';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || { days: {} };
    s.weight = s.weight || [];
    return s;
  }
  catch { return { days: {}, weight: [] }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* Speicher voll oder gesperrt */ }
}

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Datum des gewählten Wochentags in der aktuellen Woche (Mo–So)
function dateFor(weekday) {
  const d = new Date(today);
  const offset = (weekday + 6) % 7 - (today.getDay() + 6) % 7;
  d.setDate(d.getDate() + offset);
  return d;
}

function dayData(date) {
  const k = keyOf(date);
  return store.days[k] || (store.days[k] = { ex: {}, meals: {} });
}

function setsOf(day, id) {
  return day.ex[id] || (day.ex[id] = [0, 1, 2].map(() => ({ w: '', d: false })));
}

function unitComplete(weekday) {
  const plan = PLAN[weekday];
  if (!plan || plan.cardio) return false;
  const day = store.days[keyOf(dateFor(weekday))];
  if (!day) return false;
  return plan.exercises.every((ex) => day.ex[ex.id] && day.ex[ex.id].every((s) => s.d));
}

function cardioDone(weekday) {
  const day = store.days[keyOf(dateFor(weekday))];
  return !!(day && day.cardio && day.cardio.d);
}

// Gewichte vom letzten Mal, an dem diese Übung eingetragen wurde
function lastWeights(id, beforeKey) {
  const keys = Object.keys(store.days).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const sets = store.days[k].ex && store.days[k].ex[id];
    if (sets && sets.some((s) => s.w !== '')) return { date: k, weights: sets.map((s) => s.w || '–') };
  }
  return null;
}

// Persönlicher Rekord: schwerstes abgehaktes Gewicht vor diesem Tag
function bestWeight(id, beforeKey) {
  let best = 0, date = null;
  for (const k of Object.keys(store.days)) {
    if (k >= beforeKey) continue;
    const sets = store.days[k].ex && store.days[k].ex[id];
    (sets || []).forEach((s) => {
      const w = parseFloat(s.w);
      if (s.d && w > best) { best = w; date = k; }
    });
  }
  return best ? { w: best, date } : null;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fmtDate(d) {
  return d.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtShort(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

/* ---------- Darstellung ---------- */

function render() {
  const date = dateFor(selected);
  const weightTab = tab === 'weight';
  document.getElementById('date').textContent = weightTab ? fmtDate(today) + ' · heute'
    : fmtDate(date) + (selected === today.getDay() ? ' · heute' : '');
  document.getElementById('days').hidden = weightTab;

  document.getElementById('days').innerHTML = ORDER.map((wd) => {
    const cls = ['day'];
    if (wd === selected) cls.push('sel');
    if (wd === today.getDay()) cls.push('today');
    if (unitComplete(wd) || cardioDone(wd)) cls.push('done');
    return `<button class="${cls.join(' ')}" data-action="day" data-day="${wd}">${DAY_SHORT[wd]}</button>`;
  }).join('');

  document.getElementById('tab-training').classList.toggle('sel', tab === 'training');
  document.getElementById('tab-food').classList.toggle('sel', tab === 'food');
  document.getElementById('tab-weight').classList.toggle('sel', weightTab);

  const body = tab === 'training' ? renderTraining(date) : tab === 'food' ? renderFood(date) : renderWeight();
  document.getElementById('app').innerHTML = body +
    '<p class="verse">PRESSURE MAKES US. HOPE KEEPS US. · RÖMER 8:18</p>';
}

function checkBtn(on, attrs) {
  return `<button class="check${on ? ' on' : ''}" ${attrs} aria-pressed="${on}">${CHECK}</button>`;
}

function renderWeek() {
  const done = [1, 2, 3, 4, 5].filter(unitComplete).length;
  let text = `${done} von 4 Einheiten`;
  let cls = 'value';
  if (done >= 5) { text = '5 von 4 · Bonus'; cls += ' kept'; }
  else if (done === 4) { text = '4 von 4 · Versprechen gehalten'; cls += ' kept'; }
  return `<section class="card week-card">
    <div class="week"><span class="label">Diese Woche</span><span class="${cls}">${text}</span></div>
    <div class="bar"><span style="width:${Math.min(done, 4) * 25}%"></span></div>
  </section>`;
}

function renderTraining(date) {
  const plan = PLAN[selected];
  const day = dayData(date);
  const k = keyOf(date);
  let html = renderWeek();

  html += `<section class="card unit">
    <h2>${esc(plan.title)}</h2>
    <p class="focus">${esc(plan.focus)}</p>
    ${plan.flexible ? '<span class="badge">Flexibler Tag</span><p class="note">Wird die Woche eng, fällt dieser Tag weg. 4 Einheiten = Versprechen gehalten. 5 = Bonus.</p>' : ''}
    ${!plan.cardio ? '<p class="note">5–6 Übungen · 3 Sätze · 60–90 Sek. Pause</p>' : ''}
  </section>`;

  if (plan.cardio) {
    const c = day.cardio || {};
    html += `<section class="card${c.d ? ' complete' : ''}">
      <div class="row${c.d ? ' on' : ''}">
        <div class="grow"><div class="title">Schwimmen oder Cardio</div><div class="sub">Locker, ca. 30–45 Min. Danach Isoclear-Shake.</div></div>
        ${checkBtn(!!c.d, 'data-action="cardio"')}
      </div>
      <div class="set cardio-min"><span class="n">Minuten</span>
        <label><input type="number" inputmode="numeric" placeholder="z. B. 40" value="${esc(c.min || '')}" data-input="cardio-min"></label>
      </div>
    </section>`;
    return html;
  }

  html += `<section class="card${day.warmup ? ' complete' : ''}">
    <div class="row${day.warmup ? ' on' : ''}">
      <div class="grow"><div class="title">${esc(WARMUP.name)}</div><div class="sub">${esc(WARMUP.detail)}</div></div>
      ${checkBtn(!!day.warmup, 'data-action="warmup"')}
    </div>
  </section>`;

  plan.exercises.forEach((ex, i) => {
    const sets = setsOf(day, ex.id);
    const complete = sets.every((s) => s.d);
    const last = lastWeights(ex.id, k);
    const pb = bestWeight(ex.id, k);
    const open = openTips.has(ex.id);
    html += `<section class="card${complete ? ' complete' : ''}">
      <div class="ex-head">
        <div>
          <div class="ex-num">ÜBUNG ${i + 1}</div>
          <h3>${esc(ex.name)}</h3>
          <p class="ex-meta">3 × ${esc(ex.reps)} · Pause ${esc(ex.rest)}</p>
        </div>
      </div>
      ${ex.oneArm ? `<p class="onearm"><b>Links beginnen.</b> Rechts nur so viele Wdh. wie links.</p>` : ''}
      ${last ? `<p class="last">Letztes Mal (${fmtShort(last.date)}): ${last.weights.map(esc).join(' / ')} kg</p>` : ''}
      ${pb ? `<p class="last">PB: <b class="pb">${esc(pb.w)} kg</b> (${fmtShort(pb.date)})</p>` : ''}
      <div class="sets">
        ${sets.map((s, j) => `<div class="set${s.d ? ' on' : ''}">
          <span class="n">Satz ${j + 1}${s.d && parseFloat(s.w) > (pb ? pb.w : 0) && pb ? '<b class="newpb">Neuer PB</b>' : ''}</span>
          <label><input type="text" inputmode="decimal" placeholder="Gewicht" value="${esc(s.w)}" data-input="w" data-ex="${ex.id}" data-set="${j}"><span class="unit-kg">kg</span></label>
          ${checkBtn(s.d, `data-action="set" data-ex="${ex.id}" data-set="${j}"`)}
        </div>`).join('')}
      </div>
      <div class="more">
        <button class="pill" data-action="tips" data-ex="${ex.id}">${open ? 'Technik schliessen' : 'Technik'}</button>
        <a class="pill gold" href="${ex.demo}" target="_blank" rel="noopener">Demo-Video</a>
      </div>
      ${open ? `<ul class="tips">${ex.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </section>`;
  });

  return html;
}

function renderFood(date) {
  const meals = MEALS[selected];
  const day = dayData(date);
  const m = day.meals;
  const weekend = selected === 0 || selected === 6;
  const planned = ['shake', meals.lunchR, 'quark', meals.dinnerR].reduce((sum, r) => sum + RECIPES[r].protein, 0);
  let html = `<section class="card goal">
    <div class="label small">EIWEISSZIEL HEUTE</div>
    <div class="big">140–170 g <small>Eiweiss</small></div>
    <p class="note">Dieser Plan bringt dir ca. ${planned} g. Oberste Regel: in jeder Mahlzeit eine Proteinquelle.</p>
  </section>`;

  if (PREP[selected]) {
    html += `<section class="card prep"><div class="title">Vorkochen</div><p class="note">${esc(PREP[selected])} Nichts älter als 3 Tage.</p></section>`;
  }

  const recipe = (r) => {
    const rc = RECIPES[r];
    const open = openTips.has('r-' + r);
    return `<div class="more"><button class="pill" data-action="tips" data-ex="r-${r}">${open ? 'Rezept schliessen' : 'Rezept & Mengen'}</button>
      <span class="protein">ca. ${rc.protein} g Eiweiss</span></div>
      ${open ? `<div class="recipe">
        ${rc.serves ? `<p class="serves">${esc(rc.serves)}</p>` : ''}
        <div class="rlabel">Zutaten</div><ul>${rc.ingredients.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="rlabel">So geht's</div><ol>${rc.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
        ${rc.note ? `<p class="small">${esc(rc.note)}</p>` : ''}
      </div>` : ''}`;
  };

  const item = (id, when, title, sub, must, r) => `<div class="meal">
    <div class="row${m[id] ? ' on' : ''}">
      <div class="grow">
        <div class="when${must ? ' must' : ''}">${esc(when)}</div>
        <div class="title">${esc(title)}</div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
      </div>
      ${checkBtn(!!m[id], `data-action="meal" data-meal="${id}"`)}
    </div>
    ${recipe(r)}
  </div>`;

  html += `<section class="card">
    ${item('shake', weekend ? 'Nach dem Schwimmen / Cardio' : 'Nach dem Gym · ca. 08:00', 'Isoclear-Shake', 'Nicht verhandelbar. Schützt die Muskeln.', true, 'shake')}
    ${item('lunch', 'Mittag', meals.lunch, weekend ? '' : 'Vorgekocht, in der Werkstatt aufwärmen.', false, meals.lunchR)}
    ${item('snack', 'Nachmittag', 'Magerquark mit Beeren', 'Höchstens 1 TL Honig.', false, 'quark')}
    ${item('dinner', 'Abend · für zwei', meals.dinner, RECIPES[meals.dinnerR].serves ? '' : 'Mengen für 2 Personen, deine Portion ist die Hälfte.', false, meals.dinnerR)}
  </section>`;

  html += `<section class="card small">
    <p>Kein Frühstück ist okay, solange der Shake nach dem Training kommt.</p>
    <p>Reicht das Eiweiss am Abend nicht: Whey als Notlösung.</p>
    <p>Trinken: Wasser und ungesüsster Tee. Keine Softdrinks.</p>
  </section>`;
  return html;
}

const daysBetween = (a, b) => (new Date(b) - new Date(a)) / 86400000;
const kg = (n) => n.toFixed(1).replace(/\.0$/, '');

function weightChart(list) {
  const W = 320, H = 150, P = 10;
  const start = list[0];
  const xs = [start.d, list[list.length - 1].d, GOAL_DATE];
  const span = Math.max(1, daysBetween(start.d, GOAL_DATE));
  const vals = list.map((e) => e.kg).concat(GOAL_KG);
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const x = (d) => P + (daysBetween(start.d, d) / span) * (W - 2 * P);
  const y = (v) => P + ((hi - v) / (hi - lo)) * (H - 2 * P);
  const pts = list.map((e) => `${x(e.d).toFixed(1)},${y(e.kg).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">
    <line x1="${P}" x2="${W - P}" y1="${y(GOAL_KG)}" y2="${y(GOAL_KG)}" class="goal-line"/>
    <line x1="${x(start.d)}" y1="${y(start.kg)}" x2="${x(GOAL_DATE)}" y2="${y(GOAL_KG)}" class="plan-line"/>
    <polyline points="${pts}" class="trend"/>
    ${list.map((e) => `<circle cx="${x(e.d).toFixed(1)}" cy="${y(e.kg).toFixed(1)}" r="3.5" class="dot"/>`).join('')}
    <text x="${W - P}" y="${y(GOAL_KG) - 6}" text-anchor="end" class="goal-text">Ziel ${GOAL_KG} kg</text>
  </svg>`;
}

function renderWeight() {
  const list = [...store.weight].sort((a, b) => a.d.localeCompare(b.d));
  const tk = keyOf(today);
  let html = '';

  if (list.length) {
    const first = list[0], cur = list[list.length - 1];
    const lost = first.kg - cur.kg;
    const left = cur.kg - GOAL_KG;
    const weeksLeft = Math.max(1, daysBetween(tk, GOAL_DATE) / 7);
    const total = first.kg - GOAL_KG;
    const pct = total > 0 ? Math.min(100, Math.max(0, (lost / total) * 100)) : 0;
    html += `<section class="card goal">
      <div class="label small">AKTUELL</div>
      <div class="big">${kg(cur.kg)} kg <small>${fmtShort(cur.d)}</small></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="wstats">
        <div><b>${lost >= 0 ? '−' : '+'}${kg(Math.abs(lost))} kg</b><span>seit Start</span></div>
        <div><b>${left > 0 ? kg(left) + ' kg' : 'Erreicht'}</b><span>bis ${GOAL_KG} kg</span></div>
        <div><b>${left > 0 ? kg(left / weeksLeft) + ' kg' : '–'}</b><span>pro Woche nötig</span></div>
      </div>
    </section>`;
    if (list.length > 1) html += `<section class="card">${weightChart(list)}
      <p class="note small">Gold: Ziel. Gestrichelt: Plan bis 11. Juni 2027.</p></section>`;
  } else {
    html += `<section class="card goal">
      <div class="label small">ZIEL</div>
      <div class="big">${GOAL_KG} kg <small>bis 11. Juni 2027</small></div>
      <p class="note">Trag dein Startgewicht ein. Danach einmal pro Woche.</p>
    </section>`;
  }

  html += `<section class="card">
    <div class="title">Gewicht eintragen</div>
    <div class="wentry">
      <label><input type="date" value="${tk}" max="${tk}" data-weight="date"></label>
      <label><input type="text" inputmode="decimal" placeholder="z. B. 108.4" data-weight="kg"><span class="unit-kg">kg</span></label>
    </div>
    <button class="pill gold wsave" data-action="weight-save">Speichern</button>
    <p class="note small">Am besten einmal pro Woche, gleicher Tag, morgens nüchtern, gleiche Waage.</p>
  </section>`;

  if (list.length) {
    html += `<section class="card"><div class="title">Verlauf</div>
      ${list.slice().reverse().slice(0, 12).map((e) => `<div class="wrow">
        <span>${fmtShort(e.d)}</span><b>${kg(e.kg)} kg</b>
        <button class="wdel" data-action="weight-del" data-d="${e.d}" aria-label="Eintrag löschen">✕</button>
      </div>`).join('')}
    </section>`;
  }
  return html;
}

/* ---------- Bedienung ---------- */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const date = dateFor(selected);
  const day = dayData(date);
  switch (el.dataset.action) {
    case 'tab': tab = el.dataset.tab; window.scrollTo(0, 0); break;
    case 'day': selected = Number(el.dataset.day); break;
    case 'warmup': day.warmup = !day.warmup; break;
    case 'set': {
      const s = setsOf(day, el.dataset.ex)[el.dataset.set];
      s.d = !s.d;
      break;
    }
    case 'tips': {
      const id = el.dataset.ex;
      openTips.has(id) ? openTips.delete(id) : openTips.add(id);
      break;
    }
    case 'cardio': day.cardio = { ...(day.cardio || {}), d: !(day.cardio && day.cardio.d) }; break;
    case 'meal': day.meals[el.dataset.meal] = !day.meals[el.dataset.meal]; break;
    case 'weight-save': {
      const d = document.querySelector('[data-weight="date"]').value || keyOf(today);
      const v = parseFloat(document.querySelector('[data-weight="kg"]').value.replace(',', '.'));
      if (!(v > 30 && v < 300)) return;
      store.weight = store.weight.filter((e) => e.d !== d).concat({ d, kg: v });
      break;
    }
    case 'weight-del':
      if (!confirm('Eintrag löschen?')) return;
      store.weight = store.weight.filter((e) => e.d !== el.dataset.d);
      break;
    default: return;
  }
  save();
  render();
});

// Eingaben speichern, ohne neu zu zeichnen (Tastatur bleibt offen)
document.addEventListener('input', (e) => {
  const el = e.target;
  const day = dayData(dateFor(selected));
  if (el.dataset.input === 'w') {
    setsOf(day, el.dataset.ex)[el.dataset.set].w = el.value.replace(',', '.').trim();
  } else if (el.dataset.input === 'cardio-min') {
    day.cardio = { ...(day.cardio || {}), min: el.value };
  } else return;
  save();
});

// Neuer Tag, wenn die App über Nacht offen bleibt
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = new Date();
  if (keyOf(now) !== keyOf(today)) { today = now; selected = now.getDay(); render(); }
});

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

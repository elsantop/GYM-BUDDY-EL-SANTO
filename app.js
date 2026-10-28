// GYM BUDDY – App-Logik. Alle Daten bleiben nur auf diesem Gerät (localStorage).

const KEY = 'gymbuddy.v1';
const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
// Symbole im Stil der iOS-Systemsymbole (Linie, abgerundet, Textfarbe)
const ico = (d, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  book: ico('M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5zM11 19h2'),
  close: ico('M6 6l12 12M18 6L6 18'),
  skip: ico('M5 5l14 14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'),
  undo: ico('M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2'),
  play: ico('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l6-3.5z'),
  list: ico('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'),
  left: ico('M15 5l-7 7 7 7'),
  right: ico('M9 5l7 7-7 7'),
  trash: ico('M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3'),
  bell: ico('M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0'),
  save: ico('M5 12.5l4.5 4.5L19 7.5'),
  rings: ico('M9 9a6 6 0 1 0 0 12A6 6 0 0 0 9 9zM15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'),
  flame: ico('M12 3c1 4 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2.5-5 .5 1.5 1.5 2.5 2.5 2.5-1-3 0-6 0-8z'),
};

// Fortschrittsring: Anteil 0–1, Text in der Mitte
function ring(p, label) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p));
  return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${label}">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2b3"/><stop offset=".55" stop-color="#d4a854"/><stop offset="1" stop-color="#8f6420"/></linearGradient></defs>
    <circle cx="32" cy="32" r="${r}" class="ring-track"/>
    <circle cx="32" cy="32" r="${r}" class="ring-val" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle">${label}</text></svg>`;
}

const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="#0b0b0c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let store = load();
let tab = 'training';
let meView = 'body';
let figPeriod = 'week'; // Figur zeigt Woche oder Monat
let monthOffset = 0; // Monatsstatistik: 0 = dieser Monat // Diamant EL SANTO: 'body' = Körper & Gewicht, 'stats' = Zahlen pro Übung
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

// Ziel-Wiederholungen: untere Zahl aus "6–8" bzw. "10 pro Bein". Strecken (z. B. "30 m") zählen keine Wdh.
const isDistance = (ex) => /\d+\s*m\b/.test(ex.reps);
const minReps = (ex) => (isDistance(ex) ? 0 : parseInt(ex.reps, 10) || 0);
const repsOf = (ex, s) => (isDistance(ex) ? 0 : parseInt(s.r, 10) || minReps(ex));

// Eine Einheit zählt, wenn jede Übung erledigt oder bewusst ausgelassen ist und mindestens eine erledigt ist
function unitDoneAt(date) {
  const plan = PLAN[date.getDay()];
  if (!plan || plan.cardio) return false;
  const day = store.days[keyOf(date)];
  if (!day) return false;
  const skip = day.skip || {};
  const done = (ex) => day.ex[ex.id] && day.ex[ex.id].every((s) => s.d);
  return plan.exercises.every((ex) => done(ex) || skip[ex.id]) && plan.exercises.some(done);
}
const unitComplete = (weekday) => unitDoneAt(dateFor(weekday));

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

/* ---------- Antrieb ---------- */

// Ein Vers pro Tag (Luther 2017), wechselt täglich
const VERSES = [
  ['Ich vermag alles durch den, der mich mächtig macht.', 'Philipper 4,13'],
  ['Lasst uns aber Gutes tun und nicht müde werden; denn zu seiner Zeit werden wir auch ernten, wenn wir nicht nachlassen.', 'Galater 6,9'],
  ['Die auf den HERRN harren, kriegen neue Kraft, dass sie auffahren mit Flügeln wie Adler.', 'Jesaja 40,31'],
  ['Ich habe den guten Kampf gekämpft, ich habe den Lauf vollendet, ich habe Glauben gehalten.', '2. Timotheus 4,7'],
  ['Lauft so, dass ihr ihn erlangt.', '1. Korinther 9,24'],
  ['Bedrängnis bringt Geduld, Geduld aber Bewährung, Bewährung aber Hoffnung.', 'Römer 5,3–4'],
];

function mondayOf(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - (m.getDay() + 6) % 7);
  return m;
}
function unitsInWeek(monday) {
  let n = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday); d.setDate(d.getDate() + i);
    if (unitDoneAt(d)) n++;
  }
  return n;
}

// Wochen in Folge mit mindestens 4 Einheiten. Die laufende Woche bricht die Serie nicht, solange sie noch läuft.
function weekStreak() {
  const mon = mondayOf(today);
  let n = unitsInWeek(mon) >= 4 ? 1 : 0;
  for (let i = 1; i < 520; i++) {
    const m = new Date(mon); m.setDate(m.getDate() - 7 * i);
    if (unitsInWeek(m) < 4) break;
    n++;
  }
  return n;
}

function todayState() {
  const wd = today.getDay();
  const plan = PLAN[wd];
  const day = store.days[keyOf(today)] || { ex: {} };
  if (plan.cardio) return { plan, cardio: true, done: !!(day.cardio && day.cardio.d) };
  const skip = day.skip || {};
  const total = plan.exercises.filter((ex) => !skip[ex.id]).length;
  const doneN = plan.exercises.filter((ex) => day.ex[ex.id] && day.ex[ex.id].every((s) => s.d)).length;
  return { plan, total, doneN, started: doneN > 0 || !!day.warmup, done: unitDoneAt(today) };
}

function coachLine() {
  const t = todayState();
  const late = today.getHours() >= 18;
  if (t.cardio) return t.done ? 'Cardio erledigt. Erholung verdient.' : 'Heute Schwimmen oder Cardio. Locker, aber machen.';
  if (t.done) return 'Heute erledigt. Du hast Wort gehalten.';
  if (t.started) return `${t.doneN} von ${t.total} Übungen erledigt. Hör jetzt nicht auf.`;
  return late ? `Heute ist ${t.plan.title}. Der Tag ist noch nicht vorbei. Geh jetzt.`
    : `Heute ist ${t.plan.title}. Fang mit dem Aufwärmen an, der Rest folgt.`;
}

// Warnt, wenn 4 von 4 diese Woche knapp oder nicht mehr erreichbar ist
function weekWarning() {
  const done = unitsInWeek(mondayOf(today));
  if (done >= 4) return '';
  const wd = (today.getDay() + 6) % 7; // 0 = Montag
  let open = 0;
  for (let i = wd; i < 5; i++) if (!unitComplete(ORDER[i])) open++;
  const need = 4 - done;
  if (need > open) return '4 von 4 geht diese Woche nicht mehr. Hol raus, was geht.';
  if (need === open && wd > 0) return `Ab jetzt zählt jeder Tag: noch ${need} ${need === 1 ? 'Einheit' : 'Einheiten'}, kein Tag Luft.`;
  return '';
}

function renderToday() {
  const days = Math.max(0, Math.ceil(daysBetween(keyOf(today), GOAL_DATE)));
  const streak = weekStreak();
  const done = [1, 2, 3, 4, 5].filter(unitComplete).length;
  const [vtext, vref] = VERSES[Math.floor(new Date(keyOf(today)) / 86400000) % VERSES.length];
  const warn = weekWarning();
  const canBadge = 'setAppBadge' in navigator && 'Notification' in window && Notification.permission === 'default';
  let week = `${done} von 4 Einheiten`;
  if (done >= 5) week = '5 von 4 · Bonus';
  else if (done === 4) week = '4 von 4 · Versprechen gehalten';
  return `<section class="card hero">
    <div class="hero-nums">
      <div><i class="hico">${IC.rings}</i><b>${days}</b><span>Tage bis zur Hochzeit</span></div>
      <div><i class="hico${streak ? ' gold' : ''}">${IC.flame}</i><b class="${streak ? 'gold' : ''}">${streak}</b><span>${streak === 1 ? 'Woche' : 'Wochen'} in Serie</span></div>
    </div>
    <p class="coach">${esc(coachLine())}</p>
    ${warn ? `<p class="warnline">${esc(warn)}</p>` : ''}
    <div class="week-ring">${ring(done / 4, `${done}/4`)}<div><span class="label">Diese Woche</span><span class="value${done >= 4 ? ' kept' : ''}">${week}</span></div></div>
    <blockquote class="dverse">${esc(vtext)}<cite>${esc(vref)}</cite></blockquote>
    ${canBadge ? '<button class="btn tint badge-on" data-action="notify">${IC.bell}Offene Einheit am App-Symbol anzeigen</button>' : ''}
  </section>`;
}

// Zahl am App-Symbol, solange die heutige Einheit offen ist (iPhone: ab iOS 16.4, nach Erlaubnis)
function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  const t = todayState();
  (t.done ? navigator.clearAppBadge() : navigator.setAppBadge(1)).catch(() => {});
}

function celebrate() {
  const done = [1, 2, 3, 4, 5].filter(unitComplete).length;
  const sub = done >= 5 ? 'Bonus-Einheit. Stark.' : done === 4 ? '4 von 4. Versprechen gehalten.' : `${done} von 4 diese Woche.`;
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="cel-box">
    <svg viewBox="0 0 48 40" aria-hidden="true"><path d="M12 2h24l10 12L24 38 2 14z" class="d-fill"/><path d="M12 2h24l10 12L24 38 2 14zM2 14h44M12 2l6 12 6-12 6 12 6-12M18 14l6 24 6-24" class="d-line"/></svg>
    <p class="cel-title">Einheit geschafft</p>
    <p class="cel-sub">${esc(sub)}</p>
    <p class="cel-verse">Pressure makes us. Hope keeps us.</p>
  </div>`;
  const close = () => el.remove();
  el.addEventListener('click', close);
  document.body.appendChild(el);
  setTimeout(close, 3600);
}

/* ---------- Darstellung ---------- */

function render() {
  const date = dateFor(selected);
  const weightTab = tab === 'me';
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
  document.getElementById('tab-me').classList.toggle('sel', tab === 'me');

  const body = tab === 'training' ? renderTraining(date) : tab === 'food' ? renderFood(date) : renderMyself();
  document.getElementById('app').innerHTML = body +
    '<p class="verse">PRESSURE MAKES US. HOPE KEEPS US. · RÖMER 8:18</p>';
  updateBadge();
}

function checkBtn(on, attrs) {
  return `<button class="check${on ? ' on' : ''}" ${attrs} aria-pressed="${on}">${CHECK}</button>`;
}

function renderTraining(date) {
  const plan = PLAN[selected];
  const day = dayData(date);
  const k = keyOf(date);
  let html = renderToday();

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
    const skipped = !!(day.skip && day.skip[ex.id]);
    const complete = sets.every((s) => s.d);
    const last = lastWeights(ex.id, k);
    const pb = bestWeight(ex.id, k);
    const open = openTips.has(ex.id);
    html += `<section class="card${complete ? ' complete' : ''}${skipped ? ' skipped' : ''}">
      <div class="ex-head">
        <div>
          <div class="ex-num">ÜBUNG ${i + 1}</div>
          <h3>${esc(ex.name)}</h3>
          <p class="ex-meta">3 × ${esc(ex.reps)} · Pause ${esc(ex.rest)}</p>
        </div>
        ${skipped ? '<span class="badge skip-badge">Ausgelassen</span>' : ''}
      </div>
      ${skipped ? '' : exerciseFigure(ex.id)}
      ${ex.oneArm ? `<p class="onearm"><b>Links beginnen.</b> Rechts nur so viele Wdh. wie links.</p>` : ''}
      ${last ? `<p class="last">Letztes Mal (${fmtShort(last.date)}): ${last.weights.map(esc).join(' / ')} kg</p>` : ''}
      ${pb ? `<p class="last">PB: <b class="pb">${esc(pb.w)} kg</b> (${fmtShort(pb.date)})</p>` : ''}
      ${skipped ? '' : `<div class="sets">
        ${sets.map((s, j) => `<div class="set${s.d ? ' on' : ''}">
          <span class="n">Satz ${j + 1}${s.d && parseFloat(s.w) > (pb ? pb.w : 0) && pb ? '<b class="newpb">Neuer PB</b>' : ''}</span>
          <label><input type="text" inputmode="decimal" placeholder="0" value="${esc(s.w)}" data-input="w" data-ex="${ex.id}" data-set="${j}"><span class="unit-kg">kg</span></label>
          ${isDistance(ex) ? '' : `<label class="reps"><input type="text" inputmode="numeric" placeholder="${minReps(ex)}" value="${esc(s.r || '')}" data-input="r" data-ex="${ex.id}" data-set="${j}"><span class="unit-kg">Wdh</span></label>`}
          ${checkBtn(s.d, `data-action="set" data-ex="${ex.id}" data-set="${j}"`)}
        </div>`).join('')}
      </div>`}
      <div class="more">
        <button class="btn${open ? ' on' : ''}" data-action="tips" data-ex="${ex.id}">${open ? IC.close : IC.book}${open ? 'Schliessen' : 'Technik'}</button>
        <button class="btn${skipped ? ' on' : ''}" data-action="skip" data-ex="${ex.id}">${skipped ? IC.undo : IC.skip}${skipped ? 'Doch machen' : 'Auslassen'}</button>
        <a class="btn tint" href="${ex.demo}" target="_blank" rel="noopener">${IC.play}Video</a>
      </div>
      ${open ? `<ul class="tips">${ex.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <label class="exnote"><span>Notiz</span><textarea rows="2" placeholder="${skipped ? 'Warum ausgelassen? Was hast du stattdessen gemacht?' : 'Wie lief es? Keine Zeit, Gerät besetzt, etwas anderes gemacht …'}" data-input="note" data-ex="${ex.id}">${esc((day.notes || {})[ex.id] || '')}</textarea></label>
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
    return `<div class="more"><button class="btn${open ? ' on' : ''}" data-action="tips" data-ex="r-${r}">${open ? IC.close : IC.list}${open ? 'Schliessen' : 'Rezept & Mengen'}</button>
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
    <button class="btn fill wsave" data-action="weight-save">${IC.save}Speichern</button>
    <p class="note small">Am besten einmal pro Woche, gleicher Tag, morgens nüchtern, gleiche Waage.</p>
  </section>`;

  if (list.length) {
    html += `<section class="card"><div class="title">Verlauf</div>
      ${list.slice().reverse().slice(0, 12).map((e) => `<div class="wrow">
        <span>${fmtShort(e.d)}</span><b>${kg(e.kg)} kg</b>
        <button class="wdel" data-action="weight-del" data-d="${e.d}" aria-label="Eintrag löschen">${IC.trash}</button>
      </div>`).join('')}
    </section>`;
  }
  return html;
}

const num = (n) => Math.round(n).toLocaleString('de-CH');

function exerciseStats() {
  const stats = {};
  const days = Object.keys(store.days).sort();
  for (const [wd, plan] of Object.entries(PLAN)) {
    (plan.exercises || []).forEach((ex) => {
      const st = stats[ex.id] = { ex, unit: plan.title, wd: Number(wd), sets: 0, reps: 0, volume: 0, skipped: 0, best: 0, week: 0 };
      const weekStart = keyOf(dateFor(1));
      days.forEach((k) => {
        const day = store.days[k];
        if (day.skip && day.skip[ex.id]) st.skipped++;
        ((day.ex && day.ex[ex.id]) || []).forEach((s) => {
          if (!s.d) return;
          const w = parseFloat(s.w) || 0, r = repsOf(ex, s);
          st.sets++; st.reps += r; st.volume += w * r;
          if (k >= weekStart) st.week += w * r;
          if (w > st.best) st.best = w;
        });
      });
    });
  }
  return stats;
}

// Sätze pro Muskelgruppe zwischen zwei Tagen (inklusive), nur abgehakte Sätze
function muscleSets(from, to) {
  const load = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((g) => [g, 0]));
  for (const [k, day] of Object.entries(store.days)) {
    if (k < from || k > to) continue;
    for (const [id, sets] of Object.entries(day.ex || {})) {
      const n = sets.filter((s) => s.d).length;
      for (const [g, f] of Object.entries(MUSCLES[id] || {})) load[g] += n * f;
    }
  }
  return load;
}
const weeklyMuscleSets = () => muscleSets(keyOf(dateFor(1)), keyOf(dateFor(0)));

// Kennzahlen für einen Monat (offset 0 = dieser Monat, -1 = letzter …)
function monthStats(offset) {
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const from = keyOf(first), to = keyOf(last);
  const st = { first, last, from, to, units: 0, cardio: 0, days: 0, sets: 0, reps: 0, volume: 0 };
  const exById = {};
  Object.values(PLAN).forEach((p) => (p.exercises || []).forEach((ex) => { exById[ex.id] = ex; }));
  for (const [k, day] of Object.entries(store.days)) {
    if (k < from || k > to) continue;
    const [y, m, d] = k.split('-').map(Number);
    if (unitDoneAt(new Date(y, m - 1, d))) st.units++;
    if (day.cardio && day.cardio.d) st.cardio++;
    let trained = false;
    for (const [id, sets] of Object.entries(day.ex || {})) {
      const ex = exById[id];
      sets.forEach((s) => {
        if (!s.d || !ex) return;
        trained = true;
        const w = parseFloat(s.w) || 0, r = repsOf(ex, s);
        st.sets++; st.reps += r; st.volume += w * r;
      });
    }
    if (trained || (day.cardio && day.cardio.d)) st.days++;
  }
  // Ziel-Wochen im Monat: bis heute im laufenden Monat, sonst ganzer Monat
  const end = offset === 0 ? today : last;
  st.weeks = Math.max(1, (end.getDate()) / 7);
  st.load = muscleSets(from, to);
  return st;
}

// Muskelgruppen mit eigener Goldschicht je Ansicht (Dateien m-<seite>-<gruppe>.webp, aus der Farbschablone geschnitten)
const LAYERS = {
  front: ['trapez', 'schultern', 'brust', 'bizeps', 'unterarme', 'bauch', 'obliques', 'quads', 'waden'],
  back: ['trapez', 'hschulter', 'ruecken', 'ruecken_u', 'trizeps', 'unterarme', 'obliques', 'gesaess', 'beinbeuger', 'waden'],
};

// Stufe aus Anteil am Ziel: 1 = angefangen, 2 = auf Kurs, 3 = Ziel erreicht
function goldLevel(v) {
  if (!(v > 0)) return 0;
  return v >= 1 ? 3 : v >= 0.5 ? 2 : 1;
}

// Eine Körperansicht: weisse Figur, trainierte Gruppen exakt in Gold. levelOf(gruppe) gibt 0–3 zurück.
function bodyView(side, levelOf, f = 1, cls = '') {
  const layers = LAYERS[side].map((g) => {
    const lv = levelOf(g);
    return lv ? `<img class="gl lv${lv}" src="m-${side}-${g}.webp" alt="" decoding="async">` : '';
  }).join('');
  const label = side === 'front' ? 'Vorderseite' : 'Rückseite';
  return `<div class="body3d ${cls}" style="--sx:${f}" role="img" aria-label="${label}">
    <img src="body-${side}.jpg" alt="" decoding="async">${layers}</div>`;
}

// Statur aus dem letzten Gewichtseintrag (80 kg schmal, 115 kg breit)
function statureFactor() {
  const latest = [...store.weight].sort((a, b) => a.d.localeCompare(b.d)).pop();
  const t = latest ? Math.min(1, Math.max(0, (latest.kg - 80) / 35)) : 0.6;
  return { f: (0.92 + t * 0.2).toFixed(3), kg: latest && latest.kg };
}

// Figur vorne und hinten. Gold = so viel trainiert, wie das Ziel für den Zeitraum verlangt.
function anatomyFigure(load, weeks) {
  const { f } = statureFactor();
  const levelOf = (g) => goldLevel(load[g] / (MUSCLE_GROUPS[g].target * weeks));
  return `<div class="figure">
    <figure>${bodyView('front', levelOf, f)}<figcaption>Vorne</figcaption></figure>
    <figure>${bodyView('back', levelOf, f)}<figcaption>Hinten</figcaption></figure>
  </div>`;
}

// Kleine Figur bei jeder Übung: Hauptmuskel hell gold, Hilfsmuskel gedämpft
function exerciseFigure(id) {
  const m = MUSCLES[id] || {};
  const levelOf = (g) => (m[g] >= 1 ? 3 : m[g] ? 1 : 0);
  const names = (w) => Object.keys(m).filter((g) => (w ? m[g] >= 1 : m[g] < 1)).map((g) => MUSCLE_GROUPS[g].name);
  const main = names(true), help = names(false);
  return `<div class="exfig"><div class="exfig-bodies">${bodyView('front', levelOf, 1, 'mini')}${bodyView('back', levelOf, 1, 'mini')}</div>
    <div class="exfig-txt">${main.length ? `<span class="gold">${main.map(esc).join(', ')}</span>` : ''}${help.length ? `<span>Hilft mit: ${help.map(esc).join(', ')}</span>` : ''}</div></div>`;
}

function renderMyself() {
  const seg = (v, label) => `<button class="${meView === v ? 'sel' : ''}" data-action="me" data-view="${v}">${label}</button>`;
  return `<div class="seg">${seg('body', 'Körper')}${seg('stats', 'Statistik')}</div>` + renderStats();
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function renderMonth() {
  const m = monthStats(monthOffset), prev = monthStats(monthOffset - 1);
  const diff = prev.volume ? Math.round((m.volume / prev.volume - 1) * 100) : null;
  const groups = Object.entries(MUSCLE_GROUPS).map(([g, mg]) => [mg.name, m.load[g] / (mg.target * m.weeks)])
    .sort((a, b) => b[1] - a[1]);
  return `<section class="card month">
    <div class="month-nav">
      <button data-action="month" data-step="-1" aria-label="Vormonat">${IC.left}</button>
      <span>${MONTHS[m.first.getMonth()]} ${m.first.getFullYear()}</span>
      <button data-action="month" data-step="1" aria-label="Nächster Monat" ${monthOffset >= 0 ? 'disabled' : ''}>${IC.right}</button>
    </div>
    <div class="big">${num(m.volume)} kg <small>bewegt</small></div>
    ${diff !== null ? `<p class="note ${diff >= 0 ? 'gold' : ''}">${diff >= 0 ? '+' : ''}${diff} % gegenüber ${MONTHS[prev.first.getMonth()]}</p>` : ''}
    <div class="wstats">
      <div><b>${m.units}</b><span>Einheiten</span></div>
      <div><b>${m.cardio}</b><span>Cardio</span></div>
      <div><b>${m.days}</b><span>Aktive Tage</span></div>
      <div><b>${num(m.sets)}</b><span>Sätze</span></div>
      <div><b>${num(m.reps)}</b><span>Wdh.</span></div>
      <div><b>${prev.units}</b><span>Einh. Vormonat</span></div>
    </div>
    <div class="mbars">${groups.map(([n, v]) => `<div class="mbar"><span>${esc(n)}</span><i><b style="width:${Math.min(100, Math.round(v * 100))}%"></b></i></div>`).join('')}</div>
    <p class="note small">Balken: Sätze pro Muskelgruppe im Verhältnis zum Ziel für ${monthOffset === 0 ? 'die bisherigen Tage dieses Monats' : 'den ganzen Monat'}.</p>
  </section>`;
}

function renderStats() {
  const stats = Object.values(exerciseStats());
  const trainings = Object.values(store.days).filter((d) => Object.values(d.ex || {}).some((sets) => sets.some((s) => s.d))).length;
  const sum = (f) => stats.reduce((a, s) => a + s[f], 0);
  const isMonth = figPeriod === 'month';
  const ms = isMonth ? monthStats(0) : null;
  const load = isMonth ? ms.load : weeklyMuscleSets();
  const weeks = isMonth ? ms.weeks : 1;
  const groups = Object.entries(MUSCLE_GROUPS);
  const frac = (g, m) => load[g] / (m.target * weeks);
  const todo = groups.filter(([g, m]) => frac(g, m) < 0.5).map(([, m]) => m.name);
  const top = groups.filter(([g]) => load[g] > 0).sort((a, b) => frac(b[0], b[1]) - frac(a[0], a[1]))
    .slice(0, 3).map(([, m]) => m.name);
  const { kg } = statureFactor();
  const lastW = [...store.weight].sort((a, b) => a.d.localeCompare(b.d)).pop();
  const weighNudge = !lastW || daysBetween(lastW.d, keyOf(today)) >= 7;
  const pseg = (v, label) => `<button class="${figPeriod === v ? 'sel' : ''}" data-action="period" data-period="${v}">${label}</button>`;
  let html = `<section class="card">
    <div class="seg small-seg">${pseg('week', 'Diese Woche')}${pseg('month', 'Dieser Monat')}</div>
    ${anatomyFigure(load, weeks)}
    <div class="legend"><span><i class="lg0"></i>Nicht trainiert</span><span><i class="lg1"></i>Angefangen</span><span><i class="lg2"></i>Auf Kurs</span><span><i class="lg3"></i>Ziel erreicht</span></div>
    ${top.length ? `<p class="note"><b class="gold">Am meisten trainiert:</b> ${top.map(esc).join(', ')}</p>` : ''}
    ${todo.length ? `<p class="note"><b>Hier dran arbeiten:</b> ${todo.map(esc).join(', ')}</p>` : `<p class="note gold">Alle Muskelgruppen haben ${isMonth ? 'diesen Monat' : 'diese Woche'} genug bekommen.</p>`}
    <p class="note small">Gold leuchtet, was du ${isMonth ? 'diesen Monat' : 'diese Woche'} mit abgehakten Sätzen trainiert hast. Die Statur folgt deinem letzten Gewicht${kg ? ` (${String(kg).replace('.', ',')} kg)` : ''}.</p>
    ${weighNudge ? '<p class="warnline">Diese Woche noch nicht gewogen. Trag dein Gewicht unten ein, dann passt sich die Figur an.</p>' : ''}
  </section>`;
  if (meView === 'body') return html + renderWeight();
  html = renderMonth() + `<section class="card goal">
    <div class="label small">GESAMT SEIT START</div>
    <div class="big">${num(sum('volume'))} kg <small>bewegt</small></div>
    <p class="note">Diese Woche: ${num(sum('week'))} kg</p>
    <div class="wstats">
      <div><b>${trainings}</b><span>Trainings</span></div>
      <div><b>${num(sum('sets'))}</b><span>Sätze</span></div>
      <div><b>${num(sum('reps'))}</b><span>Wiederholungen</span></div>
    </div>
    <p class="note small">Gezählt werden nur abgehakte Sätze: Gewicht × Wiederholungen. Ohne Eintrag zählt die untere Wdh.-Zahl.</p>
  </section>`;

  for (const wd of [1, 2, 3, 4, 5]) {
    const group = stats.filter((s) => s.wd === wd);
    html += `<section class="card"><div class="title">${esc(PLAN[wd].title)} · ${DAY_SHORT[wd]}</div>
      ${group.map((s) => `<div class="srow">
        <div class="sname">${esc(s.ex.name)}</div>
        <div class="snums">
          <span><b>${num(s.volume)}</b> kg</span>
          <span><b>${s.sets}</b> Sätze</span>
          <span><b>${num(s.reps)}</b> Wdh</span>
          <span class="${s.skipped ? 'warn' : ''}"><b>${s.skipped}×</b> ausgelassen</span>
        </div>
        ${s.best ? `<div class="sbest">PB ${esc(s.best)} kg</div>` : ''}
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
  const wasDone = unitComplete(selected);
  switch (el.dataset.action) {
    case 'tab': tab = el.dataset.tab; window.scrollTo(0, 0); break;
    case 'me': meView = el.dataset.view; window.scrollTo(0, 0); break;
    case 'day': selected = Number(el.dataset.day); break;
    case 'period': figPeriod = el.dataset.period; break;
    case 'month': monthOffset = Math.min(0, monthOffset + Number(el.dataset.step)); break;
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
    case 'skip': {
      day.skip = day.skip || {};
      day.skip[el.dataset.ex] = !day.skip[el.dataset.ex];
      break;
    }
    case 'weight-save': {
      const d = document.querySelector('[data-weight="date"]').value || keyOf(today);
      const v = parseFloat(document.querySelector('[data-weight="kg"]').value.replace(',', '.'));
      if (!(v > 30 && v < 300)) return;
      store.weight = store.weight.filter((e) => e.d !== d).concat({ d, kg: v });
      break;
    }
    case 'notify':
      Notification.requestPermission().then(render).catch(() => {});
      return;
    case 'weight-del':
      if (!confirm('Eintrag löschen?')) return;
      store.weight = store.weight.filter((e) => e.d !== el.dataset.d);
      break;
    default: return;
  }
  save();
  render();
  if (!wasDone && unitComplete(selected)) celebrate();
});

// Eingaben speichern, ohne neu zu zeichnen (Tastatur bleibt offen)
document.addEventListener('input', (e) => {
  const el = e.target;
  const day = dayData(dateFor(selected));
  if (el.dataset.input === 'w') {
    setsOf(day, el.dataset.ex)[el.dataset.set].w = el.value.replace(',', '.').trim();
  } else if (el.dataset.input === 'r') {
    setsOf(day, el.dataset.ex)[el.dataset.set].r = el.value.replace(/\D/g, '');
  } else if (el.dataset.input === 'note') {
    day.notes = day.notes || {};
    if (el.value.trim()) day.notes[el.dataset.ex] = el.value;
    else delete day.notes[el.dataset.ex];
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

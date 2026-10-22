// GYM BUDDY – App-Logik. Alle Daten bleiben nur auf diesem Gerät (localStorage).

const KEY = 'gymbuddy.v1';
const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="#0b0b0c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let store = load();
let tab = 'training';
let meView = 'body'; // MYSELF: 'body' = Körper & Gewicht, 'stats' = Zahlen pro Übung
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
function unitComplete(weekday) {
  const plan = PLAN[weekday];
  if (!plan || plan.cardio) return false;
  const day = store.days[keyOf(dateFor(weekday))];
  if (!day) return false;
  const skip = day.skip || {};
  const done = (ex) => day.ex[ex.id] && day.ex[ex.id].every((s) => s.d);
  return plan.exercises.every((ex) => done(ex) || skip[ex.id]) && plan.exercises.some(done);
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
      ${ex.oneArm ? `<p class="onearm"><b>Links beginnen.</b> Rechts nur so viele Wdh. wie links.</p>` : ''}
      ${last ? `<p class="last">Letztes Mal (${fmtShort(last.date)}): ${last.weights.map(esc).join(' / ')} kg</p>` : ''}
      ${pb ? `<p class="last">PB: <b class="pb">${esc(pb.w)} kg</b> (${fmtShort(pb.date)})</p>` : ''}
      ${skipped ? '' : `<div class="sets">
        ${sets.map((s, j) => `<div class="set${s.d ? ' on' : ''}">
          <span class="n">Satz ${j + 1}${s.d && parseFloat(s.w) > (pb ? pb.w : 0) && pb ? '<b class="newpb">Neuer PB</b>' : ''}</span>
          <label><input type="text" inputmode="decimal" placeholder="Gewicht" value="${esc(s.w)}" data-input="w" data-ex="${ex.id}" data-set="${j}"><span class="unit-kg">kg</span></label>
          ${isDistance(ex) ? '' : `<label class="reps"><input type="text" inputmode="numeric" placeholder="${minReps(ex)}" value="${esc(s.r || '')}" data-input="r" data-ex="${ex.id}" data-set="${j}"><span class="unit-kg">Wdh</span></label>`}
          ${checkBtn(s.d, `data-action="set" data-ex="${ex.id}" data-set="${j}"`)}
        </div>`).join('')}
      </div>`}
      <div class="more">
        <button class="pill" data-action="tips" data-ex="${ex.id}">${open ? 'Technik schliessen' : 'Technik'}</button>
        <button class="pill${skipped ? ' on' : ''}" data-action="skip" data-ex="${ex.id}">${skipped ? 'Doch machen' : 'Nicht gemacht'}</button>
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

// Sätze pro Muskelgruppe in der aktuellen Woche (Mo–So), nur abgehakte Sätze
function weeklyMuscleSets() {
  const from = keyOf(dateFor(1)), to = keyOf(dateFor(0));
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

// Farbe: Grau (nicht trainiert) bis Champagner-Gold (Wochenziel erreicht)
function muscleColor(frac) {
  if (frac <= 0) return '#2c2c30';
  const t = Math.min(1, frac);
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mix(96, 228)},${mix(84, 196)},${mix(64, 140)})`;
}

// Weiche Kontur durch Punkte (Catmull-Rom zu Bézier)
function smoothPath(pts) {
  const n = pts.length, at = (i) => pts[(i + n) % n];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d + 'Z';
}
const mirror = (pts) => pts.map(([x, y]) => [200 - x, y]);

// Linke Körperhälfte (vom Betrachter aus), wird gespiegelt
const BODY_HALF = [[93,62],[90,76],[76,84],[58,88],[46,96],[40,108],[37,124],[35,142],[31,164],[27,188],[24,208],[22,222],[17,230],[15,242],[19,250],[25,250],[30,240],[33,226],[38,206],[44,184],[49,164],[53,146],[56,156],[58,176],[55,200],[53,230],[55,262],[57,292],[56,316],[57,346],[60,376],[59,394],[56,402],[62,408],[78,408],[81,398],[80,374],[82,344],[84,316],[86,284],[89,254],[94,228],[100,224]];

// [Gruppe, Punkte]. Gruppe null = nicht gezählter Muskel, nur für die Anatomie.
const MUSCLE_SHAPES = {
  front: [
    [null, [[91,64],[94,66],[86,86],[81,86]]],
    ['trapez', [[88,72],[73,84],[84,85]]],
    ['schultern', [[60,89],[49,95],[42,106],[40,120],[44,128],[50,118],[54,104]]],
    ['schultern', [[74,86],[63,88],[56,98],[55,112],[59,122],[64,108],[71,98],[78,92]]],
    ['brust', [[79,89],[98,91],[98,106],[82,106],[68,103],[70,94]]],
    ['brust', [[67,105],[98,108],[98,124],[90,131],[76,130],[64,121]]],
    ['obliques', [[63,126],[70,128],[70,134],[63,133]]],
    ['obliques', [[64,136],[72,137],[72,143],[65,142]]],
    ['obliques', [[66,145],[74,146],[73,152],[67,151]]],
    ['obliques', [[69,155],[83,140],[85,172],[88,204],[78,206],[70,190],[66,170]]],
    ['bauch', [[89,131],[98,130],[98,146],[89,147]]],
    ['bauch', [[88,150],[98,149],[98,165],[88,166]]],
    ['bauch', [[88,169],[98,168],[98,184],[88,185]]],
    ['bauch', [[88,188],[98,187],[98,214],[93,214],[89,204]]],
    ['bizeps', [[47,126],[55,124],[58,136],[56,152],[50,160],[44,154],[43,138]]],
    [null, [[40,146],[44,152],[44,162],[38,162]]],
    ['unterarme', [[43,166],[50,166],[48,184],[40,206],[35,204],[38,184]]],
    ['unterarme', [[36,164],[42,166],[37,186],[31,206],[28,198],[31,180]]],
    ['quads', [[73,224],[84,228],[86,258],[82,290],[76,292],[72,262]]],
    ['quads', [[62,218],[71,222],[71,262],[74,292],[66,298],[59,272],[57,242]]],
    ['quads', [[85,266],[90,262],[92,282],[86,302],[80,300],[83,290]]],
    [null, [[86,230],[96,234],[94,256],[88,262],[86,248]]],
    [null, [[68,304],[80,304],[80,314],[74,318],[68,314]]],
    ['waden', [[59,322],[65,324],[67,346],[63,370],[58,352]]],
    ['waden', [[78,322],[83,330],[83,352],[79,370],[76,350]]],
    [null, [[67,324],[75,324],[75,352],[71,384],[67,372]]],
  ],
  back: [
    ['trapez', [[94,62],[98,64],[98,152],[91,134],[82,108],[66,90],[84,82]]],
    ['hschulter', [[64,88],[51,92],[43,102],[40,118],[46,124],[54,112],[62,100]]],
    ['hschulter', [[68,100],[80,108],[86,124],[78,132],[67,126],[62,112]]],
    ['ruecken', [[62,118],[77,134],[90,148],[96,172],[90,184],[78,182],[67,166],[61,146],[59,128]]],
    ['ruecken_u', [[92,152],[98,155],[98,212],[90,214],[87,192]]],
    ['trizeps', [[38,124],[46,122],[48,140],[44,158],[38,150]]],
    ['trizeps', [[48,124],[55,128],[56,148],[50,162],[47,142]]],
    ['unterarme', [[42,166],[50,166],[47,186],[40,206],[35,204],[38,184]]],
    ['unterarme', [[36,164],[41,166],[36,186],[31,206],[28,198],[31,180]]],
    ['gesaess', [[62,196],[80,192],[88,204],[72,212],[59,210]]],
    ['gesaess', [[60,214],[84,208],[98,218],[98,252],[86,260],[70,256],[58,236]]],
    ['beinbeuger', [[60,264],[74,264],[74,300],[68,312],[59,292]]],
    ['beinbeuger', [[76,264],[89,268],[91,282],[86,304],[77,308]]],
    ['waden', [[58,318],[69,316],[71,340],[65,362],[57,348]]],
    ['waden', [[72,316],[82,322],[84,342],[78,366],[72,350]]],
    ['waden', [[61,362],[79,364],[77,384],[67,388]]],
  ],
};

// Anatomie-Figur vorne und hinten. Die Statur folgt dem letzten Gewichtseintrag.
function anatomyFigure(load) {
  const latest = [...store.weight].sort((a, b) => a.d.localeCompare(b.d)).pop();
  const t = latest ? Math.min(1, Math.max(0, (latest.kg - 80) / 35)) : 0.6;
  const f = (0.94 + t * 0.2).toFixed(3);
  const body = `<path d="${smoothPath(BODY_HALF.concat(mirror(BODY_HALF).reverse().slice(1)))}" class="fig-base"/>`;
  const view = (side) => MUSCLE_SHAPES[side].map(([g, pts]) => {
    const fill = g ? muscleColor(load[g] / MUSCLE_GROUPS[g].target) : '#26262a';
    const title = g ? `<title>${MUSCLE_GROUPS[g].name}</title>` : '';
    // Jeder Muskel bekommt eine Schattierung für Volumen
    return [pts, mirror(pts)].map((p) => {
      const d = smoothPath(p);
      return `<path d="${d}" fill="${fill}" class="fig-muscle">${title}</path><path d="${d}" fill="url(#shade-${side})" class="fig-shade"/>`;
    }).join('');
  }).join('');
  // Feine Linien: Brustbein und Linea alba vorne, Wirbelsäule und Kniekehlen hinten
  const lines = {
    front: 'M100,90 L100,214 M84,86 Q92,92 100,90 M116,86 Q108,92 100,90',
    back: 'M100,66 L100,214 M64,312 Q74,316 86,312 M136,312 Q126,316 114,312',
  };
  const svg = (side, label) => `<svg viewBox="0 4 200 410" role="img" aria-label="${label}">
    <defs><radialGradient id="shade-${side}" cx=".4" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
    <g transform="translate(100 0) scale(${f} 1) translate(-100 0)">${body}${view(side)}<path d="${lines[side]}" class="fig-line"/></g>
    <ellipse cx="100" cy="36" rx="19" ry="24" class="fig-base"/>
    ${side === 'front' ? '' : '<path d="M88,26 Q100,14 112,26" class="fig-line"/>'}</svg>`;
  return `<div class="figure">
    <figure>${svg('front', 'Vorderseite')}<figcaption>Vorne</figcaption></figure>
    <figure>${svg('back', 'Rückseite')}<figcaption>Hinten</figcaption></figure>
  </div>`;
}

function renderMyself() {
  const seg = (v, label) => `<button class="${meView === v ? 'sel' : ''}" data-action="me" data-view="${v}">${label}</button>`;
  return `<div class="seg">${seg('body', 'Körper')}${seg('stats', 'Statistik')}</div>` + renderStats();
}

function renderStats() {
  const stats = Object.values(exerciseStats());
  const trainings = Object.values(store.days).filter((d) => Object.values(d.ex || {}).some((sets) => sets.some((s) => s.d))).length;
  const sum = (f) => stats.reduce((a, s) => a + s[f], 0);
  const load = weeklyMuscleSets();
  const groups = Object.entries(MUSCLE_GROUPS);
  const todo = groups.filter(([g, m]) => load[g] < m.target * 0.5).map(([, m]) => m.name);
  const top = groups.filter(([g]) => load[g] > 0).sort((a, b) => load[b[0]] / b[1].target - load[a[0]] / a[1].target)
    .slice(0, 3).map(([, m]) => m.name);
  let html = `<section class="card">
    <div class="label small">DEIN KÖRPER DIESE WOCHE</div>
    ${anatomyFigure(load)}
    <div class="legend"><span><i style="background:${muscleColor(0)}"></i>Nicht trainiert</span><span><i style="background:${muscleColor(0.4)}"></i>Wenig</span><span><i style="background:${muscleColor(1)}"></i>Wochenziel</span></div>
    ${top.length ? `<p class="note"><b class="gold">Am meisten belastet:</b> ${top.map(esc).join(', ')}</p>` : ''}
    ${todo.length ? `<p class="note"><b>Hier dran arbeiten:</b> ${todo.map(esc).join(', ')}</p>` : '<p class="note gold">Alle Muskelgruppen haben diese Woche genug bekommen.</p>'}
    <p class="note small">Gezählt werden abgehakte Sätze von Montag bis Sonntag. Die Figur passt ihre Statur deinem letzten Gewichtseintrag an.</p>
  </section>`;
  if (meView === 'body') return html + renderWeight();
  html = `<section class="card goal">
    <div class="label small">GESAMT</div>
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
  switch (el.dataset.action) {
    case 'tab': tab = el.dataset.tab; window.scrollTo(0, 0); break;
    case 'me': meView = el.dataset.view; window.scrollTo(0, 0); break;
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
  } else if (el.dataset.input === 'r') {
    setsOf(day, el.dataset.ex)[el.dataset.set].r = el.value.replace(/\D/g, '');
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

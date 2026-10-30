/* Jargon Jar · quiz engine, results, home sample question, resources and glossary. */
(function () {
  "use strict";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const pad = (n, l) => String(n).padStart(l, "0");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const CATS = { ux: "UX", ui: "UI", ai: "AI" };
  const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Expert" };
  const TIERS = [1, 2, 3, 4];
  const PER_TIER = 3;            // 3 questions per level, one tier per level
  const ROUND = TIERS.length * PER_TIER;   // 12
  const LEVELS = [
    { name: "Curious", min: 0 },
    { name: "Practitioner", min: 45 },
    { name: "Specialist", min: 70 },
    { name: "Expert", min: 88 }
  ];
  const CAT_INFO = {
    mix: ["Mixed", "UX, UI and AI terms in one round."],
    ux: ["UX", "Research, flows and the laws behind them."],
    ui: ["UI", "Layout, type, components and accessibility."],
    ai: ["AI", "Models, prompts and AI product patterns."]
  };
  const ICON = {
    check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    retake: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    copy: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    ext: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    info: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };

  const levelFor = (pct) => LEVELS.reduce((idx, L, i) => (pct >= L.min ? i : idx), 0);
  // Position on a meter with four equal segments, one per level.
  const meterPos = (pct) => {
    const i = levelFor(pct), lo = LEVELS[i].min, hi = i < 3 ? LEVELS[i + 1].min : 100;
    return (i + Math.max(0.08, Math.min(1, (pct - lo) / (hi - lo || 1)))) / 4;
  };
  const joinList = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
  const termInSentence = (t) => (/[A-Z]{2}/.test(t) || t.split(" ").slice(1).some((w) => /^[A-Z]/.test(w)) ? t : t.charAt(0).toLowerCase() + t.slice(1));
  const article = (name) => (/^[AEIOU]/.test(name) ? "an" : "a");

  function jarSVG(level, size) {
    const L = [[18, 24, 45, 17], [18, 15, 36, 26], [18, 28, 49, 13], [18, 19, 40, 22]];
    let rows = "";
    for (let i = 0; i < level; i++) {
      const y = 72 - i * 15, even = i % 2 === 0;
      rows += `<rect x="${L[i][0]}" y="${y}" width="${L[i][1]}" height="12" rx="2.5" class="${even ? "f-a" : "f-t"}"/><rect x="${L[i][2]}" y="${y}" width="${L[i][3]}" height="12" rx="2.5" class="${even ? "f-t" : "f-a"}"/>`;
    }
    return `<svg class="jar" viewBox="0 0 80 96" width="${size}" height="${Math.round(size * 1.2)}" aria-hidden="true"><rect x="22" y="4" width="36" height="10" rx="3" class="f-t"/><rect x="12" y="17" width="56" height="74" rx="14" fill="none" class="s-t" stroke-width="2.5"/>${rows}</svg>`;
  }
  function meterHTML(pct) {
    const li = levelFor(pct);
    return `<div class="meter" role="img" aria-label="Level meter: ${LEVELS[li].name}"><div class="meter-track"><span class="meter-fill" data-to="${meterPos(pct).toFixed(4)}"></span><span class="meter-ticks"><span></span><span></span><span></span><span></span></span></div><div class="meter-labels">${LEVELS.map((L, i) => `<span class="${i === li ? "on" : ""}">${L.name}</span>`).join("")}</div></div>`;
  }
  function fillBars(root) {
    $$("[data-to]", root).forEach((el) => {
      const to = el.getAttribute("data-to");
      if (reduce) { el.style.transform = `scaleX(${to})`; return; }
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `scaleX(${to})`; }));
    });
  }
  function countUp(el, to, ms) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Data files: questions.json uses {category, difficulty, term, question, correct, distractors[3], explanation}.
  let dataPromise = null;
  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("questions.json").then((r) => { if (!r.ok) throw new Error("questions " + r.status); return r.json(); }),
        fetch("resources.json").then((r) => { if (!r.ok) throw new Error("resources " + r.status); return r.json(); })
      ]).then(([qs, rs]) => ({
        questions: qs.map((q) => ({ id: q.id, cat: q.category, d: q.difficulty, term: q.term, q: q.question, a: [q.correct].concat(q.distractors), ex: q.explanation })),
        resources: rs.map((r) => ({ cat: r.category, lvl: Math.max(0, LEVELS.findIndex((L) => L.name === r.level)), type: r.type, time: r.time, title: r.title, src: r.source, url: r.url }))
      }));
    }
    return dataPromise;
  }
  function loadError(el) {
    el.innerHTML = '<p class="empty">The questions didn’t load. Refresh the page to try again.</p>';
  }

  /* ---------- One question card ---------- */
  function mountQuestion(el, q, opts) {
    const order = shuffle([0, 1, 2, 3]), keys = ["A", "B", "C", "D"];
    el.innerHTML =
      `<div class="quiz-card">${opts.header || ""}` +
      `<h2 class="question" tabindex="-1">${esc(q.q)}</h2>` +
      `<div class="options" role="group" aria-label="Answers">${order.map((ai, i) => `<button type="button" class="option" data-ai="${ai}"><span class="key" aria-hidden="true">${keys[i]}</span><span class="label">${esc(q.a[ai])}</span><span class="mark" aria-hidden="true"></span></button>`).join("")}</div>` +
      `<div class="fb-slot" aria-live="polite"></div>` +
      `<div class="q-actions"><span class="kbd-hint hud-text">Keys 1–4 or A–D</span><span class="next-slot"></span></div></div>`;
    const buttons = $$(".option", el);
    let done = false;
    function answer(btn) {
      if (done) return;
      done = true;
      const ok = btn.getAttribute("data-ai") === "0";
      buttons.forEach((b) => {
        b.disabled = true;
        if (b.getAttribute("data-ai") === "0") { b.classList.add("is-correct"); $(".mark", b).innerHTML = ICON.check; }
        else if (b === btn) { b.classList.add("is-miss"); $(".mark", b).innerHTML = ICON.x; }
        else b.classList.add("is-dim");
      });
      $(".fb-slot", el).innerHTML = `<div class="feedback ${ok ? "ok" : "miss"}"><strong>${ok ? ICON.check + " That’s it." : ICON.x + " Not quite. It’s “" + esc(q.a[0]) + "”."}</strong><p>${esc(q.ex)}</p></div>`;
      $(".kbd-hint", el).hidden = true;
      if (opts.onAnswer) opts.onAnswer(ok);
    }
    buttons.forEach((b) => b.addEventListener("click", () => answer(b)));
    return {
      answer: (i) => { if (buttons[i]) answer(buttons[i]); },
      isDone: () => done,
      setNext: (html, handler) => {
        const slot = $(".next-slot", el);
        slot.innerHTML = html;
        const b = slot.querySelector("button, a");
        if (b) { if (handler) b.addEventListener("click", handler); b.focus({ preventScroll: true }); }
      }
    };
  }

  /* ---------- Home: sample question ---------- */
  const sample = $("#sample");
  if (sample) {
    try {
      const q = JSON.parse($("#sampleData").textContent);
      const ctl = mountQuestion(sample, { q: q.question, a: [q.correct].concat(q.distractors), ex: q.explanation }, {
        header: `<div class="q-top hud-text"><span>Sample · ${CATS[q.category]} · ${DIFF[q.difficulty]}</span><span>Q 01/01</span></div>`,
        onAnswer: () => ctl.setNext(`<a class="btn btn-primary" href="quiz.html">Take all ${ROUND} ${ICON.arrow}</a>`)
      });
      $(".question", sample).removeAttribute("tabindex");
    } catch (e) { sample.hidden = true; }
  }

  /* ---------- Quiz page ---------- */
  const quizRoot = $("#quizRoot");
  const hud = { q: $('[data-hud="q"]'), score: $('[data-hud="score"]'), time: $('[data-hud="time"]') };
  const state = { stage: "intro", cat: "mix", list: [], idx: 0, results: [], ctl: null, score: 0, t0: 0, timer: null, data: null };

  function setHud() {
    if (hud.q) hud.q.textContent = state.stage === "intro" ? "--/" + ROUND : pad(Math.min(state.idx + 1, state.list.length), 2) + "/" + pad(state.list.length, 2);
    if (hud.score) hud.score.textContent = pad(state.score, 2);
  }
  function tickTime() {
    if (!hud.time) return;
    const s = state.t0 ? Math.floor((Date.now() - state.t0) / 1000) : 0;
    hud.time.textContent = pad(Math.floor(s / 60), 2) + ":" + pad(s % 60, 2);
  }

  function renderIntro() {
    state.stage = "intro"; state.score = 0; state.t0 = 0;
    clearInterval(state.timer); tickTime(); setHud();
    quizRoot.innerHTML =
      `<div class="prose" style="gap:28px">` +
      `<p class="sec-label hud-text"><span class="num">00</span><span>Set up your round</span></p>` +
      `<h1 class="page-title lines" tabindex="-1"><span class="line"><span>Pick a <strong class="hl">category.</strong></span></span></h1>` +
      `<p class="lead">${ROUND} questions, ${PER_TIER} per level. Easy terms first, harder ones later. Each answer comes with a short explanation.</p>` +
      `<fieldset class="cat-picker"><legend class="hud-text">Category</legend>${["mix", "ux", "ui", "ai"].map((k) => `<div class="cat-option"><input type="radio" name="cat" id="cat-${k}" value="${k}"${state.cat === k ? " checked" : ""}><label for="cat-${k}"><b>${CAT_INFO[k][0]}</b><span>${CAT_INFO[k][1]}</span></label></div>`).join("")}</fieldset>` +
      `<div class="btn-row"><button class="btn btn-primary" type="button" id="startRound">Start the round ${ICON.arrow}</button><span class="hud-text">${ROUND} questions · about 3 min</span></div>` +
      `<p class="hud-text">Scoring · Easy 1 pt · Medium 2 pts · Hard 3 pts · Expert 4 pts</p></div>`;
    $$('input[name="cat"]', quizRoot).forEach((r) => r.addEventListener("change", () => { state.cat = r.value; }));
    $("#startRound").addEventListener("click", startRound);
  }

  function buildRound(qs, cat) {
    // 3 questions per level, in level order. Mixed: one UX, one UI and one AI term per level.
    return TIERS.reduce((acc, d) => {
      const tier = cat === "mix"
        ? ["ux", "ui", "ai"].map((c) => shuffle(qs.filter((q) => q.cat === c && q.d === d))[0]).filter(Boolean)
        : shuffle(qs.filter((q) => q.cat === cat && q.d === d)).slice(0, PER_TIER);
      return acc.concat(shuffle(tier));
    }, []);
  }

  function startRound() {
    state.list = buildRound(state.data.questions, state.cat);
    state.idx = 0; state.results = []; state.score = 0; state.stage = "play";
    state.t0 = Date.now();
    clearInterval(state.timer);
    state.timer = setInterval(tickTime, 1000);
    tickTime();
    renderQuestion();
  }

  const ROUND_NAMES = { 1: "Round 1 · Warm-up", 2: "Round 2 · The terms get trickier", 3: "Round 3 · Specialist territory", 4: "Round 4 · Expert territory" };
  function renderQuestion() {
    const q = state.list[state.idx], n = state.list.length;
    setHud();
    const header =
      `<div class="q-top hud-text"><span>Q ${pad(state.idx + 1, 2)}/${pad(n, 2)}</span><span>${CATS[q.cat]} · ${DIFF[q.d]} · ${q.d} pt${q.d > 1 ? "s" : ""}</span></div>` +
      `<div class="progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${state.idx}"><span style="transform:scaleX(${state.idx / n})"></span></div>` +
      `<p class="hud-text">${ROUND_NAMES[q.d]}</p>`;
    const wrap = document.createElement("div");
    quizRoot.innerHTML = "";
    quizRoot.appendChild(wrap);
    state.ctl = mountQuestion(wrap, q, {
      header,
      onAnswer: (ok) => {
        state.results.push({ q, ok });
        if (ok) state.score += q.d;
        setHud();
        $(".progress span", wrap).style.transform = `scaleX(${(state.idx + 1) / n})`;
        $(".progress", wrap).setAttribute("aria-valuenow", state.idx + 1);
        const last = state.idx === n - 1;
        state.ctl.setNext(`<button type="button" class="btn btn-primary">${last ? "See your level" : "Next question"} ${ICON.arrow}</button>`, () => {
          if (last) renderResults(); else { state.idx++; renderQuestion(); }
        });
      }
    });
    if (state.idx > 0) $(".question", wrap).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function statsBy(keyFn, keys) {
    const out = {};
    keys.forEach((k) => { out[k] = { earned: 0, max: 0, right: 0, total: 0, missed: [] }; });
    state.results.forEach((r) => {
      const s = out[keyFn(r.q)];
      s.max += r.q.d; s.total++;
      if (r.ok) { s.earned += r.q.d; s.right++; } else s.missed.push(r.q);
    });
    return out;
  }

  function resourceRow(r, i) {
    return `<li><a class="res-row" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="idx hud-text">${pad(i + 1, 2)}</span><span class="t">${esc(r.title)}<span class="src">${esc(r.src)}</span></span><span class="meta"><span class="tag">${CATS[r.cat]}</span><span class="tag tag-soft">${LEVELS[r.lvl].name}</span><span class="tag tag-soft">${esc(r.type)} · ${esc(r.time)}</span><span class="tag tag-soft" aria-label="Opens in a new tab">${ICON.ext}</span></span></a></li>`;
  }

  function renderResults() {
    state.stage = "results";
    clearInterval(state.timer);
    tickTime();
    const elapsed = hud.time ? hud.time.textContent : "";
    const earned = state.score;
    const max = state.results.reduce((a, r) => a + r.q.d, 0);
    const pct = Math.round((earned / max) * 100);
    const li = levelFor(pct), L = LEVELS[li], hi = li < 3 ? LEVELS[li + 1].min - 1 : 100;
    const missed = state.results.filter((r) => !r.ok).map((r) => r.q);
    let barsTitle, bars, summary, focusCat;

    if (state.cat === "mix") {
      const s = statsBy((q) => q.cat, ["ux", "ui", "ai"]);
      const rate = (k) => s[k].right / s[k].total;
      const ranked = ["ux", "ui", "ai"].sort((a, b) => rate(b) - rate(a) || s[b].earned / s[b].max - s[a].earned / s[a].max);
      const best = ranked[0], worst = ranked[2];
      focusCat = worst;
      barsTitle = "Score by area";
      bars = ["ux", "ui", "ai"].map((k) => ({ label: CATS[k], p: rate(k), val: s[k].right + "/" + s[k].total }));
      summary = `You’re strongest on ${CATS[best]} terms (${s[best].right} of ${s[best].total}). `;
      summary += s[worst].missed.length === 0
        ? "No gaps this round. Try a single-category round for harder terms."
        : `${CATS[worst]} terms are your gap: ${joinList(s[worst].missed.slice(0, 3).map((q) => termInSentence(q.term)))} tripped you up. Three short reads below will help.`;
    } else {
      const s = statsBy((q) => q.d, TIERS);
      focusCat = state.cat;
      barsTitle = "Score by difficulty";
      bars = TIERS.map((d) => ({ label: DIFF[d], p: s[d].total ? s[d].right / s[d].total : 0, val: s[d].right + "/" + s[d].total }));
      const strong = [4, 3, 2, 1].find((d) => s[d].total && s[d].right / s[d].total >= 0.75);
      summary = strong ? `You handled ${DIFF[strong].toLowerCase()} ${CATS[state.cat]} terms well (${s[strong].right} of ${s[strong].total}). ` : "This round was tough, and that’s useful to know. ";
      summary += missed.length === 0 ? "Nothing missed. Try the Mixed round next."
        : `${joinList(missed.slice(0, 3).map((q) => termInSentence(q.term)))}${missed.length > 3 ? " and a few others" : ""} tripped you up. Three short reads below will help.`;
    }
    summary = summary.charAt(0).toUpperCase() + summary.slice(1);

    const recs = state.data.resources.filter((r) => r.cat === focusCat)
      .map((r) => ({ r, dist: Math.abs(r.lvl - li) + (r.lvl < li ? 0.5 : 0) }))
      .sort((a, b) => a.dist - b.dist).slice(0, 3).map((x) => x.r);

    quizRoot.innerHTML =
      `<div class="results">` +
      `<div class="prose" style="gap:24px">` +
      `<p class="sec-label hud-text"><span class="num">${pad(state.list.length, 2)}/${pad(state.list.length, 2)}</span><span>Your level · ${CAT_INFO[state.cat][0]} round · ${elapsed}</span></p>` +
      `<div style="display:flex; gap:20px; align-items:flex-end; justify-content:space-between">` +
      `<h1 class="page-title lines" tabindex="-1"><span class="line"><span>You’re ${article(L.name)}</span></span><span class="line" style="--i:1"><span><strong class="accent">${L.name}.</strong></span></span></h1>${jarSVG(li + 1, 72)}</div>` +
      `<div class="score-big" aria-label="${earned} of ${max} points"><span class="n" aria-hidden="true" id="countUp">0</span><span class="of" aria-hidden="true">/ ${max} pts · ${pct}%</span></div>` +
      meterHTML(pct) +
      `<p class="lead" style="color:var(--text)">${esc(summary)}</p>` +
      `<p class="small muted">Expert questions count 4 points, hard 3, medium 2, easy 1. ${L.name} covers ${L.min}–${hi}% of points.</p>` +
      `<p class="honesty">${ICON.info}<span>This is a quick check, not a certification.</span></p></div>` +
      `<section class="prose" style="gap:16px" aria-labelledby="barsT"><h2 class="subhead" id="barsT">${barsTitle}</h2><ul class="bars">${bars.map((b) => `<li><span>${b.label}</span><span class="bar" role="img" aria-label="${b.label}: ${b.val} right"><span data-to="${b.p.toFixed(4)}"></span></span><span class="val">${b.val}</span></li>`).join("")}</ul></section>` +
      `<section class="prose" style="gap:16px" aria-labelledby="nextT"><h2 class="subhead" id="nextT">Next steps: ${CATS[focusCat]} reads for your level</h2><ul class="res-list" style="list-style:none;margin:0;padding:0">${recs.map(resourceRow).join("")}</ul></section>` +
      (missed.length ? `<section class="prose" style="gap:16px" aria-labelledby="missT"><h2 class="subhead" id="missT">Terms to review (${missed.length})</h2><ul class="missed">${missed.map((q) => `<li><b>${esc(q.term)}</b><span>${esc(q.ex)}</span></li>`).join("")}</ul></section>` : "") +
      `<div class="prose" style="gap:12px"><div class="btn-row"><button class="btn btn-primary" type="button" id="retakeBtn">${ICON.retake} Retake the quiz</button><button class="btn btn-ghost" type="button" id="shareBtn">${ICON.copy} Share your level</button><a class="btn btn-ghost" href="resources.html">All resources</a></div><p class="status" id="shareStatus" aria-live="polite"></p><div id="shareFallback"></div></div>` +
      `</div>`;

    fillBars(quizRoot);
    countUp($("#countUp"), earned, 1100);
    $("h1", quizRoot).focus({ preventScroll: true });
    window.scrollTo(0, 0);
    $("#retakeBtn").addEventListener("click", renderIntro);
    const shareText = `I’m ${article(L.name)} ${L.name} on Jargon Jar: ${earned}/${max} points on the ${CAT_INFO[state.cat][0]} round. Know your terms. Know your level.`;
    $("#shareBtn").addEventListener("click", () => {
      const status = $("#shareStatus"), fb = $("#shareFallback");
      const fallback = () => {
        status.textContent = "Copy this text:";
        fb.innerHTML = '<textarea class="copy-fallback" id="shareText" readonly aria-label="Text to share"></textarea>';
        const ta = $("#shareText"); ta.value = shareText; ta.focus(); ta.select();
      };
      try { navigator.clipboard.writeText(shareText).then(() => { status.textContent = "Copied. Paste it wherever you like."; fb.innerHTML = ""; }, fallback); }
      catch (e) { fallback(); }
    });
  }

  if (quizRoot) {
    loadData().then((data) => { state.data = data; renderIntro(); }).catch((e) => { console.error(e); loadError(quizRoot); });
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      const k = e.key.toLowerCase();
      if (!(k in map)) return;
      if (state.stage === "play" && state.ctl && !state.ctl.isDone()) { state.ctl.answer(map[k]); e.preventDefault(); }
    });
  }

  /* ---------- Resources page ---------- */
  const resList = $("#resList");
  if (resList) {
    const filt = { cat: "all", lvl: "all" };
    const chips = (el, opts, key, render) => {
      el.insertAdjacentHTML("beforeend", opts.map((o) => `<button type="button" class="chip" data-v="${o[0]}" aria-pressed="${filt[key] === o[0]}">${o[1]}</button>`).join(""));
      el.addEventListener("click", (e) => {
        const b = e.target.closest(".chip"); if (!b) return;
        filt[key] = b.getAttribute("data-v");
        $$(".chip", el).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        render();
      });
    };
    loadData().then((data) => {
      const render = () => {
        const list = data.resources.filter((r) => (filt.cat === "all" || r.cat === filt.cat) && (filt.lvl === "all" || String(r.lvl) === filt.lvl));
        $("#resCount").textContent = `${pad(list.length, 2)} of ${pad(data.resources.length, 2)} resources`;
        resList.innerHTML = list.length ? list.map(resourceRow).join("") : '<li class="empty">Nothing here yet for this mix. Try another level, or suggest a resource on the Contact page.</li>';
      };
      chips($("#catFilter"), [["all", "All"], ["ux", "UX"], ["ui", "UI"], ["ai", "AI"]], "cat", render);
      chips($("#lvlFilter"), [["all", "All"]].concat(LEVELS.map((L, i) => [String(i), L.name])), "lvl", render);
      render();

      // Glossary, A to Z, built from the question bank.
      const key = (t) => t.replace(/^The /, "");
      const sorted = data.questions.slice().sort((a, b) => key(a.term).localeCompare(key(b.term), "en", { sensitivity: "base", numeric: true }));
      const groups = {};
      sorted.forEach((q) => { let L = key(q.term).charAt(0).toUpperCase(); if (/[0-9]/.test(L)) L = "#"; (groups[L] = groups[L] || []).push(q); });
      const letters = Object.keys(groups).sort((a, b) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)));
      const gid = (L) => "g-" + (L === "#" ? "num" : L);
      $("#azNav").innerHTML = letters.map((L) => `<button type="button" data-l="${L}" aria-label="Jump to ${L === "#" ? "numbers" : L}">${L}</button>`).join("");
      $("#gloss").innerHTML = letters.map((L) => `<div class="gloss-group"><h3 id="${gid(L)}">${L}</h3><dl>${groups[L].map((q) => `<dt>${esc(q.term)} <span class="tag tag-soft">${CATS[q.cat]}</span></dt><dd>${esc(q.ex)}</dd>`).join("")}</dl></div>`).join("");
      $("#azNav").addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const t = document.getElementById(gid(b.getAttribute("data-l")));
        if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    }).catch((e) => { console.error(e); resList.innerHTML = '<li class="empty">The resources didn’t load. Refresh the page to try again.</li>'; });
  }
})();

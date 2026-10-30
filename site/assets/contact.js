/* Jargon Jar · contact form, with the "Report an error" flow:
   topic → search modal to pick a term → where the error is → current text → suggested fix + reason. */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
  const CATS = { ux: "UX", ui: "UI", ai: "AI" };
  const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_ALERT = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

  const form = $("#contactForm");
  if (!form) return;

  const PARTS = {
    question: { label: "Question", field: "q", fix: "What should the question say?" },
    correct: { label: "Correct answer", field: "correct", fix: "What should the correct answer be?" },
    explanation: { label: "Explanation", field: "ex", fix: "What should the explanation say?" }
  };

  const topic = $("#cTopic");
  const reportBlock = $("#reportBlock");
  const msgField = $("#msgField");
  const picker = $("#termPicker");
  const dialog = $("#termDialog");
  const search = $("#termSearch");
  const list = $("#termList");
  const countEl = $("#termCount");
  const partField = $("#partField");
  const detail = $("#errorDetail");

  let terms = null;           // loaded on first need
  let selected = null;        // chosen question
  let loading = null;

  function loadTerms() {
    if (!loading) {
      loading = fetch("questions.json")
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then((qs) => {
          terms = qs.map((q) => ({ id: q.id, cat: q.category, term: q.term, q: q.question, correct: q.correct, ex: q.explanation }))
            .sort((a, b) => a.term.replace(/^The /, "").localeCompare(b.term.replace(/^The /, ""), "en", { sensitivity: "base", numeric: true }));
          return terms;
        });
    }
    return loading;
  }

  /* ---------- Errors ---------- */
  function setErr(id, msg, input) {
    const err = document.getElementById(id + "Err");
    const target = input || document.getElementById(id);
    if (msg) {
      if (target) target.setAttribute("aria-invalid", "true");
      err.hidden = false; err.innerHTML = ICON_ALERT + " <span></span>"; err.lastChild.textContent = msg;
    } else {
      if (target) target.removeAttribute("aria-invalid");
      err.hidden = true; err.textContent = "";
    }
    return !msg;
  }

  /* ---------- Topic switch ---------- */
  function isReport() { return topic.value === "Report an error"; }
  function syncTopic() {
    const on = isReport();
    reportBlock.hidden = !on;
    msgField.hidden = on;
    $("#cMsg").disabled = on;                       // not sent with a report
    $$("input, textarea", reportBlock).forEach((el) => { el.disabled = !on; });
    if (on) loadTerms().catch(() => {});
  }
  topic.addEventListener("change", () => {
    syncTopic();
    if (isReport() && !selected) openDialog();
  });

  /* ---------- Search modal ---------- */
  let shown = [];
  function renderList() {
    const qn = norm(search.value.trim());
    shown = !qn ? terms : terms.filter((t) => norm(t.term).includes(qn) || norm(t.q).includes(qn) || norm(t.ex).includes(qn))
      .sort((a, b) => (norm(b.term).startsWith(qn) ? 1 : 0) - (norm(a.term).startsWith(qn) ? 1 : 0));
    countEl.textContent = shown.length === terms.length ? `${terms.length} terms` : `${shown.length} of ${terms.length} terms`;
    if (!shown.length) {
      list.innerHTML = `<li class="term-empty">No term matches “${esc(search.value.trim())}”. Try a shorter word, or pick Suggest a term in the topic list.</li>`;
      return;
    }
    list.innerHTML = shown.map((t, i) =>
      `<li><button type="button" class="term-opt${selected && selected.id === t.id ? " is-selected" : ""}" data-i="${i}" aria-pressed="${selected && selected.id === t.id ? "true" : "false"}">` +
      `<span class="term-name">${esc(t.term)}</span><span class="tag tag-soft">${CATS[t.cat]}</span>` +
      `<span class="term-q">${esc(t.q)}</span></button></li>`).join("");
  }
  function openDialog() {
    if (typeof dialog.showModal !== "function") { dialog.setAttribute("open", ""); }
    else if (!dialog.open) dialog.showModal();
    search.value = "";
    list.innerHTML = '<li class="term-empty">Loading terms…</li>';
    loadTerms().then(() => { renderList(); search.focus(); })
      .catch(() => { list.innerHTML = '<li class="term-empty">The terms didn’t load. Close this and try again.</li>'; });
    search.focus();
  }
  function closeDialog() {
    if (dialog.open) { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }
  }
  picker.addEventListener("click", openDialog);
  $("#termClose").addEventListener("click", closeDialog);
  dialog.addEventListener("close", () => picker.focus());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) closeDialog(); });   // backdrop click
  search.addEventListener("input", renderList);

  // Keyboard: arrows move between search and results, Enter picks.
  search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { const f = $(".term-opt", list); if (f) { e.preventDefault(); f.focus(); } }
    if (e.key === "Enter") { e.preventDefault(); if (shown.length) choose(shown[0]); }
  });
  list.addEventListener("keydown", (e) => {
    const opts = $$(".term-opt", list), i = opts.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" && i < opts.length - 1) { e.preventDefault(); opts[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (i === 0 ? search : opts[i - 1]).focus(); }
    if (e.key === "Home") { e.preventDefault(); opts[0].focus(); }
    if (e.key === "End") { e.preventDefault(); opts[opts.length - 1].focus(); }
  });
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".term-opt"); if (!b) return;
    choose(shown[+b.getAttribute("data-i")]);
  });

  function choose(t) {
    selected = t;
    $("#termValue").innerHTML = `<span class="term-name">${esc(t.term)}</span> <span class="tag tag-soft">${CATS[t.cat]}</span>`;
    picker.classList.add("has-value");
    $("#fTerm").value = `${t.term} (#${t.id}, ${CATS[t.cat]})`;
    setErr("term", "", picker);
    partField.hidden = false;
    closeDialog();
    showPart();
  }

  /* ---------- Where is the error ---------- */
  $$('input[name="error_location"]').forEach((r) => r.addEventListener("change", () => { setErr("part", ""); showPart(); }));
  function showPart() {
    const checked = $('input[name="error_location"]:checked');
    if (!selected || !checked) { detail.hidden = true; return; }
    const part = PARTS[checked.value];
    const text = selected[part.field];
    $("#currentLabel").textContent = `Current ${part.label.toLowerCase()} · ${selected.term}`;
    $("#currentQuote").textContent = text;
    $("#fCurrent").value = text;
    $("#fixLabel").textContent = part.fix;
    detail.hidden = false;
  }

  /* ---------- Success ---------- */
  function showSuccess(demo) {
    const extra = isReport() && selected ? `<p>I’ll check “${esc(selected.term)}” and fix it if needed.</p>` : "";
    $("#contactArea").innerHTML =
      `<div class="success-box" tabindex="-1" id="successBox"><strong>${ICON_CHECK} Thanks, got it.</strong><p>I’ll reply within a few days.</p>${extra}</div>` +
      (demo ? '<p class="proto-note" style="margin-top:16px">Prototype: nothing was sent. Add your form service ID in contact.html to send messages for real.</p>' : "");
    $("#successBox").focus();
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#cName").value.trim(), email = $("#cEmail").value.trim();
    const checks = [];
    if (isReport()) {
      checks.push(setErr("term", selected ? "" : "Choose the term with the error.", picker));
      const part = $('input[name="error_location"]:checked');
      checks.push(setErr("part", selected && !part ? "Choose where the error is: question, correct answer or explanation." : ""));
      if (selected && part) {
        checks.push(setErr("cFix", $("#cFix").value.trim().length >= 3 ? "" : "Write what it should say instead."));
        checks.push(setErr("cWhy", $("#cWhy").value.trim().length >= 10 ? "" : "Tell me why it’s wrong, in a sentence or two. A source helps."));
      }
    } else {
      checks.push(setErr("cMsg", $("#cMsg").value.trim().length >= 10 ? "" : "Write at least a sentence so I can help."));
    }
    checks.push(setErr("cName", name ? "" : "Add your name so I know who to reply to."));
    checks.push(setErr("cEmail", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Add an email like name@example.com."));
    if (!checks.every(Boolean)) {
      const first = form.querySelector('[aria-invalid="true"]') || (partField.hidden ? null : $('input[name="error_location"]'));
      if (first) first.focus();
      return;
    }
    const endpoint = form.getAttribute("data-endpoint") || "";
    if (endpoint.indexOf("YOUR-FORM-ID") >= 0) { showSuccess(true); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Sending…";
    fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error(r.status); showSuccess(false); })
      .catch(() => {
        btn.disabled = false; btn.textContent = "Send message";
        setErr("cEmail", "That didn’t go through. Check your connection and try again.");
      });
  });

  syncTopic();
})();

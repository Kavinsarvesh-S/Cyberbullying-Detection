(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ------------------------------------------------ Theme Switcher */
  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cbd-theme", next);
    } catch (e) {
      /* storage unavailable */
    }
  }

  const themeToggle = $("#theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  /* ------------------------------------------------ Copy cURL Snippet */
  const copyBtn = $("#copy-curl-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const code = $("#curl-code")?.innerText || "";
      const copyText = $("#copy-text");
      try {
        await navigator.clipboard.writeText(code);
        if (copyText) copyText.textContent = "Copied!";
        setTimeout(() => {
          if (copyText) copyText.textContent = "Copy cURL";
        }, 2000);
      } catch (err) {
        /* fallback */
      }
    });
  }

  /* ------------------------------------------------ Category Formatter */
  const formatCategory = (s) => {
    if (!s || s === "none" || s === "0" || s === "not_cyberbullying" || s === "neither") return "No Cyberbullying";
    if (s === "1") return "Cyberbullying";
    const names = {
      gender_sexism: "Sexism / Gender",
      gender: "Sexism / Gender",
      sexism: "Sexism",
      racism_ethnicity: "Racism / Ethnicity",
      ethnicity: "Racism / Ethnicity",
      racism: "Racism",
      religion: "Religious Bullying",
      age: "Age-Based Bullying",
      offensive_language: "Offensive Language",
      hate_speech: "Hate Speech",
      other_cyberbullying: "Other Cyberbullying"
    };
    if (names[s]) return names[s];
    return String(s)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const cap = (s) => formatCategory(String(s));

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({ error: "Unexpected response from classification service." }));
    if (!res.ok) throw new Error(data.error || "Analysis request failed.");
    return data;
  }

  /* ------------------------------------------------ Single Message Analysis */
  const form = $("#analyse-form");
  if (form) {
    const text = $("#text"),
      result = $("#result"),
      go = $("#go"),
      count = $("#count"),
      telemetryStatus = $("#telemetry-status");
    const HKEY = "cbd-history";

    const loadHist = () => {
      try {
        return JSON.parse(localStorage.getItem(HKEY)) || [];
      } catch (e) {
        return [];
      }
    };

    const saveHist = (h) => {
      try {
        localStorage.setItem(HKEY, JSON.stringify(h));
      } catch (e) {
        /* storage unavailable */
      }
    };

    function renderHistory() {
      const h = loadHist(),
        wrap = $("#history-wrap"),
        list = $("#history");
      wrap.hidden = h.length === 0;
      list.innerHTML = h
        .map(
          (e, i) => `<li><button type="button" class="history-item" data-i="${i}" title="${esc(e.text)}">
        <span class="history-text">${esc(e.text)}</span>
        <span class="badge ${e.flagged ? "badge-flag" : "badge-clear"}">${e.flagged ? esc(cap(e.category)) : "Clean"}</span></button></li>`
        )
        .join("");
    }

    function renderResult(d) {
      const flagged = d.flagged;
      result.dataset.state = flagged ? "flag" : "clear";
      if (telemetryStatus) {
        telemetryStatus.textContent = flagged ? "Flagged" : "Clean";
        telemetryStatus.className = "status-meta " + (flagged ? "meta-flagged" : "meta-clean");
      }

      const marked = d.segments
        .map((s) => (s.w > 0.05 ? `<mark style="--w:${s.w}" title="Attribution: ${(s.w * 100).toFixed(0)}%">${esc(s.t)}</mark>` : esc(s.t)))
        .join("");

      const order = Object.keys(d.scores).sort((a, b) => d.scores[b] - d.scores[a]);
      const win = flagged ? d.category : "none";
      const metricRows = order
        .map(
          (k) => `<div class="distribution-row ${k === win ? "win" : ""}">
          <span class="dist-name">${formatCategory(k)}</span>
          <div class="dist-track"><div class="dist-fill" style="width:${d.scores[k]}%"></div></div>
          <span class="dist-val">${d.scores[k]}%</span>
        </div>`
        )
        .join("");

      const terms = d.key_terms.length
        ? `<div class="key-terms-line"><span class="key-terms-label">Influential words:</span> <span class="key-terms-list">${d.key_terms.map(esc).join(", ")}</span></div>`
        : "";

      result.innerHTML = `
        <div class="verdict-banner ${flagged ? "banner-flag" : "banner-clear"}">
          <div class="verdict-topline">
            <span class="badge ${flagged ? "badge-flag" : "badge-clear"}">
              ${flagged ? "Flagged as Cyberbullying" : "Clean — No Cyberbullying Detected"}
            </span>
            <span class="confidence-pill">Confidence: <strong>${d.confidence}%</strong></span>
          </div>
          <h3 class="verdict-title">${flagged ? esc(formatCategory(d.category)) : "Standard Non-Harassing Content"}</h3>
          <p class="verdict-description">${
            flagged
              ? "This message was classified under " + esc(formatCategory(d.category)) + " with " + d.confidence + "% relative margin."
              : "No targeted harassment, hate speech, or bullying patterns were detected across the evaluated categories."
          }</p>
        </div>

        <div class="influence-section">
          <div class="section-subhead">
            <h4>Word Influence & Attribution</h4>
            <span class="subhead-meta">Higher highlight intensity = stronger influence</span>
          </div>
          <div class="marked-text-box">${marked}</div>
          ${terms}
        </div>

        <div class="distribution-section">
          <div class="section-subhead">
            <h4>Confidence Across Categories</h4>
          </div>
          <div class="distribution-bars" id="bars-chart-wrap">
            ${metricRows}
          </div>
        </div>

        <details class="details-drawer">
          <summary>View preprocessed tokens</summary>
          <div class="drawer-content">
            <code>${esc(d.cleaned || "(empty after filtering)")}</code>
          </div>
        </details>

        <div class="calibration-note">
          Scores reflect normalized softmax approximations of Linear SVM decision margins.
        </div>`;

    }

    function renderError(msg) {
      result.dataset.state = "empty";
      if (telemetryStatus) {
        telemetryStatus.textContent = "Error";
        telemetryStatus.className = "status-meta meta-error";
      }
      result.innerHTML = `<div class="alert alert-error" role="alert">${esc(msg)}</div>`;
    }

    async function run() {
      const value = text.value.trim();
      if (!value) {
        renderError("Please enter some text to analyze.");
        text.focus();
        return;
      }
      go.disabled = true;
      go.innerHTML = `<span>Analyzing...</span>`;
      try {
        const d = await postJSON("/api/analyze", { text: value });
        renderResult(d);
        const h = loadHist().filter((e) => e.text !== value);
        h.unshift({ text: value, flagged: d.flagged, category: d.category });
        saveHist(h.slice(0, 8));
        renderHistory();
      } catch (err) {
        renderError(err.message);
      } finally {
        go.disabled = false;
        go.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Analyze message</span>`;
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      run();
    });

    text.addEventListener("input", () => {
      count.textContent = `${text.value.length} / 2,000 characters`;
    });

    text.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    });

    $("#clear").addEventListener("click", () => {
      text.value = "";
      count.textContent = "0 / 2,000 characters";
      result.dataset.state = "empty";
      if (telemetryStatus) {
        telemetryStatus.textContent = "Awaiting input";
        telemetryStatus.className = "status-meta";
      }
      result.innerHTML = `
        <div class="empty-placeholder">
          <div class="empty-icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3 class="empty-headline">No message analyzed yet</h3>
          <p class="empty-text">Enter text on the left and select <strong>Analyze message</strong>, or click any sample to view classification and word&nbsp;influence.</p>
        </div>`;
      text.focus();
    });

    const examples = $("#examples");
    if (examples) {
      examples.addEventListener("click", (e) => {
        const b = e.target.closest(".chip, .fix-btn");
        if (!b) return;
        text.value = b.dataset.text;
        count.textContent = `${text.value.length} / 2,000 characters`;
        run();
      });
    }

    const histList = $("#history");
    if (histList) {
      histList.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const item = loadHist()[+b.dataset.i];
        if (item) {
          text.value = item.text;
          count.textContent = `${text.value.length} / 2,000 characters`;
          run();
        }
      });
    }

    const clearHist = $("#clear-history");
    if (clearHist) {
      clearHist.addEventListener("click", () => {
        saveHist([]);
        renderHistory();
      });
    }

    renderHistory();
  }

  /* ------------------------------------------------ Batch CSV Processing */
  const bform = $("#batch-form");
  if (bform) {
    const file = $("#file"),
      drop = $("#drop"),
      label = $("#drop-label"),
      err = $("#batch-error");
    const out = $("#batch-result"),
      body = $("#rows"),
      go = $("#batch-go");
    let rows = [],
      filter = "all";

    const showError = (m) => {
      err.textContent = m || "";
      err.hidden = !m;
    };

    file.addEventListener("change", () => {
      label.textContent = file.files[0] ? file.files[0].name : "Drop your CSV file here, or click to browse";
    });

    ["dragover", "dragenter"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("over");
      })
    );

    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("over");
      })
    );

    drop.addEventListener("drop", (e) => {
      if (e.dataTransfer.files.length) {
        file.files = e.dataTransfer.files;
        file.dispatchEvent(new Event("change"));
      }
    });

    function drawRows() {
      const list = filter === "flagged" ? rows.filter((r) => r.category) : rows;
      body.innerHTML = list.length
        ? list
            .map(
              (r) => `<tr>
                <td class="num">#${r.row}</td>
                <td class="msg">${esc(r.text)}</td>
                <td><span class="badge ${r.category ? "badge-flag" : "badge-clear"}">${
                r.category ? esc(formatCategory(r.category)) : "Clean"
              }</span></td>
                <td class="num">${r.confidence}%</td>
              </tr>`
            )
            .join("")
        : '<tr><td colspan="4" class="table-empty">No messages match the active filter.</td></tr>';
    }

    bform.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError("");
      if (!file.files[0]) {
        showError("Please select a CSV file first.");
        return;
      }
      const fd = new FormData();
      fd.append("file", file.files[0]);
      go.disabled = true;
      go.innerHTML = `<span>Analyzing file...</span>`;
      try {
        const res = await fetch("/api/batch", { method: "POST", body: fd });
        const d = await res.json().catch(() => ({ error: "Failed to parse batch dataset." }));
        if (!res.ok) throw new Error(d.error || "Batch analysis failed.");

        rows = d.rows;
        filter = "all";
        $$(".seg-btn, .seg-eng-btn").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.filter === "all"))
        );
        const pct = Math.round((d.flagged / d.total) * 100);
        const extra = Object.entries(d.counts)
          .filter(([k]) => k !== "none")
          .map(
            ([k, v]) => `<div class="metric-card"><b>${v}</b><span>${esc(cap(k))}</span></div>`
          )
          .join("");

        $("#stats").innerHTML = `
          <div class="metric-card"><b>${d.total}</b><span>Total messages${d.truncated ? " (limit reached)" : ""}</span></div>
          <div class="metric-card"><b class="color-flag">${d.flagged}</b><span>Flagged messages (${pct}%)</span></div>
          <div class="metric-card"><b class="color-clear">${d.total - d.flagged}</b><span>Clean messages (${100 - pct}%)</span></div>
          ${extra}`;

        drawRows();
        out.hidden = false;
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (ex) {
        showError(ex.message);
        out.hidden = true;
      } finally {
        go.disabled = false;
        go.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Analyze file</span>`;
      }
    });

    $$(".seg-btn, .seg-eng-btn").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.filter;
        $$(".seg-btn, .seg-eng-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawRows();
      })
    );

    const dlBtn = $("#download");
    if (dlBtn) {
      dlBtn.addEventListener("click", () => {
        const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = ["row,text,result,category,confidence"]
          .concat(rows.map((r) => [r.row, q(r.text), q(r.label), r.category, r.confidence].join(",")))
          .join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
        a.download = "cyberbullying_analysis_results.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }
  }
})();
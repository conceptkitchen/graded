/**
 * Graded Content Script — watches AI chat inputs and shows real-time trust grades.
 */

(function () {
  if (document.getElementById("graded-badge")) return;

  // Create badge
  const badge = document.createElement("div");
  badge.id = "graded-badge";
  badge.innerHTML = `
    <div class="graded-pill graded-idle" id="graded-pill">
      <div class="graded-grade" id="graded-grade-letter">-</div>
      <div>
        <div class="graded-label">Graded</div>
        <div class="graded-score" id="graded-score-text">Waiting...</div>
      </div>
    </div>
  `;
  document.body.appendChild(badge);

  // Create panel
  const panel = document.createElement("div");
  panel.id = "graded-panel";
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Scan Results</span>
      <span class="panel-close" id="graded-close">&times;</span>
    </div>
    <div id="graded-checks"></div>
    <div id="graded-findings" style="margin-top: 8px;"></div>
  `;
  document.body.appendChild(panel);

  // Toggle panel
  document.getElementById("graded-pill").addEventListener("click", () => {
    panel.classList.toggle("visible");
  });
  document.getElementById("graded-close").addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.remove("visible");
  });

  let lastText = "";
  let debounceTimer = null;

  function gradeClass(grade) {
    return "graded-grade-" + grade.toLowerCase();
  }

  function updateBadge(result) {
    const pill = document.getElementById("graded-pill");
    const letter = document.getElementById("graded-grade-letter");
    const scoreText = document.getElementById("graded-score-text");

    // Remove old grade classes and idle
    pill.className = "graded-pill";
    pill.classList.add(gradeClass(result.grade));

    letter.textContent = result.grade;
    scoreText.textContent = result.score + "/100";

    // Update panel
    const checksDiv = document.getElementById("graded-checks");
    checksDiv.innerHTML = result.checks
      .map(
        (c) =>
          `<div class="check-row">
        <span class="check-name">${c.name}</span>
        <span class="${c.passed ? "check-pass" : "check-fail"}">${c.passed ? "PASS" : "FAIL" + (c.findings.length > 1 ? " (" + c.findings.length + ")" : "")}</span>
      </div>`
      )
      .join("");

    const findingsDiv = document.getElementById("graded-findings");
    const allFindings = result.checks.flatMap((c) => c.findings);
    if (allFindings.length === 0) {
      findingsDiv.innerHTML = '<div style="color: #22c55e; text-align: center; padding: 8px;">No issues detected</div>';
    } else {
      findingsDiv.innerHTML = allFindings
        .slice(0, 10)
        .map(
          (f) =>
            `<div class="finding finding-${f.severity}">
          <div class="finding-severity" style="color: ${f.severity === "critical" ? "#ef4444" : f.severity === "high" ? "#f97316" : f.severity === "medium" ? "#eab308" : "#6b7280"}">${f.severity}</div>
          <div class="finding-desc">${f.description.slice(0, 80)}</div>
        </div>`
        )
        .join("");
      if (allFindings.length > 10) {
        findingsDiv.innerHTML += `<div style="color: #666; text-align: center; padding: 4px; font-size: 10px;">+${allFindings.length - 10} more</div>`;
      }
    }
  }

  function setIdle() {
    const pill = document.getElementById("graded-pill");
    pill.className = "graded-pill graded-idle";
    document.getElementById("graded-grade-letter").textContent = "-";
    document.getElementById("graded-score-text").textContent = "Waiting...";
  }

  function scanInput(text) {
    if (!text || text.trim().length < 5) {
      setIdle();
      return;
    }
    if (text === lastText) return;
    lastText = text;

    const result = gradedScan(text);
    updateBadge(result);
  }

  // Find the chat input — different selectors for different AI platforms
  function findChatInput() {
    // ChatGPT
    const cgpt = document.querySelector("#prompt-textarea, [data-testid='text-input'], div[contenteditable='true'][id='prompt-textarea']");
    if (cgpt) return cgpt;

    // Claude
    const claude = document.querySelector("div.ProseMirror[contenteditable='true'], fieldset div[contenteditable='true']");
    if (claude) return claude;

    // Gemini
    const gemini = document.querySelector("rich-textarea .ql-editor, div[contenteditable='true'][aria-label*='prompt']");
    if (gemini) return gemini;

    // Generic fallback: any large contenteditable div or textarea
    const editable = document.querySelector("div[contenteditable='true'][role='textbox'], textarea[rows]");
    if (editable) return editable;

    return null;
  }

  function getInputText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value;
    return el.innerText || el.textContent || "";
  }

  // Poll for input changes (MutationObserver + interval for reliability)
  function startWatching() {
    setInterval(() => {
      const input = findChatInput();
      const text = getInputText(input);

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => scanInput(text), 300);
    }, 500);
  }

  // Wait for page to be ready then start
  if (document.readyState === "complete") {
    startWatching();
  } else {
    window.addEventListener("load", startWatching);
  }
})();

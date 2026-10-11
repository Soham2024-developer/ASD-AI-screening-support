const $ = id => document.getElementById(id);
const steps = ["s-home", "s-info", "s-quiz", "s-load", "s-result"];
const state = { info: {}, answers: {}, i: 0 };

function show(id) {
  steps.forEach(s => $(s).classList.toggle("active", s === id));
  const pct = { "s-home": 0, "s-info": 10, "s-quiz": 10 + (state.i / QUESTIONS.length) * 80, "s-load": 95, "s-result": 100 }[id];
  $("bar").style.width = pct + "%";
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));

// ── Child info ──
$("info-form").onsubmit = e => {
  e.preventDefault();
  const age = +$("age").value, sex = document.querySelector("[name=sex]:checked"),
        fam = document.querySelector("[name=family]:checked"), lang = $("lang").value;
  $("age-err").textContent = "";
  if (!age || age < 12 || age > 72) { $("age-err").textContent = "Enter an age between 12 and 72 months."; return; }
  if (!sex || !lang || !fam) { $("info-err").textContent = "Please answer every question to continue."; return; }
  $("info-err").textContent = "";
  state.info = { age_months: age, sex: sex.value, language: lang, family_history: +fam.value };
  state.i = 0; renderQ(); show("s-quiz");
};

// ── Questions ──
function renderQ() {
  const q = QUESTIONS[state.i];
  $("q-count").textContent = `Question ${state.i + 1} of ${QUESTIONS.length}`;
  $("q-text").textContent = q.text;
  $("q-help").textContent = q.help || "";
  $("q-options").innerHTML = "";
  OPTIONS.forEach((label, v) => {
    const b = document.createElement("button");
    b.className = "opt" + (state.answers[q.id] === v ? " sel" : "");
    b.textContent = label; b.setAttribute("role", "radio");
    b.onclick = () => { state.answers[q.id] = v; next(); };
    $("q-options").appendChild(b);
  });
  $("bar").style.width = 10 + (state.i / QUESTIONS.length) * 80 + "%";
  $("q-text").focus();
}
function next() {
  if (state.i < QUESTIONS.length - 1) { state.i++; renderQ(); } else submit();
}
$("q-back").onclick = () => state.i > 0 ? (state.i--, renderQ()) : show("s-info");

// ── Submit + result ──
async function submit() {
  show("s-load");
  const res = await predict({ ...state.info, answers: state.answers });
  renderResult(res); show("s-result");
}

function level(p) {
  if (p < 0.35) return { c: "", t: "Low likelihood", m: "The answers show few of the signs this screening looks for. Keep enjoying play and talking together, and re-check if you notice changes." };
  if (p < 0.6)  return { c: "mid", t: "Some signs noticed", m: "A few answers pointed to differences in communication or behaviour. A talk with your paediatrician or child-development clinic is a good idea." };
  return { c: "high", t: "Several signs noticed", m: "Many answers pointed to differences linked with autism. We recommend booking an assessment with a specialist soon." };
}

function renderResult(res) {
  const L = level(res.probability), pct = Math.round(res.probability * 100);
  $("result-card").className = "result-card " + L.c;
  $("r-level").textContent = L.t; $("r-msg").textContent = L.m;
  $("r-score").textContent = `Screening score: ${pct} / 100`;
  $("r-meter").style.width = "0";
  requestAnimationFrame(() => requestAnimationFrame(() => $("r-meter").style.width = pct + "%"));

  $("r-domains").innerHTML = Object.entries(res.domain_scores).map(([d, v]) => `
    <div class="dom"><div class="dom-head"><span>${d}</span><span>${Math.round(v * 100)}%</span></div>
    <div class="meter"><i style="width:${Math.round(v * 100)}%"></i></div></div>`).join("");

  const next = ["Share this result with your child's doctor or a child-development specialist.",
    "Note down examples of behaviours you've seen. Short videos can help the clinician."];
  if (res.probability >= 0.35) next.push("Ask about a formal developmental assessment.");
  if (res.probability >= 0.6)  next.push("Ask your NGO or local health centre about early-intervention programmes.");
  $("r-next").innerHTML = next.map(s => `<li>${s}</li>`).join("");

  $("r-source").textContent = res.source === "demo"
    ? "Demo mode: scores come from a simple placeholder formula, not the trained model."
    : "Scored by the trained model.";
}

$("restart").onclick = () => { state.answers = {}; state.info = {}; $("info-form").reset(); show("s-home"); };
show("s-home");

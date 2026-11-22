const $ = id => document.getElementById(id);
const steps = ["s-home", "s-info", "s-quiz", "s-video", "s-load", "s-result"];
const state = { info: {}, answers: {}, i: 0, videoUrl: null };

function show(id) {
  steps.forEach(s => $(s).classList.toggle("active", s === id));
  const pct = { "s-home": 0, "s-info": 10, "s-quiz": 10 + (state.i / QUESTIONS.length) * 70, "s-video": 85, "s-load": 95, "s-result": 100 }[id];
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
  if (!age || age < 11 || age > 4) { $("age-err").textContent = "Enter an age between 12 and 72 months."; return; }
  if (!sex || !lang || !fam) { $("info-err").textContent = "Please answer every question to continue."; return; }
  $("info-err").textContent = "";
  state.info = { age_months: age*12, sex: sex.value, language: lang, family_history: +fam.value };
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
  $("bar").style.width = 10 + (state.i / QUESTIONS.length) * 70 + "%";
  $("q-text").focus();
}
function next() {
  if (state.i < QUESTIONS.length - 1) { state.i++; renderQ(); } else show("s-video");
}
$("q-back").onclick = () => state.i > 0 ? (state.i--, renderQ()) : show("s-info");


// Optional video selection and local preview
const videoInput = $("child-video");
const videoPreview = $("video-preview");
const videoPreviewWrap = $("video-preview-wrap");
function clearVideo() {
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = null;
  videoInput.value = "";
  videoPreview.removeAttribute("src");
  videoPreview.load();
  videoPreviewWrap.hidden = true;
  $("video-name").textContent = "";
}
videoInput.onchange = () => {
  const file = videoInput.files && videoInput.files[0];
  if (!file) return;
  const allowed = ["video/mp4", "video/webm", "video/quicktime"];
  const extensionOk = /\\.(mp4|mov|webm)$/i.test(file.name);
  if ((!allowed.includes(file.type) && !extensionOk) || file.size > 100 * 1024 * 1024) {
    alert("Choose an MP4, MOV or WEBM video up to 100 MB.");
    clearVideo();
    return;
  }
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = URL.createObjectURL(file);
  videoPreview.src = state.videoUrl;
  $("video-name").textContent = file.name + " · " + (file.size / (1024 * 1024)).toFixed(1) + " MB";
  videoPreviewWrap.hidden = false;
};
$("remove-video").onclick = clearVideo;
$("skip-video").onclick = submit;
$("continue-video").onclick = submit;

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

$("restart").onclick = () => { clearVideo(); state.answers = {}; state.info = {}; state.i = 0; $("info-form").reset(); show("s-home"); };
window.addEventListener("beforeunload", () => { if (state.videoUrl) URL.revokeObjectURL(state.videoUrl); });
show("s-home");

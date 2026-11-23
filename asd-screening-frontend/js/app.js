const $ = id => document.getElementById(id);
const steps = ["s-home", "s-consent", "s-info", "s-quiz", "s-video", "s-load", "s-result"];
const state = { info: {}, answers: {}, i: 0, videoUrl: null, language: "en" };

function show(id) {
  steps.forEach(s => $(s).classList.toggle("active", s === id));
  const pct = { "s-home": 0, "s-consent": 5, "s-info": 10, "s-quiz": 10 + (state.i / QUESTIONS.length) * 70, "s-video": 85, "s-load": 95, "s-result": 100 }[id];
  $("bar").style.width = pct + "%";
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));

$("continue-consent").onclick = () => {
  if (!$("guardian-consent").checked) {
    $("consent-err").textContent = "Parent or guardian consent is required to continue.";
    return;
  }
  $("consent-err").textContent = "";
  show("s-info");
};

// ── Child info ──
$("info-form").onsubmit = e => {
  e.preventDefault();
  const age = Number($("age").value), participantId = $("participant-id").value.trim(),
        sex = document.querySelector("[name=sex]:checked"),
        fam = document.querySelector("[name=family]:checked"), lang = $("lang").value;
  $("age-err").textContent = "";
  $("info-err").textContent = "";
  if (!Number.isInteger(age) || age < 4 || age > 11) {
    $("age-err").textContent = "Enter a whole-number age from 4 to 11 years.";
    return;
  }
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(participantId)) {
    $("info-err").textContent = "Enter a valid coded participant ID (3-32 letters, numbers, hyphens or underscores). Do not use the child's name.";
    return;
  }
  if (!sex || !lang || !fam) { $("info-err").textContent = "Please answer every question to continue."; return; }
  state.info = { participant_id: participantId, age_months: age * 12, sex: sex.value, language: lang, family_history: Number(fam.value) };
  state.i = 0; renderQ(); show("s-quiz");
};

// ── Questions ──
function renderQ() {
  const q = QUESTIONS[state.i];
  $("q-count").textContent = state.language === "hi" ? `प्रश्न ${state.i + 1} / ${QUESTIONS.length}` : `Question ${state.i + 1} of ${QUESTIONS.length}`;
  $("q-text").textContent = localizedQuestion(q.id, q.text);
  $("q-help").textContent = localizedQuestionHelp(q.id, q.help || "");
  $("q-options").innerHTML = "";
  (state.language === "hi" ? ["कभी नहीं", "शायद ही कभी", "कभी-कभी", "अक्सर", "हमेशा"] : OPTIONS).forEach((label, v) => {
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


// Required video selection and local preview (server upload is not implemented in this frontend).
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
  const extensionOk = /\.(mp4|mov|webm)$/i.test(file.name);
  if ((!allowed.includes(file.type) && !extensionOk) || file.size > 100 * 1024 * 1024 || file.size === 0) {
    $("video-err").textContent = "Choose a non-empty MP4, MOV or WEBM video up to 100 MB.";
    clearVideo();
    $("continue-video").disabled = true;
    return;
  }
  $("video-err").textContent = "";
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = URL.createObjectURL(file);
  videoPreview.src = state.videoUrl;
  $("video-name").textContent = file.name + " · " + (file.size / (1024 * 1024)).toFixed(1) + " MB";
  videoPreviewWrap.hidden = false;
  $("continue-video").disabled = !($("video-consent").checked);
};
$("remove-video").onclick = () => {
  clearVideo();
  $("continue-video").disabled = true;
};
$("continue-video").disabled = true;
$("video-consent").onchange = () => {
  $("continue-video").disabled = !(videoInput.files && videoInput.files[0] && $("video-consent").checked);
};
$("continue-video").onclick = () => {
  if (!videoInput.files || !videoInput.files[0]) {
    $("video-err").textContent = "Please select a video before continuing.";
    return;
  }
  if (!$("video-consent").checked) {
    $("video-err").textContent = "Please confirm guardian permission for this video.";
    return;
  }
  submit();
};

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
  $("r-level").textContent = state.language === "hi" ? (res.probability < 0.35 ? "कम संकेत" : res.probability < 0.6 ? "कुछ संकेत दिखाई दिए" : "कई संकेत दिखाई दिए") : L.t; $("r-msg").textContent = state.language === "hi" ? "कुछ उत्तर संचार या व्यवहार में अंतर की ओर संकेत करते हैं। बाल रोग विशेषज्ञ या बाल-विकास विशेषज्ञ से बात करना उचित होगा।" : L.m;
  $("r-score").textContent = state.language === "hi" ? `स्क्रीनिंग स्कोर: ${pct} / 100` : `Screening score: ${pct} / 100`;
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

$("restart").onclick = () => { clearVideo(); state.answers = {}; state.info = {}; state.i = 0; $("info-form").reset(); $("guardian-consent").checked = false; $("video-consent").checked = false; $("continue-video").disabled = true; applyLanguage("en");
show("s-home"); };
window.addEventListener("beforeunload", () => { if (state.videoUrl) URL.revokeObjectURL(state.videoUrl); });
show("s-home");

function localizedQuestion(id, fallback) { return state.language === "hi" && window.HI_QUESTIONS[id] ? window.HI_QUESTIONS[id].text : fallback; }
function localizedQuestionHelp(id, fallback) { return state.language === "hi" && window.HI_QUESTIONS[id] ? (window.HI_QUESTIONS[id].help || "") : fallback; }
function applyLanguage(lang) {
  state.language = lang; document.documentElement.lang = lang;
  const hi = lang === "hi";
  const map = {
    "s-home h1": ["A quick check on how your child communicates and plays", "आपका बच्चा कैसे बातचीत करता है और खेलता है — एक संक्षिप्त जाँच"],
    "#s-home .lead": ["Answer 10 short questions about everyday behaviour. It takes about 5 minutes. This prototype provides screening support and does not diagnose autism.", "रोज़मर्रा के व्यवहार के बारे में 10 छोटे सवालों के जवाब दें। इसमें लगभग 5 मिनट लगेंगे। यह प्रोटोटाइप स्क्रीनिंग में सहायता करता है, ऑटिज़्म का निदान नहीं करता।"],
    "#s-consent h2": ["Parent or guardian consent", "माता-पिता या अभिभावक की सहमति"],
    "#s-consent .lead": ["Please read this information before continuing.", "आगे बढ़ने से पहले कृपया यह जानकारी पढ़ें।"],
    "#s-info h2": ["About the child", "बच्चे के बारे में"],
    "#s-video h2": ["Upload a short video", "एक छोटा वीडियो चुनें"],
    "#continue-consent": ["I agree and continue", "मैं सहमत हूँ और आगे बढ़ना चाहता/चाहती हूँ"],
    "#continue-video": ["Continue", "आगे बढ़ें"],
    "#q-back": ["Back", "वापस"],
    "#restart": ["Screen another child", "दूसरे बच्चे की स्क्रीनिंग करें"]
  };
  Object.keys(map).forEach(sel => { const el=document.querySelector(sel); if(el) el.textContent=map[sel][hi?1:0]; });
  if (state.i < QUESTIONS.length && $("s-quiz").classList.contains("active")) renderQ();
}
const languageSelect = $("ui-language");
if (languageSelect) languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));

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
    $("consent-err").textContent = (state.language === "hi" ? "आगे बढ़ने के लिए माता-पिता या अभिभावक की सहमति आवश्यक है।" : "Parent or guardian consent is required to continue.");
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
    $("age-err").textContent = (state.language === "hi" ? "4 से 11 वर्ष के बीच पूरी संख्या में आयु दर्ज करें।" : "Enter a whole-number age from 4 to 11 years.");
    return;
  }
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(participantId)) {
    $("info-err").textContent = "Enter a valid coded participant ID (3-32 letters, numbers, hyphens or underscores). Do not use the child's name.";
    return;
  }
  if (!sex || !lang || !fam) { $("info-err").textContent = (state.language === "hi" ? "आगे बढ़ने के लिए कृपया सभी प्रश्नों के उत्तर दें।" : "Please answer every question to continue."); return; }
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
    $("video-err").textContent = (state.language === "hi" ? "100 MB तक की वैध MP4, MOV या WEBM वीडियो फ़ाइल चुनें।" : "Choose a non-empty MP4, MOV or WEBM video up to 100 MB.");
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
    $("video-err").textContent = (state.language === "hi" ? "आगे बढ़ने से पहले वीडियो चुनें।" : "Please select a video before continuing.");
    return;
  }
  if (!$("video-consent").checked) {
    $("video-err").textContent = (state.language === "hi" ? "कृपया इस वीडियो के लिए अभिभावक की अनुमति की पुष्टि करें।" : "Please confirm guardian permission for this video.");
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

  const domainNames = state.language === "hi" ? {Social:"सामाजिक व्यवहार",Communication:"संचार",Behaviour:"व्यवहार"} : {};\n  $("r-domains").innerHTML = Object.entries(res.domain_scores).map(([d, v]) => `
    <div class="dom"><div class="dom-head"><span>${domainNames[d] || d}</span><span>${Math.round(v * 100)}%</span></div>
    <div class="meter"><i style="width:${Math.round(v * 100)}%"></i></div></div>`).join("");

  const next = state.language === "hi" ? ["इस परिणाम को अपने बच्चे के डॉक्टर या बाल-विकास विशेषज्ञ के साथ साझा करें।","आपने जो व्यवहार देखे हैं, उनके उदाहरण लिखें। छोटे वीडियो चिकित्सक की मदद कर सकते हैं।"] : ["Share this result with your child's doctor or a child-development specialist.","Note down examples of behaviours you've seen. Short videos can help the clinician."];
  if (res.probability >= 0.35) next.push(state.language === "hi" ? "औपचारिक विकासात्मक मूल्यांकन के बारे में पूछें।" : "Ask about a formal developmental assessment.");
  if (res.probability >= 0.6)  next.push(state.language === "hi" ? "प्रारंभिक सहायता कार्यक्रमों के बारे में NGO या स्थानीय स्वास्थ्य केंद्र से पूछें।" : "Ask your NGO or local health centre about early-intervention programmes.");
  $("r-next").innerHTML = next.map(s => `<li>${s}</li>`).join("");

  $("r-source").textContent = res.source === "demo"
    ? "Demo mode: scores come from a simple placeholder formula, not the trained model."
    : "Scored by the trained model.";
}

$("restart").onclick = () => { clearVideo(); state.answers = {}; state.info = {}; state.i = 0; $("info-form").reset(); $("guardian-consent").checked = false; $("video-consent").checked = false; $("continue-video").disabled = true; applyLanguage("en");
show("s-home"); };
window.addEventListener("beforeunload", () => { if (state.videoUrl) URL.revokeObjectURL(state.videoUrl); });
applyLanguage("en");
show("s-home");

function localizedQuestion(id, fallback) { return state.language === "hi" && window.HI_QUESTIONS[id] ? window.HI_QUESTIONS[id].text : fallback; }
function localizedQuestionHelp(id, fallback) { return state.language === "hi" && window.HI_QUESTIONS[id] ? (window.HI_QUESTIONS[id].help || "") : fallback; }
function applyLanguage(lang) {
  state.language = lang;
  const hi = lang === "hi";
  document.documentElement.lang = hi ? "hi" : "en";
  const set = (selector, en, hindi) => { const el=document.querySelector(selector); if(el) el.textContent=hi?hindi:en; };
  const label = (selector, en, hindi) => {
    const el=document.querySelector(selector);
    if(!el) return;
    const node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.nodeValue.trim());
    if(node) node.nodeValue=(hi?hindi:en)+" ";
  };
  set(".brand","ASD Screening Assistant","ASD स्क्रीनिंग सहायक");
  set(".tag","Prototype · not a diagnosis","प्रोटोटाइप · निदान नहीं");
  label(".language-picker","Choose your language / अपनी भाषा चुनें","अपनी भाषा चुनें");
  set("#s-home h1","A quick check on how your child communicates and plays","आपका बच्चा कैसे बातचीत करता है और खेलता है — एक संक्षिप्त जाँच");
  set("#s-home .lead","Answer 10 short questions about everyday behaviour. It takes about 5 minutes. This prototype provides screening support and does not diagnose autism.","रोज़मर्रा के व्यवहार के बारे में 10 छोटे सवालों के जवाब दें। इसमें लगभग 5 मिनट लगेंगे। यह प्रोटोटाइप स्क्रीनिंग में सहायता करता है, ऑटिज़्म का निदान नहीं करता।");
  const homeEn=["No names or photos are stored in this prototype.","The result is a screening signal, not a diagnosis.","Built with data gathered together with our NGO partner."];
  const homeHi=["इस प्रोटोटाइप में नाम या तस्वीरें संग्रहीत नहीं की जाती हैं।","परिणाम केवल स्क्रीनिंग संकेत है, निदान नहीं।","यह परियोजना हमारे NGO सहयोगी के साथ एकत्र किए गए डेटा पर आधारित है।"];
  document.querySelectorAll("#s-home .ticks li").forEach((e,i)=>e.textContent=hi?homeHi[i]:homeEn[i]);
  set("#s-home [data-go]","Start screening","स्क्रीनिंग शुरू करें");
  set("#s-consent h2","Parent or guardian consent","माता-पिता या अभिभावक की सहमति");
  set("#s-consent .lead","Please read this information before continuing.","आगे बढ़ने से पहले कृपया यह जानकारी पढ़ें।");
  const cEn=["This is a student screening-support prototype, not a diagnostic tool.","Participation is voluntary. You may stop at any time.","Do not enter the child's name or other directly identifying details.","Video selection in this version is for local preview only; the video is not uploaded or analysed.","For real-world use, the project team must provide an approved privacy notice and secure data-handling process."];
  const cHi=["यह विद्यार्थियों द्वारा बनाया गया स्क्रीनिंग-सहायता प्रोटोटाइप है, निदान का उपकरण नहीं।","भागीदारी स्वैच्छिक है। आप किसी भी समय रुक सकते हैं।","बच्चे का नाम या पहचान बताने वाली अन्य जानकारी न भरें।","इस संस्करण में वीडियो केवल आपके ब्राउज़र में देखा जाता है; इसे अपलोड या विश्लेषित नहीं किया जाता।","वास्तविक उपयोग के लिए स्वीकृत गोपनीयता सूचना और सुरक्षित डेटा-प्रबंधन प्रक्रिया आवश्यक है।"];
  document.querySelectorAll("#s-consent .ticks li").forEach((e,i)=>e.textContent=hi?cHi[i]:cEn[i]);
  const gc=document.querySelector("#s-consent .consent-check");
  if(gc) gc.lastChild.textContent=hi?" मैं बच्चे का माता-पिता या कानूनी अभिभावक हूँ, मैंने ऊपर दी गई जानकारी पढ़ ली है और इस प्रोटोटाइप को जारी रखने की सहमति देता/देती हूँ।":" I am the child's parent or legal guardian, I have read the information above, and I agree to continue with this prototype.";
  set("#continue-consent","I agree and continue","मैं सहमत हूँ और आगे बढ़ें");
  set("#s-consent [data-go]","Back","वापस");
  set("#s-info h2","About the child","बच्चे के बारे में");
  label("#info-form > label:nth-of-type(1)","Participant ID (use a code, not the child's name)","प्रतिभागी ID (बच्चे का नाम नहीं, एक कोड लिखें)");
  label("#info-form > label:nth-of-type(2)","Age in completed years","पूरे किए गए वर्षों में आयु");
  set("#participant-id + .hint","Use the coded ID assigned by your project/NGO team. Do not enter a name.","अपनी परियोजना/NGO टीम द्वारा दिया गया कोड इस्तेमाल करें। नाम न लिखें।");
  set("#age + .hint","This screening is only for children aged 4 to 11 years, inclusive.","यह स्क्रीनिंग केवल 4 से 11 वर्ष की आयु के बच्चों के लिए है।");
  set("#info-form fieldset:nth-of-type(1) legend","Sex","लिंग");
  const sexEn=["Girl","Boy","Prefer not to say"], sexHi=["लड़की","लड़का","बताना नहीं चाहते"];
  document.querySelectorAll("#info-form fieldset:nth-of-type(1) .chip span").forEach((e,i)=>e.textContent=hi?sexHi[i]:sexEn[i]);
  label("#info-form > label:nth-of-type(3)","Main language at home","घर में मुख्य भाषा");
  const langEn=["Choose…","Hindi","English","Bengali","Tamil","Marathi","Other"], langHi=["चुनें…","हिन्दी","अंग्रेज़ी","बंगाली","तमिल","मराठी","अन्य"];
  document.querySelectorAll("#lang option").forEach((e,i)=>{if(langEn[i])e.textContent=hi?langHi[i]:langEn[i];});
  set("#info-form fieldset:nth-of-type(2) legend","Has a family member been diagnosed with ASD?","क्या परिवार के किसी सदस्य को ASD का निदान हुआ है?");
  const ynEn=["Yes","No","Not sure"], ynHi=["हाँ","नहीं","पता नहीं"];
  document.querySelectorAll("#info-form fieldset:nth-of-type(2) .chip span").forEach((e,i)=>e.textContent=hi?ynHi[i]:ynEn[i]);
  set("#info-form [data-go]","Back","वापस");
  set("#info-form button[type=submit]","Continue","आगे बढ़ें");
  set("#s-video h2","Upload a short video","एक छोटा वीडियो चुनें");
  set("#s-video .lead","Select the required video for this screening. Only select a video when you have the appropriate guardian permission.","इस स्क्रीनिंग के लिए आवश्यक वीडियो चुनें। वीडियो तभी चुनें जब आपके पास अभिभावक की उचित अनुमति हो।");
  label("#s-video .upload-label","Choose a video","वीडियो चुनें");
  set("#s-video > .hint","Supported formats: MP4, MOV and WEBM. Maximum file size: 100 MB.","मान्य फ़ॉर्मेट: MP4, MOV और WEBM। अधिकतम फ़ाइल आकार: 100 MB।");
  set("#remove-video","Remove video","वीडियो हटाएँ");
  const vc=document.querySelector("#s-video .video-consent");
  if(vc) vc.lastChild.textContent=hi?" मैं पुष्टि करता/करती हूँ कि इस स्क्रीनिंग गतिविधि के लिए मुझे बच्चे के अभिभावक के रूप में इस वीडियो का उपयोग करने की अनुमति है।":" I confirm that I have permission as the child's parent or legal guardian to use this video for this screening activity.";
  set("#s-video .notice","A video selection and the confirmation above are required to continue. Important: this version only previews the selected file in your browser. It does not upload, store on a server, or analyse the video.","आगे बढ़ने के लिए वीडियो चुनना और ऊपर दी गई पुष्टि करना आवश्यक है। महत्वपूर्ण: इस संस्करण में वीडियो केवल आपके ब्राउज़र में दिखाया जाता है। इसे सर्वर पर अपलोड, संग्रहीत या विश्लेषित नहीं किया जाता।");
  set("#continue-video","Continue","आगे बढ़ें");
  set("#s-load h2","Analysing responses…","आपके जवाबों का विश्लेषण किया जा रहा है…");
  set("#s-result h2","Screening result","स्क्रीनिंग परिणाम");
  const headings=document.querySelectorAll("#s-result h3");
  if(headings[0]) headings[0].textContent=hi?"उत्तर किन क्षेत्रों की ओर संकेत करते हैं":"Where the answers pointed";
  if(headings[1]) headings[1].textContent=hi?"अगले सुझाए गए कदम":"Suggested next steps";
  set("#s-result .notice","This tool is a prototype for screening support. It cannot diagnose autism. Only a qualified clinician can do that, after a full assessment.","यह उपकरण स्क्रीनिंग सहायता के लिए एक प्रोटोटाइप है। यह ऑटिज़्म का निदान नहीं कर सकता। पूर्ण मूल्यांकन के बाद केवल योग्य चिकित्सक ही निदान कर सकते हैं।");
  set("#restart","Screen another child","दूसरे बच्चे की स्क्रीनिंग करें");
  const printButton=document.querySelector('#s-result button[onclick="window.print()"]');
  if(printButton) printButton.textContent=hi?"परिणाम प्रिंट करें":"Print result";
  if(state.i<QUESTIONS.length && $("s-quiz").classList.contains("active")) renderQ();
}
const languageSelect = $("ui-language");
if (languageSelect) languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));

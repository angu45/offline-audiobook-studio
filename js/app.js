import { BrowserTTSProvider } from "./speech.js";
import { AudiobookPlayer } from "./player.js";


const $ = id => document.getElementById(id);


const editor = $("script-editor");

const voiceSelect = $("voice-select");
const languageFilter = $("language-filter");

const rateSlider = $("rate-slider");
const pitchSlider = $("pitch-slider");
const volumeSlider = $("volume-slider");

const rateValue = $("rate-value");
const pitchValue = $("pitch-value");
const volumeValue = $("volume-value");

const autoNumber = $("auto-number");
const autoAdvance = $("auto-advance");

const statusEl = $("processing-status");

const tts = new BrowserTTSProvider();


function setStatus(message) {

  if (statusEl) {
    statusEl.textContent = message;
  }
}


function getSettings() {

  return {

    voiceName:
      voiceSelect?.value || "",

    lang:
      voiceSelect?.selectedOptions?.[0]?.dataset?.lang || "",

    rate:
      Number(rateSlider?.value || 1),

    pitch:
      Number(pitchSlider?.value || 1),

    volume:
      Number(volumeSlider?.value || 1),

    autoNumber:
      autoNumber?.checked ?? true,

    autoAdvance:
      autoAdvance?.checked ?? true
  };
}


const player = new AudiobookPlayer(
  tts,
  getSettings,
  {
    currentChapter: $("current-chapter"),
    currentSentence: $("current-sentence"),
    progressBar: $("progress-bar"),
    progressText: $("player-progress"),
    playButton: $("btn-play-pause")
  }
);


// -------------------------
// Theme
// -------------------------

$("theme-toggle")?.addEventListener(
  "click",
  () => {

    document.documentElement.classList.toggle(
      "dark-theme"
    );

    const dark =
      document.documentElement.classList.contains(
        "dark-theme"
      );

    $("theme-toggle").textContent =
      dark ? "☀️" : "🌙";

    localStorage.setItem(
      "audiobook-theme",
      dark ? "dark" : "light"
    );
  }
);


if (
  localStorage.getItem("audiobook-theme") === "dark"
) {

  document.documentElement.classList.add(
    "dark-theme"
  );

  $("theme-toggle").textContent = "☀️";
}


// -------------------------
// Sliders
// -------------------------

function updateSliders() {

  rateValue.textContent =
    `${Number(rateSlider.value).toFixed(2)}x`;

  pitchValue.textContent =
    Number(pitchSlider.value).toFixed(2);

  volumeValue.textContent =
    `${Math.round(Number(volumeSlider.value) * 100)}%`;
}


rateSlider?.addEventListener(
  "input",
  updateSliders
);

pitchSlider?.addEventListener(
  "input",
  updateSliders
);

volumeSlider?.addEventListener(
  "input",
  updateSliders
);

updateSliders();


// -------------------------
// Voice loading
// -------------------------

async function loadVoices() {

  await tts.loadModel();

  populateLanguages();
  populateVoices();

  setStatus("Voices ready");
}


function populateLanguages() {

  if (!languageFilter) {
    return;
  }

  const languages =
    [...new Set(
      tts.getVoices()
        .map(v => v.lang)
        .filter(Boolean)
    )]
    .sort();

  languageFilter.innerHTML =
    `<option value="all">All Languages</option>`;

  languages.forEach(lang => {

    const option =
      document.createElement("option");

    option.value = lang;
    option.textContent = lang;

    languageFilter.appendChild(option);
  });
}


function populateVoices() {

  if (!voiceSelect) {
    return;
  }

  const filter =
    languageFilter?.value || "all";

  let voices = tts.getVoices();

  if (filter !== "all") {

    voices =
      voices.filter(
        voice => voice.lang === filter
      );
  }

  voiceSelect.innerHTML = "";

  if (!voices.length) {

    const option =
      document.createElement("option");

    option.value = "";
    option.textContent =
      "No voices available";

    voiceSelect.appendChild(option);

    return;
  }

  voices.forEach(voice => {

    const option =
      document.createElement("option");

    option.value = voice.name;

    option.dataset.lang =
      voice.lang;

    option.textContent =
      `${voice.name} — ${voice.lang}`;

    voiceSelect.appendChild(option);
  });
}


languageFilter?.addEventListener(
  "change",
  populateVoices
);


// -------------------------
// Demo
// -------------------------

$("btn-load-demo")?.addEventListener(
  "click",
  () => {

    editor.value =
`Chapter 1

The journey begins with a single step.

Every great story starts with an idea.

Chapter 2

The path is not always easy.

But every challenge teaches us something new.

Chapter 3

Success comes from patience, consistency, and action.`;

    updateStatsFromText(editor.value);

    setStatus("Demo script loaded");
  }
);


// -------------------------
// Clear
// -------------------------

$("btn-clear")?.addEventListener(
  "click",
  () => {

    editor.value = "";

    player.stop();

    player.load(null);

    updateStatsFromText("");

    $("chapter-list").innerHTML = "";

    $("queue-info").textContent =
      "No audiobook loaded.";

    setStatus("Cleared");
  }
);


// -------------------------
// File upload
// -------------------------

$("file-upload")?.addEventListener(
  "change",
  event => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      editor.value =
        String(reader.result || "");

      updateStatsFromText(
        editor.value
      );

      setStatus(
        `${file.name} loaded`
      );
    };

    reader.readAsText(file);
  }
);


// -------------------------
// Analysis
// -------------------------

function fallbackAnalyze(text) {

  const clean =
    String(text || "")
      .replace(/\r\n/g, "\n")
      .trim();

  const words =
    clean
      ? clean.split(/\s+/).length
      : 0;

  const characters =
    clean.length;

  const sentenceMatches =
    clean.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    ) || [];

  const sentences =
    sentenceMatches
      .map(s => s.trim())
      .filter(Boolean);


  const lines =
    clean
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);


  const chapterRegex =
    /^(chapter|chap\.|part|prologue|epilogue|introduction)\b/i;


  const chapters = [];

  let current = {
    title: "Chapter 1",
    sentences: []
  };


  lines.forEach(line => {

    if (chapterRegex.test(line)) {

      if (current.sentences.length) {
        chapters.push(current);
      }

      current = {
        title: line,
        sentences: []
      };

      return;
    }

    const parts =
      line.match(
        /[^.!?]+[.!?]+|[^.!?]+$/g
      ) || [];

    parts.forEach(sentence => {

      const value =
        sentence.trim();

      if (value) {
        current.sentences.push(value);
      }
    });
  });


  if (current.sentences.length) {
    chapters.push(current);
  }


  if (!chapters.length && sentences.length) {

    chapters.push({
      title: "Chapter 1",
      sentences
    });
  }


  const minutes =
    words / 150;


  return {

    words,
    characters,
    sentences: sentences.length,
    chapters,
    durationMinutes: minutes
  };
}


function updateStatsFromText(text) {

  const data =
    fallbackAnalyze(text);

  $("stat-words").textContent =
    data.words;

  $("stat-characters").textContent =
    data.characters;

  $("stat-sentences").textContent =
    data.sentences;

  $("stat-chapters").textContent =
    data.chapters.length;

  $("stat-duration").textContent =
    data.durationMinutes < 1
      ? "<1 min"
      : `${Math.ceil(data.durationMinutes)} min`;
}


async function analyze() {

  const text =
    editor.value.trim();

  if (!text) {

    setStatus(
      "Please enter a script first."
    );

    return null;
  }

  setStatus("Analyzing...");

  let data = null;


  try {

    if (
      typeof window.pyAnalyzeScript ===
      "function"
    ) {

      const result =
        await window.pyAnalyzeScript(
          text,
          autoNumber?.checked ?? true
        );

      if (typeof result === "string") {
        data = JSON.parse(result);
      } else {
        data = result;
      }
    }

  } catch (error) {

    console.warn(
      "PyScript analyzer failed:",
      error
    );
  }


  if (!data) {
    data = fallbackAnalyze(text);
  }


  $("stat-words").textContent =
    data.words || 0;

  $("stat-characters").textContent =
    data.characters || 0;

  $("stat-sentences").textContent =
    data.sentences || 0;

  $("stat-chapters").textContent =
    data.chapters?.length || 0;

  const minutes =
    Number(
      data.durationMinutes || 0
    );

  $("stat-duration").textContent =
    minutes < 1
      ? "<1 min"
      : `${Math.ceil(minutes)} min`;


  renderChapters(data.chapters || []);

  player.load(data);

  setStatus("Analysis complete");

  return data;
}


$("btn-analyze")?.addEventListener(
  "click",
  analyze
);


// -------------------------
// Chapter list
// -------------------------

function renderChapters(chapters) {

  const container =
    $("chapter-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!chapters.length) {

    container.innerHTML =
      `<div class="empty-state">
        No chapters detected.
      </div>`;

    $("queue-info").textContent =
      "No chapters detected.";

    return;
  }


  chapters.forEach(
    (chapter, index) => {

      const button =
        document.createElement("button");

      button.className =
        "chapter-item";

      button.innerHTML = `
        <span>
          ${escapeHTML(
            chapter.title ||
            `Chapter ${index + 1}`
          )}
        </span>

        <small>
          ${(chapter.sentences || []).length}
          sentences
        </small>
      `;

      button.addEventListener(
        "click",
        () => {

          player.chapterIndex = index;
          player.sentenceIndex = 0;

          player.stop();
          player.updateUI();
        }
      );

      container.appendChild(button);
    }
  );


  $("queue-info").textContent =
    `${chapters.length} chapter(s) ready`;
}


// -------------------------
// Generate / prepare
// -------------------------

$("btn-generate")?.addEventListener(
  "click",
  async () => {

    const data =
      await analyze();

    if (!data) {
      return;
    }

    setStatus(
      "Audiobook prepared. Press Play to narrate."
    );

    document
      .querySelector(".player-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
  }
);


// -------------------------
// Voice preview
// -------------------------

$("btn-preview-voice")?.addEventListener(
  "click",
  () => {

    const settings =
      getSettings();

    tts.synthesize(
      "Hello! This is a preview of your selected audiobook voice.",
      settings
    );
  }
);


// -------------------------
// Player controls
// -------------------------

$("btn-play-pause")?.addEventListener(
  "click",
  () => player.togglePlayPause()
);

$("btn-stop")?.addEventListener(
  "click",
  () => player.stop()
);

$("btn-next-sent")?.addEventListener(
  "click",
  () => player.nextSentence()
);

$("btn-prev-sent")?.addEventListener(
  "click",
  () => player.previousSentence()
);

$("btn-next-chapter")?.addEventListener(
  "click",
  () => player.nextChapter()
);

$("btn-prev-chapter")?.addEventListener(
  "click",
  () => player.previousChapter()
);


// -------------------------
// Presets
// -------------------------

document
  .querySelectorAll(".preset-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        rateSlider.value =
          button.dataset.rate || 1;

        pitchSlider.value =
          button.dataset.pitch || 1;

        updateSliders();
      }
    );
  });


// -------------------------
// Escape HTML
// -------------------------

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Initial stats
updateStatsFromText(
  editor?.value || ""
);


// Load voices
loadVoices();

window.speechSynthesis?.addEventListener(
  "voiceschanged",
  () => {
    populateLanguages();
    populateVoices();
  }
);
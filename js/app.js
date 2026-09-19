import {
  BrowserTTSProvider
} from "./speech.js";

import {
  AudiobookPlayer
} from "./player.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
  document.getElementById(id);


const editor =
  $("script-editor");


const statusElement =
  $("processing-status");


const state = {

  voices: [],

  history: []

};


/* =========================================================
   STATUS
========================================================= */

function setStatus(message) {

  if (statusElement) {

    statusElement.textContent =
      message;

  }

}


/* =========================================================
   TTS
========================================================= */

const tts =
  new BrowserTTSProvider();


/* =========================================================
   SETTINGS
========================================================= */

function getSettings() {

  return {

    voiceName:
      $("voice-select")?.value || "",

    lang:
      $("voice-select")
        ?.selectedOptions
        ?.[
          0
        ]
        ?.dataset
        ?.lang || "",

    rate:
      Number(
        $("rate-slider")?.value || 1
      ),

    pitch:
      Number(
        $("pitch-slider")?.value || 1
      ),

    volume:
      Number(
        $("volume-slider")?.value || 1
      ),

    autoNumber:
      Boolean(
        $("auto-number")?.checked
      ),

    autoAdvance:
      Boolean(
        $("auto-advance")?.checked
      ),

    pauseChapters:
      Boolean(
        $("pause-chapters")?.checked
      ),

    chapterGap:
      Number(
        $("chapter-gap")?.value || 700
      ),

    sentenceGap:
      Number(
        $("sentence-gap")?.value || 80
      )

  };

}


/* =========================================================
   PLAYER
========================================================= */

const player =
  new AudiobookPlayer(

    tts,

    getSettings,

    {

      currentChapter:
        $("current-chapter"),

      currentSentence:
        $("current-sentence"),

      progressBar:
        $("progress-bar"),

      progressText:
        $("player-progress"),

      playButton:
        $("btn-play-pause")

    },

    (
      type,
      event
    ) => {

      if (
        type === "error"
      ) {

        const errorText =
          event?.error ||
          event?.message ||
          "Unknown speech error";

        setStatus(
          "Speech error: " +
          errorText
        );

      }


      if (
        type === "finished"
      ) {

        setStatus(
          "Audiobook finished."
        );

      }


      if (
        type === "message"
      ) {

        setStatus(
          event?.message ||
          event?.message ||
          "Nothing to play."
        );

      }

    }

  );


/* =========================================================
   SLIDERS
========================================================= */

function updateSliders() {

  const rate =
    Number(
      $("rate-slider").value
    );


  const pitch =
    Number(
      $("pitch-slider").value
    );


  const volume =
    Number(
      $("volume-slider").value
    );


  $("rate-value").textContent =
    rate.toFixed(2) + "x";


  $("pitch-value").textContent =
    pitch.toFixed(2);


  $("volume-value").textContent =
    Math.round(
      volume * 100
    ) + "%";

}


[
  "rate-slider",
  "pitch-slider",
  "volume-slider"
].forEach(id => {

  $(id).addEventListener(
    "input",
    updateSliders
  );

});


updateSliders();


/* =========================================================
   VOICE FILTERING
========================================================= */

function getFilteredVoices() {

  let voices =
    [...state.voices];


  const search =
    (
      $("voice-search")
        ?.value || ""
    )
    .trim()
    .toLowerCase();


  const language =
    $("language-filter")
      ?.value || "all";


  const sort =
    $("voice-sort")
      ?.value || "name";


  /*
   * Search
   */

  if (search) {

    voices =
      voices.filter(
        voice => {

          const content =
            (
              voice.name +
              " " +
              voice.lang
            )
            .toLowerCase();

          return content.includes(
            search
          );

        }
      );

  }


  /*
   * Language
   */

  if (
    language !== "all"
  ) {

    voices =
      voices.filter(
        voice =>
          voice.lang ===
          language
      );

  }


  /*
   * Sort
   */

  voices.sort(
    (a, b) => {

      if (
        sort === "name"
      ) {

        return a.name.localeCompare(
          b.name
        );

      }


      if (
        sort === "name-desc"
      ) {

        return b.name.localeCompare(
          a.name
        );

      }


      if (
        sort === "language"
      ) {

        return (
          a.lang.localeCompare(
            b.lang
          ) ||
          a.name.localeCompare(
            b.name
          )
        );

      }


      if (
        sort === "local"
      ) {

        return (
          Number(
            b.localService
          ) -
          Number(
            a.localService
          )
        ) ||
        a.name.localeCompare(
          b.name
        );

      }


      return 0;

    }
  );


  return voices;

}


/* =========================================================
   POPULATE VOICES
========================================================= */

function populateVoices() {

  const languageSelect =
    $("language-filter");


  const previousLanguage =
    languageSelect.value;


  const languages =
    [
      ...new Set(
        state.voices
          .map(
            voice => voice.lang
          )
          .filter(Boolean)
      )
    ]
    .sort();


  languageSelect.innerHTML =
    `<option value="all">
      All Languages
    </option>`;


  languages.forEach(
    language => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        language;


      option.textContent =
        language;


      languageSelect.appendChild(
        option
      );

    }
  );


  if (
    languages.includes(
      previousLanguage
    )
  ) {

    languageSelect.value =
      previousLanguage;

  }


  const filtered =
    getFilteredVoices();


  const voiceSelect =
    $("voice-select");


  const previousVoice =
    voiceSelect.value;


  voiceSelect.innerHTML =
    "";


  if (
    filtered.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value = "";

    option.textContent =
      "No matching voices";


    voiceSelect.appendChild(
      option
    );


  }
  else {

    filtered.forEach(
      voice => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          voice.name;


        option.dataset.lang =
          voice.lang;


        option.textContent =
          `${voice.name} — ${voice.lang}` +
          (
            voice.localService
              ? " • Local"
              : ""
          );


        voiceSelect.appendChild(
          option
        );

      }
    );

  }


  if (
    filtered.some(
      voice =>
        voice.name ===
        previousVoice
    )
  ) {

    voiceSelect.value =
      previousVoice;

  }


  updateVoiceMeta();

}


/* =========================================================
   VOICE INFORMATION
========================================================= */

function updateVoiceMeta() {

  const voice =
    tts.findVoice(
      $("voice-select").value
    );


  const meta =
    $("voice-meta");


  if (!voice) {

    meta.textContent =
      "No voice selected.";

    return;

  }


  meta.textContent =
    `${voice.name} • ` +
    `${voice.lang} • ` +
    (
      voice.localService
        ? "Local device voice"
        : "Browser-managed voice"
    );

}


/* =========================================================
   LOAD VOICES
========================================================= */

async function loadVoices() {

  try {

    setStatus(
      "Loading browser voices..."
    );


    const voices =
      await tts.loadModel();


    state.voices =
      voices || [];


    populateVoices();


    if (
      state.voices.length
    ) {

      setStatus(
        `${state.voices.length} voices ready`
      );

    }
    else {

      setStatus(
        "No browser voices detected."
      );

    }

  }
  catch (error) {

    setStatus(
      error.message
    );

  }

}


/* =========================================================
   VOICE SEARCH EVENTS
========================================================= */

[
  "voice-search",
  "language-filter",
  "voice-sort"
].forEach(id => {

  $(id).addEventListener(
    "input",
    populateVoices
  );

});


$("voice-select")
  .addEventListener(
    "change",
    updateVoiceMeta
  );


/* =========================================================
   VOICE PREVIEW
========================================================= */

$("btn-preview-voice")
  .addEventListener(
    "click",
    () => {

      const voice =
        tts.findVoice(
          $("voice-select").value
        );


      if (!voice) {

        setStatus(
          "Please select a voice first."
        );

        return;

      }


      const previewText =
        "Hello. This is a preview of the selected voice. You can adjust speed, pitch and volume before starting your audiobook.";


      try {

        tts.preview(
          previewText,
          getSettings(),
          {

            onstart: () => {

              setStatus(
                "Voice preview playing..."
              );

            },

            onend: () => {

              setStatus(
                "Voice preview finished."
              );

            },

            onerror: event => {

              setStatus(
                "Preview error: " +
                (
                  event?.error ||
                  "unknown"
                )
              );

            }

          }
        );

      }
      catch (error) {

        setStatus(
          error.message
        );

      }

    }
  );


/* =========================================================
   PRESETS
========================================================= */

document
  .querySelectorAll(
    ".preset-btn"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        $("rate-slider").value =
          button.dataset.rate;


        $("pitch-slider").value =
          button.dataset.pitch;


        updateSliders();

      }
    );

  });


/* =========================================================
   FALLBACK ANALYZER
========================================================= */

function fallbackAnalyze(
  text
) {

  const clean =
    String(text || "")
      .replace(
        /\r\n/g,
        "\n"
      )
      .trim();


  const sentencePattern =
    /[^.!?]+[.!?]+|[^.!?]+$/g;


  const allSentences =
    clean.match(
      sentencePattern
    ) || [];


  const lines =
    clean
      .split("\n")
      .map(
        line =>
          line.trim()
      )
      .filter(Boolean);


  const chapterPattern =
    /^(chapter|chap\.|part|prologue|epilogue|introduction|section)\b/i;


  const chapters = [];


  let current = {

    title:
      "Chapter 1",

    sentences: []

  };


  lines.forEach(
    line => {

      if (
        chapterPattern.test(
          line
        )
      ) {

        if (
          current.sentences.length
        ) {

          chapters.push(
            current
          );

        }


        current = {

          title: line,

          sentences: []

        };

      }
      else {

        const sentences =
          line.match(
            sentencePattern
          ) || [];


        current.sentences.push(
          ...sentences.map(
            sentence =>
              sentence.trim()
          )
        );

      }

    }
  );


  if (
    current.sentences.length
  ) {

    chapters.push(
      current
    );

  }


  if (
    chapters.length === 0 &&
    allSentences.length
  ) {

    chapters.push({

      title:
        "Chapter 1",

      sentences:
        allSentences.map(
          sentence =>
            sentence.trim()
        )

    });

  }


  const words =
    clean
      ? clean.split(
          /\s+/
        ).length
      : 0;


  return {

    words,

    characters:
      clean.length,

    sentences:
      allSentences.length,

    chapters,

    durationMinutes:
      words / 150,

    narrationText:
      clean

  };

}


/* =========================================================
   ANALYZE
========================================================= */

async function analyze() {

  const text =
    editor.value.trim();


  if (!text) {

    setStatus(
      "Enter a script first."
    );

    return null;

  }


  setStatus(
    "Analyzing script..."
  );


  let data = null;


  try {

    if (
      typeof window.pyAnalyzeScript ===
      "function"
    ) {

      const result =
        await window.pyAnalyzeScript(
          text,
          $("auto-number").checked
        );


      data =
        JSON.parse(
          result
        );

    }

  }
  catch (error) {

    console.warn(
      "PyScript analyzer failed:",
      error
    );

  }


  if (!data) {

    data =
      fallbackAnalyze(
        text
      );

  }


  /*
   * Statistics
   */

  $("stat-words")
    .textContent =
    data.words || 0;


  $("stat-characters")
    .textContent =
    data.characters || 0;


  $("stat-sentences")
    .textContent =
    data.sentences || 0;


  $("stat-chapters")
    .textContent =
    data.chapters?.length || 0;


  $("stat-duration")
    .textContent =
    data.durationMinutes < 1
      ? "<1 min"
      : Math.ceil(
          data.durationMinutes
        ) + " min";


  player.load(
    data
  );


  renderChapters(
    data.chapters || []
  );


  saveDraft();


  setStatus(
    "Analysis complete."
  );


  return data;

}


/* =========================================================
   CHAPTER LIST
========================================================= */

function renderChapters(
  chapters
) {

  const container =
    $("chapter-list");


  container.innerHTML =
    "";


  const totalSentences =
    chapters.reduce(
      (
        total,
        chapter
      ) =>
        total +
        (
          chapter.sentences
            ?.length || 0
        ),
      0
    );


  $("queue-info")
    .textContent =
    chapters.length
      ? `${chapters.length} chapters • ${totalSentences} sentences`
      : "No chapters detected.";


  chapters.forEach(
    (
      chapter,
      index
    ) => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "chapter-item";


      button.innerHTML =
        `
        <span>
          ${escapeHTML(
            chapter.title ||
            `Chapter ${index + 1}`
          )}
        </span>

        <small>
          ${
            chapter.sentences?.length ||
            0
          } sentences
        </small>
        `;


      button.addEventListener(
        "click",
        () => {

          player.tts.stop();

          player.chapterIndex =
            index;

          player.sentenceIndex =
            0;

          player.state =
            "stopped";

          player.render();

        }
      );


      container.appendChild(
        button
      );

    }
  );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(
  value
) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character => {

        const map = {

          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#39;"

        };


        return map[
          character
        ];

      }
    );

}


/* =========================================================
   DEMO
========================================================= */

$("btn-load-demo")
  .addEventListener(
    "click",
    async () => {

      editor.value =
`Chapter 1
The Last Signal

It was 11:45 PM when Alex received a strange message.

"Do not look behind you."

Alex stared at the screen for a few seconds. His room was completely silent.

Outside the window, the city lights were slowly disappearing one by one.

Chapter 2
The Countdown

Alex opened his laptop and checked the security cameras.

Everything looked normal.

The front door was locked. The windows were closed.

Then he heard three knocks on the door.

"Who is there?" Alex asked.

There was no answer.

Chapter 3
The Truth

The sender was using his own phone number.

Alex whispered, "That is impossible."

The laptop screen turned on by itself.

A video started playing.

The video showed his room.

But the recording was from tomorrow.

Chapter 4
The Decision

Alex looked at the screen.

He had exactly six minutes left.

He picked up his jacket.

For the first time that night, he opened the door.

Chapter 5
The Final Signal

The hallway was completely empty.

Alex stepped outside.

His phone received one final message.

"Good choice."

Then the lights suddenly turned on.

Someone was standing behind the window.

It looked exactly like him.`;


      await analyze();

    }
  );


/* =========================================================
   CLEAR
========================================================= */

$("btn-clear")
  .addEventListener(
    "click",
    () => {

      player.stop();


      editor.value =
        "";


      player.load(
        null
      );


      $("chapter-list")
        .innerHTML =
        "";


      $("queue-info")
        .textContent =
        "No audiobook loaded.";


      [
        "stat-words",
        "stat-characters",
        "stat-sentences",
        "stat-chapters"
      ]
      .forEach(
        id => {

          $(id)
            .textContent =
            "0";

        }
      );


      $("stat-duration")
        .textContent =
        "0 min";


      setStatus(
        "Cleared."
      );


      saveDraft();

    }
  );


/* =========================================================
   FILE UPLOAD
========================================================= */

$("file-upload")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target
          .files?.[0];


      if (!file) {

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        async () => {

          editor.value =
            reader.result;


          await analyze();


          setStatus(
            `${file.name} loaded.`
          );

        };


      reader.onerror =
        () => {

          setStatus(
            "Could not read file."
          );

        };


      reader.readAsText(
        file
      );

    }
  );


/* =========================================================
   PROJECT DATA
========================================================= */

function getProjectData() {

  return {

    version: 3,

    savedAt:
      new Date().toISOString(),

    script:
      editor.value,

    metadata: {

      title:
        $("book-title").value,

      author:
        $("book-author").value,

      language:
        $("book-language").value,

      description:
        $("book-description").value

    },

    settings:
      getSettings()

  };

}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadBlob(
  filename,
  blob
) {

  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;


  anchor.download =
    filename;


  document.body.appendChild(
    anchor
  );


  anchor.click();


  anchor.remove();


  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );

}


/* =========================================================
   LOCAL DRAFT
========================================================= */

function saveDraft() {

  try {

    localStorage.setItem(
      "audiobook-draft",
      JSON.stringify(
        getProjectData()
      )
    );

  }
  catch (error) {

    console.warn(
      "Draft save failed:",
      error
    );

  }

}


/* =========================================================
   SAVE PROJECT
========================================================= */

$("btn-save-project")
  .addEventListener(
    "click",
    () => {

      saveDraft();

      addHistory();

      setStatus(
        "Project saved locally."
      );

    }
  );


/* =========================================================
   EXPORT PROJECT
========================================================= */

$("btn-export-project")
  .addEventListener(
    "click",
    () => {

      const project =
        getProjectData();


      const title =
        (
          $("book-title").value ||
          "audiobook-project"
        )
        .replace(
          /[^\w-]+/g,
          "_"
        );


      const blob =
        new Blob(
          [
            JSON.stringify(
              project,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );


      downloadBlob(
        `${title}.json`,
        blob
      );


      setStatus(
        "Project exported."
      );

    }
  );


/* =========================================================
   IMPORT PROJECT
========================================================= */

$("project-upload")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target
          .files?.[0];


      if (!file) {

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        async () => {

          try {

            const project =
              JSON.parse(
                reader.result
              );


            editor.value =
              project.script || "";


            const metadata =
              project.metadata || {};


            $("book-title").value =
              metadata.title || "";


            $("book-author").value =
              metadata.author || "";


            $("book-language").value =
              metadata.language || "";


            $("book-description").value =
              metadata.description || "";


            await analyze();


            setStatus(
              "Project imported successfully."
            );

          }
          catch (error) {

            console.error(
              error
            );


            setStatus(
              "Invalid project file."
            );

          }

        };


      reader.readAsText(
        file
      );

    }
  );


/* =========================================================
   HISTORY
========================================================= */

function addHistory() {

  try {

    const history =
      JSON.parse(
        localStorage.getItem(
          "audiobook-history"
        ) || "[]"
      );


    const project =
      getProjectData();


    history.unshift({

      id:
        Date.now(),

      title:
        project.metadata.title ||
        "Untitled Project",

      words:
        $("stat-words").textContent,

      date:
        new Date().toLocaleString(),

      project

    });


    localStorage.setItem(
      "audiobook-history",
      JSON.stringify(
        history.slice(
          0,
          30
        )
      )
    );


    renderHistory();

  }
  catch (error) {

    console.warn(
      "History save failed:",
      error
    );

  }

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {

  const container =
    $("history-list");


  let history = [];


  try {

    history =
      JSON.parse(
        localStorage.getItem(
          "audiobook-history"
        ) || "[]"
      );

  }
  catch {

    history = [];

  }


  container.innerHTML =
    "";


  if (
    history.length === 0
  ) {

    container.innerHTML =
      `
      <div class="empty-state">
        No saved projects yet.
      </div>
      `;


    return;

  }


  history.forEach(
    item => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "history-item";


      row.innerHTML =
        `
        <div>

          <strong>
            ${escapeHTML(
              item.title
            )}
          </strong>

          <small>
            ${item.words} words
            •
            ${escapeHTML(
              item.date
            )}
          </small>

        </div>

        <button
          class="btn secondary"
          type="button">
          Open
        </button>
        `;


      row
        .querySelector(
          "button"
        )
        .addEventListener(
          "click",
          async () => {

            const project =
              item.project;


            editor.value =
              project.script || "";


            const metadata =
              project.metadata || {};


            $("book-title").value =
              metadata.title || "";


            $("book-author").value =
              metadata.author || "";


            $("book-language").value =
              metadata.language || "";


            $("book-description").value =
              metadata.description || "";


            await analyze();


            setStatus(
              "History project opened."
            );

          }
        );


      container.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   HISTORY BUTTON
========================================================= */

$("btn-history")
  .addEventListener(
    "click",
    () => {

      const panel =
        $("history-panel");


      panel.classList.toggle(
        "hidden"
      );


      renderHistory();


      if (
        !panel.classList.contains(
          "hidden"
        )
      ) {

        panel.scrollIntoView({
          behavior: "smooth"
        });

      }

    }
  );


/* =========================================================
   CLEAR HISTORY
========================================================= */

$("btn-clear-history")
  .addEventListener(
    "click",
    () => {

      const confirmed =
        confirm(
          "Delete all local audiobook history?"
        );


      if (!confirmed) {

        return;

      }


      localStorage.removeItem(
        "audiobook-history"
      );


      renderHistory();


      setStatus(
        "History cleared."
      );

    }
  );


/* =========================================================
   PREPARE NARRATION
========================================================= */

$("btn-prepare")
  .addEventListener(
    "click",
    async () => {

      const result =
        await analyze();


      if (result) {

        setStatus(
          "Narration prepared. Press Play."
        );

      }

    }
  );


/* =========================================================
   EXPORT AUDIO
========================================================= */

$("btn-export-audio")
  .addEventListener(
    "click",
    () => {

      const message =
        "True MP3/WAV export is not available from standard browser SpeechSynthesis. No fake audio file was created.";


      $("export-status")
        .textContent =
        message;


      setStatus(
        message
      );

    }
  );


/* =========================================================
   THEME
========================================================= */

$("theme-toggle")
  .addEventListener(
    "click",
    () => {

      document.documentElement
        .classList.toggle(
          "dark-theme"
        );


      const dark =
        document.documentElement
          .classList
          .contains(
            "dark-theme"
          );


      localStorage.setItem(
        "audiobook-theme",
        dark
          ? "dark"
          : "light"
      );


      $("theme-toggle")
        .textContent =
        dark
          ? "☀️"
          : "🌙";

    }
  );


/* =========================================================
   RESTORE THEME
========================================================= */

if (
  localStorage.getItem(
    "audiobook-theme"
  ) === "dark"
) {

  document.documentElement
    .classList.add(
      "dark-theme"
    );


  $("theme-toggle")
    .textContent =
    "☀️";

}


/* =========================================================
   RESTORE DRAFT
========================================================= */

try {

  const draft =
    localStorage.getItem(
      "audiobook-draft"
    );


  if (draft) {

    const project =
      JSON.parse(
        draft
      );


    editor.value =
      project.script || "";


    const metadata =
      project.metadata || {};


    $("book-title").value =
      metadata.title || "";


    $("book-author").value =
      metadata.author || "";


    $("book-language").value =
      metadata.language || "";


    $("book-description").value =
      metadata.description || "";

  }

}
catch (error) {

  console.warn(
    "Draft restoration failed:",
    error
  );

}


/* =========================================================
   PLAYER BUTTONS
========================================================= */

$("btn-play-pause")
  .addEventListener(
    "click",
    () => {

      player.toggle();

    }
  );


$("btn-stop")
  .addEventListener(
    "click",
    () => {

      player.stop();

    }
  );


$("btn-prev-sent")
  .addEventListener(
    "click",
    () => {

      player.previousSentence();

    }
  );


$("btn-next-sent")
  .addEventListener(
    "click",
    () => {

      player.nextSentence();

    }
  );


$("btn-prev-chapter")
  .addEventListener(
    "click",
    () => {

      player.previousChapter();

    }
  );


$("btn-next-chapter")
  .addEventListener(
    "click",
    () => {

      player.nextChapter();

    }
  );


/* =========================================================
   INITIALIZE
========================================================= */

renderHistory();

loadVoices();
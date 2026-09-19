/*
 * Offline Audiobook Studio
 * Browser Speech Engine
 *
 * IMPORTANT:
 * Browser SpeechSynthesis can PLAY speech,
 * but does not reliably expose generated audio
 * as MP3/WAV data.
 */

export class LocalTTSProvider {

  constructor() {

    this.name = "Local TTS Model";

  }

  isAvailable() {

    return false;

  }

  async loadModel() {

    throw new Error(
      "No local downloadable TTS model is bundled yet."
    );

  }

}


export class BrowserTTSProvider {

  constructor() {

    this.synth = null;

    this.voices = [];

    this.ready = false;

    this.loadPromise = null;

    this.previewUtterance = null;

    this.initialize();

  }


  initialize() {

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {

      this.synth = window.speechSynthesis;

    }

  }


  isAvailable() {

    return Boolean(this.synth);

  }


  async loadModel() {

    if (!this.isAvailable()) {

      throw new Error(
        "Speech synthesis is not supported in this browser."
      );

    }


    if (this.voices.length > 0) {

      this.ready = true;

      return this.voices;

    }


    if (this.loadPromise) {

      return this.loadPromise;

    }


    this.loadPromise = new Promise(resolve => {

      let resolved = false;


      const readVoices = () => {

        const available =
          this.synth.getVoices() || [];


        if (available.length > 0) {

          this.voices = available;

          this.ready = true;

          if (!resolved) {

            resolved = true;

            resolve(this.voices);

          }

        }

      };


      readVoices();


      this.synth.addEventListener(
        "voiceschanged",
        readVoices
      );


      setTimeout(() => {

        this.voices =
          this.synth.getVoices() || [];

        this.ready =
          this.voices.length > 0;

        if (!resolved) {

          resolved = true;

          resolve(this.voices);

        }

      }, 1800);

    });


    return this.loadPromise;

  }


  refreshVoices() {

    if (!this.isAvailable()) {

      this.voices = [];

      return [];

    }


    this.voices =
      this.synth.getVoices() || [];


    this.ready =
      this.voices.length > 0;


    return this.voices;

  }


  getVoices() {

    return [...this.voices];

  }


  findVoice(name) {

    if (!name) {

      return null;

    }


    return (
      this.voices.find(
        voice => voice.name === name
      ) || null
    );

  }


  createUtterance(
    text,
    settings = {},
    callbacks = {}
  ) {

    if (!this.isAvailable()) {

      throw new Error(
        "Speech synthesis is not supported in this browser."
      );

    }


    const utterance =
      new SpeechSynthesisUtterance(
        String(text || "")
      );


    const voice =
      this.findVoice(
        settings.voiceName
      );


    if (voice) {

      utterance.voice = voice;

      utterance.lang = voice.lang;

    }
    else if (settings.lang) {

      utterance.lang = settings.lang;

    }


    utterance.rate =
      this.clamp(
        Number(settings.rate),
        0.5,
        2,
        1
      );


    utterance.pitch =
      this.clamp(
        Number(settings.pitch),
        0,
        2,
        1
      );


    utterance.volume =
      this.clamp(
        Number(settings.volume),
        0,
        1,
        1
      );


    utterance.onstart = () => {

      callbacks.onstart?.();

    };


    utterance.onend = event => {

      callbacks.onend?.(event);

    };


    utterance.onerror = event => {

      callbacks.onerror?.(event);

    };


    utterance.onpause = event => {

      callbacks.onpause?.(event);

    };


    utterance.onresume = event => {

      callbacks.onresume?.(event);

    };


    return utterance;

  }


  speak(
    text,
    settings = {},
    callbacks = {}
  ) {

    if (!this.isAvailable()) {

      throw new Error(
        "Speech synthesis is not supported in this browser."
      );

    }


    if (!String(text || "").trim()) {

      return null;

    }


    /*
     * Cancel any currently playing browser speech.
     */

    this.synth.cancel();


    const utterance =
      this.createUtterance(
        text,
        settings,
        callbacks
      );


    this.synth.speak(utterance);


    return utterance;

  }


  preview(
    text,
    settings = {},
    callbacks = {}
  ) {

    this.stop();


    this.previewUtterance =
      this.createUtterance(
        text,
        settings,
        callbacks
      );


    this.synth.speak(
      this.previewUtterance
    );


    return this.previewUtterance;

  }


  stop() {

    if (!this.synth) {

      return;

    }


    this.synth.cancel();

    this.previewUtterance = null;

  }


  pause() {

    if (
      this.synth &&
      this.synth.speaking &&
      !this.synth.paused
    ) {

      this.synth.pause();

    }

  }


  resume() {

    if (
      this.synth &&
      this.synth.paused
    ) {

      this.synth.resume();

    }

  }


  get speaking() {

    return Boolean(
      this.synth?.speaking
    );

  }


  get paused() {

    return Boolean(
      this.synth?.paused
    );

  }


  clamp(
    value,
    min,
    max,
    fallback
  ) {

    if (!Number.isFinite(value)) {

      return fallback;

    }


    return Math.min(
      max,
      Math.max(min, value)
    );

  }

}
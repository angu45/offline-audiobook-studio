// Local browser speech engine.
// No external TTS API is used.

export class LocalTTSProvider {
  async loadModel() {
    return true;
  }

  async synthesize() {
    throw new Error("Local model provider is not configured.");
  }

  stop() {}
  pause() {}
  resume() {}
}


export class BrowserTTSProvider {

  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];

    this.loadVoices();
  }


  loadVoices() {

    const update = () => {
      this.voices = this.synth.getVoices() || [];
    };

    update();

    if ("onvoiceschanged" in this.synth) {
      this.synth.addEventListener("voiceschanged", update);
    }
  }


  async loadModel() {

    return new Promise(resolve => {

      const voices = this.synth.getVoices();

      if (voices.length > 0) {
        this.voices = voices;
        resolve(true);
        return;
      }

      const handler = () => {
        this.voices = this.synth.getVoices() || [];

        this.synth.removeEventListener(
          "voiceschanged",
          handler
        );

        resolve(true);
      };

      this.synth.addEventListener(
        "voiceschanged",
        handler
      );

      setTimeout(() => {
        this.voices = this.synth.getVoices() || [];
        resolve(true);
      }, 1500);

    });
  }


  getVoices() {
    return this.voices || [];
  }


  synthesize(text, settings = {}, callbacks = {}) {

    if (!text || !text.trim()) {
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = Number(settings.rate ?? 1);
    utterance.pitch = Number(settings.pitch ?? 1);
    utterance.volume = Number(settings.volume ?? 1);

    if (settings.voiceName) {

      const voice = this.getVoices().find(
        v => v.name === settings.voiceName
      );

      if (voice) {
        utterance.voice = voice;
      }
    }

    if (settings.lang) {
      utterance.lang = settings.lang;
    }

    utterance.onstart = () => {
      callbacks.onStart?.();
    };

    utterance.onend = () => {
      callbacks.onEnd?.();
    };

    utterance.onerror = event => {
      callbacks.onError?.(event);
    };

    this.synth.speak(utterance);

    return utterance;
  }


  stop() {

    if (this.synth) {
      this.synth.cancel();
    }
  }


  pause() {

    if (this.synth?.speaking) {
      this.synth.pause();
    }
  }


  resume() {

    if (this.synth?.paused) {
      this.synth.resume();
    }
  }


  get speaking() {
    return this.synth?.speaking || false;
  }


  get paused() {
    return this.synth?.paused || false;
  }
}
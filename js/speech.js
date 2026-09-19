// LocalTTSProvider Interface ensures architecture supports future local models
export class LocalTTSProvider {
    async loadModel() { throw new Error("Not implemented"); }
    getVoices() { throw new Error("Not implemented"); }
    synthesize(text, settings) { throw new Error("Not implemented"); }
    stop() { throw new Error("Not implemented"); }
    pause() { throw new Error("Not implemented"); }
    resume() { throw new Error("Not implemented"); }
}

export class BrowserTTSProvider extends LocalTTSProvider {
    constructor() {
        super();
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
    }

    async loadModel() {
        return new Promise((resolve) => {
            let voices = this.synth.getVoices();
            if (voices.length > 0) {
                this.voices = voices;
                resolve();
            } else {
                this.synth.onvoiceschanged = () => {
                    this.voices = this.synth.getVoices();
                    resolve();
                };
            }
        });
    }

    getVoices() {
        return this.voices;
    }

    synthesize(text, settings, onEndCallback, onErrorCallback) {
        this.stop();
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        if (settings.voice) {
            const selectedVoice = this.voices.find(v => v.name === settings.voice);
            if (selectedVoice) this.currentUtterance.voice = selectedVoice;
        }
        
        this.currentUtterance.rate = settings.rate || 1;
        this.currentUtterance.pitch = settings.pitch || 1;
        this.currentUtterance.volume = settings.volume || 1;

        this.currentUtterance.onend = onEndCallback;
        this.currentUtterance.onerror = onErrorCallback;

        this.synth.speak(this.currentUtterance);
    }

    stop() {
        this.synth.cancel();
    }

    pause() {
        this.synth.pause();
    }

    resume() {
        this.synth.resume();
    }
}


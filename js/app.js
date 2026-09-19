import { BrowserTTSProvider } from './speech.js';
import { AudiobookPlayer } from './player.js';

class App {
    constructor() {
        this.tts = new BrowserTTSProvider();
        this.player = new AudiobookPlayer(this.tts);
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.tts.loadModel();
        this.populateVoices();
    }

    bindEvents() {
        // Theme
        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });

        // Sliders
        const updateSliderVal = (id, valId) => {
            document.getElementById(id).addEventListener('input', (e) => {
                document.getElementById(valId).innerText = e.target.value;
            });
        };
        updateSliderVal('rate-slider', 'rate-val');
        updateSliderVal('pitch-slider', 'pitch-val');
        updateSliderVal('volume-slider', 'volume-val');

        // Presets
        document.getElementById('preset-select').addEventListener('change', (e) => {
            const r = document.getElementById('rate-slider');
            const p = document.getElementById('pitch-slider');
            if (e.target.value === 'fast') { r.value = 1.25; p.value = 1.0; }
            if (e.target.value === 'slow') { r.value = 0.85; p.value = 0.9; }
            if (e.target.value === 'natural') { r.value = 1.0; p.value = 1.0; }
            r.dispatchEvent(new Event('input'));
            p.dispatchEvent(new Event('input'));
        });

        // Player Controls
        const btnPlay = document.getElementById('btn-play-pause');
        btnPlay.addEventListener('click', () => {
            if (this.player.isPlaying) {
                this.player.pause();
                btnPlay.innerText = "▶";
            } else {
                this.player.play();
                btnPlay.innerText = "⏸";
            }
        });

        document.getElementById('btn-stop').addEventListener('click', () => {
            this.player.stop();
            btnPlay.innerText = "▶";
        });
        
        document.getElementById('btn-next-sent').addEventListener('click', () => this.player.nextSentence());
        document.getElementById('btn-prev-sent').addEventListener('click', () => this.player.prevSentence());
        document.getElementById('btn-next-chap').addEventListener('click', () => this.player.nextChapter());
        document.getElementById('btn-prev-chap').addEventListener('click', () => this.player.prevChapter());

        // Voice Preview
        document.getElementById('btn-preview-voice').addEventListener('click', () => {
            this.tts.synthesize("This is a preview of the selected offline browser voice.", this.player.getSettings());
        });

        // Demo Script
        document.getElementById('btn-demo').addEventListener('click', () => {
            document.getElementById('script-editor').value = "Chapter 1: The Beginning\n\nWelcome to the Offline Audiobook Studio. This application runs entirely in your browser using local resources. There are no external APIs, and your data remains entirely private. \n\nLet's test smart chunking. 100% of this runs locally. It costs $0 to run.";
        });
        
        document.getElementById('btn-clear').addEventListener('click', () => {
            document.getElementById('script-editor').value = "";
        });

        // File handling
        document.getElementById('file-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { document.getElementById('script-editor').value = ev.target.result; };
            reader.readAsText(file);
        });
    }

    populateVoices() {
        const select = document.getElementById('voice-select');
        select.innerHTML = '';
        const voices = this.tts.getVoices();
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.innerText = `${v.name} (${v.lang})`;
            select.appendChild(opt);
        });
    }

    // Exposed for PyScript to call
    loadBookData(data) {
        this.player.loadBook(data);
    }
}

// Instantiate and expose to window for PyScript bridging
window.app = new App();


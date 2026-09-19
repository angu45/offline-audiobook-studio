export class AudiobookPlayer {
    constructor(ttsProvider) {
        this.tts = ttsProvider;
        this.bookData = null;
        this.chapIndex = 0;
        this.chunkIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        
        // UI Elements bind
        this.uiCurrentChap = document.getElementById("current-chapter");
        this.uiCurrentSent = document.getElementById("current-sentence");
        this.uiProgressBar = document.getElementById("progress-bar");
    }

    loadBook(data) {
        this.bookData = data;
        this.chapIndex = 0;
        this.chunkIndex = 0;
        this.updateUI();
    }

    getSettings() {
        return {
            voice: document.getElementById("voice-select").value,
            rate: parseFloat(document.getElementById("rate-slider").value),
            pitch: parseFloat(document.getElementById("pitch-slider").value),
            volume: parseFloat(document.getElementById("volume-slider").value)
        };
    }

    play() {
        if (!this.bookData || this.bookData.length === 0) return;
        
        if (this.isPaused) {
            this.tts.resume();
            this.isPaused = false;
            this.isPlaying = true;
            return;
        }

        const chapter = this.bookData[this.chapIndex];
        const chunk = chapter.chunks[this.chunkIndex];
        
        if (!chunk) {
            this.nextChapter();
            return;
        }

        this.isPlaying = true;
        this.updateUI();

        this.tts.synthesize(
            chunk.text, 
            this.getSettings(),
            () => this.onChunkEnd(),
            (e) => console.error("TTS Error:", e)
        );
    }

    pause() {
        this.tts.pause();
        this.isPaused = true;
        this.isPlaying = false;
    }

    stop() {
        this.tts.stop();
        this.isPlaying = false;
        this.isPaused = false;
        this.chunkIndex = 0;
        this.updateUI();
    }

    onChunkEnd() {
        if (!this.isPlaying) return;
        const autoAdvance = document.getElementById("auto-advance").checked;
        if (!autoAdvance) {
            this.isPlaying = false;
            return;
        }
        this.nextSentence();
    }

    nextSentence() {
        const chapter = this.bookData[this.chapIndex];
        if (this.chunkIndex < chapter.chunks.length - 1) {
            this.chunkIndex++;
            this.play();
        } else {
            this.nextChapter();
        }
    }

    prevSentence() {
        if (this.chunkIndex > 0) {
            this.chunkIndex--;
            this.play();
        } else if (this.chapIndex > 0) {
            this.chapIndex--;
            this.chunkIndex = this.bookData[this.chapIndex].chunks.length - 1;
            this.play();
        }
    }

    nextChapter() {
        if (this.chapIndex < this.bookData.length - 1) {
            this.chapIndex++;
            this.chunkIndex = 0;
            this.play();
        } else {
            this.stop();
            this.uiCurrentSent.innerText = "Audiobook Completed.";
        }
    }

    prevChapter() {
        if (this.chapIndex > 0) {
            this.chapIndex--;
            this.chunkIndex = 0;
            this.play();
        }
    }

    updateUI() {
        if(!this.bookData) return;
        const chapter = this.bookData[this.chapIndex];
        const chunk = chapter.chunks[this.chunkIndex];
        this.uiCurrentChap.innerText = chapter.title;
        this.uiCurrentSent.innerText = chunk ? chunk.text : "End of chapter";
        
        // Calculate total progress
        let totalChunks = 0;
        let passedChunks = 0;
        
        this.bookData.forEach((ch, idx) => {
            totalChunks += ch.chunks.length;
            if (idx < this.chapIndex) {
                passedChunks += ch.chunks.length;
            } else if (idx === this.chapIndex) {
                passedChunks += this.chunkIndex;
            }
        });
        
        const pct = (passedChunks / totalChunks) * 100;
        this.uiProgressBar.style.width = `${pct}%`;
    }
}


export class AudiobookPlayer {

  constructor(ttsProvider, settingsGetter, ui = {}) {

    this.tts = ttsProvider;
    this.getSettings = settingsGetter;

    this.ui = ui;

    this.bookData = null;

    this.chapterIndex = 0;
    this.sentenceIndex = 0;

    this.playing = false;
    this.paused = false;
  }


  load(bookData) {

    this.bookData = bookData;

    this.chapterIndex = 0;
    this.sentenceIndex = 0;

    this.playing = false;
    this.paused = false;

    this.updateUI();
  }


  get currentChapter() {

    if (!this.bookData?.chapters?.length) {
      return null;
    }

    return this.bookData.chapters[this.chapterIndex];
  }


  get currentSentence() {

    const chapter = this.currentChapter;

    if (!chapter?.sentences?.length) {
      return "";
    }

    return chapter.sentences[this.sentenceIndex] || "";
  }


  play() {

    if (!this.bookData) {
      return;
    }

    if (this.tts.paused) {
      this.tts.resume();
      this.playing = true;
      this.paused = false;
      this.updateUI();
      return;
    }

    this.speakCurrent();
  }


  speakCurrent() {

    const sentence = this.currentSentence;

    if (!sentence) {
      this.nextSentence();
      return;
    }

    this.playing = true;
    this.paused = false;

    this.updateUI();

    const settings = this.getSettings();

    this.tts.synthesize(
      sentence,
      settings,
      {
        onStart: () => {
          this.playing = true;
          this.updateUI();
        },

        onEnd: () => {

          if (!this.playing) {
            return;
          }

          if (settings.autoAdvance) {
            this.nextSentence();
          } else {
            this.playing = false;
            this.updateUI();
          }
        },

        onError: () => {
          this.playing = false;
          this.updateUI();
        }
      }
    );
  }


  togglePlayPause() {

    if (this.tts.paused) {

      this.tts.resume();

      this.playing = true;
      this.paused = false;

      this.updateUI();

      return;
    }

    if (this.playing) {

      this.tts.pause();

      this.playing = false;
      this.paused = true;

      this.updateUI();

      return;
    }

    this.play();
  }


  stop() {

    this.tts.stop();

    this.playing = false;
    this.paused = false;

    this.updateUI();
  }


  nextSentence() {

    const chapter = this.currentChapter;

    if (!chapter) {
      return;
    }

    if (
      this.sentenceIndex <
      chapter.sentences.length - 1
    ) {

      this.sentenceIndex++;

    } else {

      this.nextChapter();

      return;
    }

    this.updateUI();

    if (this.playing) {
      this.speakCurrent();
    }
  }


  previousSentence() {

    if (this.sentenceIndex > 0) {

      this.sentenceIndex--;

    } else if (this.chapterIndex > 0) {

      this.chapterIndex--;

      const chapter = this.currentChapter;

      this.sentenceIndex =
        Math.max(0, chapter.sentences.length - 1);
    }

    this.updateUI();
  }


  nextChapter() {

    if (
      this.bookData &&
      this.chapterIndex <
      this.bookData.chapters.length - 1
    ) {

      this.chapterIndex++;
      this.sentenceIndex = 0;

      this.updateUI();

      if (this.playing) {
        this.speakCurrent();
      }

    } else {

      this.stop();
    }
  }


  previousChapter() {

    if (this.chapterIndex > 0) {

      this.chapterIndex--;
      this.sentenceIndex = 0;

      this.updateUI();
    }
  }


  updateUI() {

    const chapter = this.currentChapter;

    const sentence = this.currentSentence;

    if (this.ui.currentChapter) {
      this.ui.currentChapter.textContent =
        chapter?.title || "Ready to play";
    }

    if (this.ui.currentSentence) {
      this.ui.currentSentence.textContent =
        sentence || "No sentence selected";
    }

    if (this.ui.playButton) {

      this.ui.playButton.textContent =
        this.playing ? "⏸" : "▶";
    }

    if (!this.bookData) {

      if (this.ui.progressBar) {
        this.ui.progressBar.style.width = "0%";
      }

      if (this.ui.progressText) {
        this.ui.progressText.textContent = "0%";
      }

      return;
    }

    const totalChapters =
      this.bookData.chapters.length;

    const completed =
      this.chapterIndex +
      (
        this.currentChapter
          ? this.sentenceIndex /
            Math.max(1, this.currentChapter.sentences.length)
          : 0
      );

    const progress =
      totalChapters > 0
        ? Math.min(
            100,
            Math.round((completed / totalChapters) * 100)
          )
        : 0;

    if (this.ui.progressBar) {
      this.ui.progressBar.style.width =
        `${progress}%`;
    }

    if (this.ui.progressText) {
      this.ui.progressText.textContent =
        `${progress}%`;
    }
  }
}
/*
 * Audiobook Player
 *
 * Handles:
 * - Play
 * - Pause
 * - Resume
 * - Stop
 * - Sentence navigation
 * - Chapter navigation
 * - Auto advance
 * - Chapter pauses
 * - Accurate sentence-based progress
 */

export class AudiobookPlayer {

  constructor(
    tts,
    getSettings,
    ui,
    onStateChange = () => {}
  ) {

    this.tts = tts;

    this.getSettings =
      getSettings;

    this.ui = ui;

    this.onStateChange =
      onStateChange;


    this.bookData = null;

    this.chapterIndex = 0;

    this.sentenceIndex = 0;

    this.state = "stopped";

    this.timer = null;

    this.generation = 0;

  }


  load(data) {

    this.stop();

    this.bookData = data || null;

    this.chapterIndex = 0;

    this.sentenceIndex = 0;

    this.render();

  }


  get chapter() {

    return (
      this.bookData
        ?.chapters
        ?.[
          this.chapterIndex
        ] || null
    );

  }


  get sentence() {

    return (
      this.chapter
        ?.sentences
        ?.[
          this.sentenceIndex
        ] || ""
    );

  }


  totalSentences() {

    if (!this.bookData) {

      return 0;

    }


    return this.bookData.chapters
      .reduce(
        (total, chapter) =>
          total +
          (
            chapter.sentences?.length ||
            0
          ),
        0
      );

  }


  completedSentences() {

    if (!this.bookData) {

      return 0;

    }


    let completed = 0;


    for (
      let i = 0;
      i < this.chapterIndex;
      i++
    ) {

      completed +=
        this.bookData
          .chapters[i]
          .sentences?.length || 0;

    }


    completed +=
      this.sentenceIndex;


    return completed;

  }


  play() {

    if (
      !this.bookData ||
      !this.sentence
    ) {

      this.onStateChange(
        "message",
        new Error(
          "Analyze a script before playing."
        )
      );

      return;

    }


    if (this.tts.paused) {

      this.tts.resume();

      this.state = "playing";

      this.render();

      return;

    }


    this.state = "playing";

    this.speakCurrent();

  }


  speakCurrent() {

    if (
      this.state !== "playing" ||
      !this.sentence
    ) {

      return;

    }


    clearTimeout(this.timer);


    const currentGeneration =
      ++this.generation;


    const settings =
      this.getSettings();


    try {

      this.tts.speak(
        this.sentence,
        settings,
        {

          onstart: () => {

            if (
              currentGeneration !==
              this.generation
            ) {

              return;

            }


            this.render();

            this.onStateChange(
              "playing"
            );

          },


          onend: () => {

            if (
              currentGeneration !==
              this.generation
            ) {

              return;

            }


            this.afterSentence();

          },


          onerror: event => {

            if (
              currentGeneration !==
              this.generation
            ) {

              return;

            }


            this.state = "stopped";

            this.render();


            this.onStateChange(
              "error",
              event
            );

          }

        }
      );

    }
    catch (error) {

      this.state = "stopped";

      this.render();


      this.onStateChange(
        "error",
        error
      );

    }

  }


  afterSentence() {

    if (
      this.state !== "playing"
    ) {

      return;

    }


    const settings =
      this.getSettings();


    if (!settings.autoAdvance) {

      this.state = "paused";

      this.render();

      return;

    }


    const currentChapter =
      this.chapter;


    const isLastSentence =
      this.sentenceIndex >=
      (
        currentChapter
          ?.sentences
          ?.length || 1
      ) - 1;


    const isLastChapter =
      this.chapterIndex >=
      (
        this.bookData
          ?.chapters
          ?.length || 1
      ) - 1;


    /*
     * Finished entire audiobook.
     */

    if (
      isLastSentence &&
      isLastChapter
    ) {

      this.state = "stopped";

      this.render();

      this.onStateChange(
        "finished"
      );

      return;

    }


    /*
     * Move to next chapter.
     */

    if (isLastSentence) {

      this.chapterIndex++;

      this.sentenceIndex = 0;


      const gap =
        settings.pauseChapters
          ? settings.chapterGap
          : settings.sentenceGap;


      this.render();


      this.timer =
        setTimeout(
          () => this.speakCurrent(),
          Math.max(
            0,
            Number(gap) || 0
          )
        );


      return;

    }


    /*
     * Move to next sentence.
     */

    this.sentenceIndex++;


    this.render();


    this.timer =
      setTimeout(
        () => this.speakCurrent(),
        Math.max(
          0,
          Number(settings.sentenceGap) || 0
        )
      );

  }


  toggle() {

    if (
      this.state === "playing"
    ) {

      this.tts.pause();

      this.state = "paused";

      this.render();

      return;

    }


    if (
      this.state === "paused"
    ) {

      if (this.tts.paused) {

        this.tts.resume();

      }
      else {

        this.state = "playing";

        this.speakCurrent();

      }


      this.state = "playing";

      this.render();

      return;

    }


    this.play();

  }


  stop() {

    clearTimeout(this.timer);

    this.timer = null;


    this.generation++;


    this.tts.stop();


    this.state = "stopped";


    this.render();

  }


  nextSentence() {

    if (!this.bookData) {

      return;

    }


    this.tts.stop();

    clearTimeout(this.timer);


    if (
      this.sentenceIndex <
      this.chapter.sentences.length - 1
    ) {

      this.sentenceIndex++;

    }
    else if (
      this.chapterIndex <
      this.bookData.chapters.length - 1
    ) {

      this.chapterIndex++;

      this.sentenceIndex = 0;

    }


    if (
      this.state === "playing"
    ) {

      this.speakCurrent();

    }


    this.render();

  }


  previousSentence() {

    if (!this.bookData) {

      return;

    }


    this.tts.stop();

    clearTimeout(this.timer);


    if (
      this.sentenceIndex > 0
    ) {

      this.sentenceIndex--;

    }
    else if (
      this.chapterIndex > 0
    ) {

      this.chapterIndex--;

      this.sentenceIndex =
        Math.max(
          0,
          this.chapter.sentences.length - 1
        );

    }


    if (
      this.state === "playing"
    ) {

      this.speakCurrent();

    }


    this.render();

  }


  nextChapter() {

    if (!this.bookData) {

      return;

    }


    this.tts.stop();

    clearTimeout(this.timer);


    if (
      this.chapterIndex <
      this.bookData.chapters.length - 1
    ) {

      this.chapterIndex++;

      this.sentenceIndex = 0;


      if (
        this.state === "playing"
      ) {

        this.speakCurrent();

      }

    }
    else {

      this.state = "stopped";

    }


    this.render();

  }


  previousChapter() {

    if (!this.bookData) {

      return;

    }


    this.tts.stop();

    clearTimeout(this.timer);


    if (
      this.chapterIndex > 0
    ) {

      this.chapterIndex--;

      this.sentenceIndex = 0;

    }


    this.render();

  }


  render() {

    const chapter =
      this.chapter;


    const sentence =
      this.sentence;


    if (this.ui.currentChapter) {

      this.ui.currentChapter.textContent =
        chapter?.title ||
        "Ready to play";

    }


    if (this.ui.currentSentence) {

      this.ui.currentSentence.textContent =
        sentence ||
        "No sentence selected";

    }


    if (this.ui.playButton) {

      this.ui.playButton.textContent =
        this.state === "playing"
          ? "⏸"
          : "▶";

    }


    const total =
      this.totalSentences();


    const completed =
      this.completedSentences();


    let percentage = 0;


    if (total > 0) {

      percentage =
        Math.round(
          (
            completed /
            total
          ) * 100
        );

    }


    if (this.ui.progressBar) {

      this.ui.progressBar.style.width =
        `${percentage}%`;

    }


    if (this.ui.progressText) {

      this.ui.progressText.textContent =
        `${percentage}%`;

    }

  }

}
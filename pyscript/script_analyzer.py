import re
import json

from js import window
from pyodide.ffi import create_proxy


# =========================================================
# NUMBER NORMALIZATION
# =========================================================

def normalize_numbers(text):

    text = str(text or "")

    # Currency
    text = re.sub(
        r"(?<!\w)\$(\d+(?:\.\d+)?)",
        r"\1 dollars",
        text
    )

    text = re.sub(
        r"(?<!\w)₹\s*(\d+(?:\.\d+)?)",
        r"\1 rupees",
        text
    )

    # Percentage
    text = re.sub(
        r"(\d+(?:\.\d+)?)%",
        r"\1 percent",
        text
    )

    # Multiple spaces
    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    return text.strip()


# =========================================================
# SENTENCE SPLITTER
# =========================================================

def split_sentences(text):

    if not text:
        return []

    pattern = (
        r"[^.!?]+[.!?]+"
        r"|[^.!?]+$"
    )

    result = re.findall(
        pattern,
        text,
        flags=re.MULTILINE
    )

    return [
        item.strip()
        for item in result
        if item.strip()
    ]


# =========================================================
# CHAPTER DETECTION
# =========================================================

def detect_chapters(text):

    lines = [
        line.strip()
        for line in str(text).splitlines()
        if line.strip()
    ]


    chapter_pattern = re.compile(
        r"^(chapter|chap\.|part|prologue|epilogue|"
        r"introduction|section)\b",
        re.IGNORECASE
    )


    chapters = []


    current = {
        "title": "Chapter 1",
        "sentences": []
    }


    for line in lines:

        if chapter_pattern.match(line):

            if current["sentences"]:

                chapters.append(
                    current
                )


            current = {
                "title": line,
                "sentences": []
            }


        else:

            current["sentences"].extend(
                split_sentences(line)
            )


    if current["sentences"]:

        chapters.append(
            current
        )


    return chapters


# =========================================================
# ANALYZE SCRIPT
# =========================================================

def analyze_script(
    text,
    normalize=True
):

    raw = str(text or "").strip()


    if normalize:

        processed = normalize_numbers(
            raw
        )

    else:

        processed = raw


    sentences = split_sentences(
        processed
    )


    chapters = detect_chapters(
        processed
    )


    # If no chapter heading exists
    if (
        not chapters and
        sentences
    ):

        chapters = [
            {
                "title": "Chapter 1",
                "sentences": sentences
            }
        ]


    words = (
        len(
            re.findall(
                r"\S+",
                processed
            )
        )
        if processed
        else 0
    )


    characters = len(raw)


    sentence_count = len(
        sentences
    )


    # Approximate narration speed
    words_per_minute = 150


    duration_minutes = (
        words /
        words_per_minute
        if words
        else 0
    )


    return {

        "words": words,

        "characters": characters,

        "sentences": sentence_count,

        "chapters": chapters,

        "durationMinutes":
            duration_minutes,

        "narrationText":
            processed

    }


# =========================================================
# PYSCRIPT BRIDGE
# =========================================================

def py_analyze_script(
    text,
    normalize=True
):

    result = analyze_script(
        text,
        normalize
    )


    return json.dumps(
        result
    )


window.pyAnalyzeScript = create_proxy(
    py_analyze_script
)
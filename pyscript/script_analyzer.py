import re
import json
from js import window
from pyodide.ffi import create_proxy


def normalize_numbers(text):
    """
    Basic number normalization.
    Keeps the text understandable for narration.
    """

    replacements = {
        "$": " dollars ",
        "₹": " rupees ",
        "€": " euros ",
        "%": " percent "
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text):

    pattern = r"[^.!?]+[.!?]+|[^.!?]+$"

    matches = re.findall(pattern, text)

    return [
        x.strip()
        for x in matches
        if x.strip()
    ]


def detect_chapters(text):

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    chapter_pattern = re.compile(
        r"^(chapter|chap\.|part|prologue|epilogue|introduction)\b",
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
                chapters.append(current)

            current = {
                "title": line,
                "sentences": []
            }

            continue

        current["sentences"].extend(
            split_sentences(line)
        )

    if current["sentences"]:
        chapters.append(current)

    return chapters


def analyze_script(text, normalize=True):

    text = str(text or "").strip()

    if normalize:
        text_for_stats = normalize_numbers(text)
    else:
        text_for_stats = text

    words = (
        len(re.findall(r"\S+", text_for_stats))
        if text_for_stats
        else 0
    )

    characters = len(text)

    sentences = split_sentences(
        text_for_stats
    )

    chapters = detect_chapters(
        text_for_stats
    )

    if not chapters and sentences:

        chapters = [{
            "title": "Chapter 1",
            "sentences": sentences
        }]

    estimated_minutes = (
        words / 150
        if words
        else 0
    )

    return {
        "words": words,
        "characters": characters,
        "sentences": len(sentences),
        "chapters": chapters,
        "durationMinutes": estimated_minutes
    }


def py_analyze_script(text, normalize=True):

    result = analyze_script(
        text,
        normalize
    )

    return json.dumps(result)


proxy = create_proxy(py_analyze_script)

window.pyAnalyzeScript = proxy
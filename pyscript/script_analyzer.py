import re
import math
from pyscript import window, document, ffi

def count_words(text):
    return len(text.split())

def count_characters(text):
    return len(text)

def estimate_duration(word_count, wpm=150):
    return math.ceil(word_count / wpm)

def detect_chapters(text):
    # Detect common chapter headings
    pattern = r'(?i)^(chapter\s+\w+|part\s+\w+|prologue|epilogue|introduction).*$'
    chapters = []
    lines = text.split('\n')
    current_text = []
    current_title = "Start"
    
    for line in lines:
        if re.match(pattern, line.strip()):
            if current_text:
                chapters.append({"title": current_title, "text": '\n'.join(current_text)})
            current_title = line.strip()
            current_text = []
        else:
            current_text.append(line)
            
    if current_text:
        chapters.append({"title": current_title, "text": '\n'.join(current_text)})
        
    if not chapters:
        chapters = [{"title": "Chapter 1", "text": text}]
        
    return chapters

def chunk_text(text):
    # Smart chunking by sentence to prevent browser TTS cutoff
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    for s in sentences:
        if s.strip():
            chunks.append({
                "text": s.strip(),
                "words": count_words(s)
            })
    return chunks

def process_numbers(text):
    # Basic local number normalization
    text = re.sub(r'\b(\d+)\s*%\b', r'\1 percent', text)
    text = re.sub(r'\$(\d+)', r'\1 dollars', text)
    return text

def analyze_script(event=None):
    editor = document.getElementById("script-editor")
    text = editor.value
    
    if not text.strip():
        window.alert("Script is empty.")
        return

    # Normalize text
    auto_num = document.getElementById("auto-number").checked
    if auto_num:
        text = process_numbers(text)

    # Stats
    words = count_words(text)
    chars = count_characters(text)
    duration = estimate_duration(words)
    
    # Structure
    chapter_data = detect_chapters(text)
    structured_book = []
    
    for i, chap in enumerate(chapter_data):
        structured_book.append({
            "id": i,
            "title": chap["title"],
            "chunks": chunk_text(chap["text"])
        })
    
    # Update UI Stats
    document.getElementById("stat-words").innerText = str(words)
    document.getElementById("stat-chars").innerText = str(chars)
    document.getElementById("stat-chapters").innerText = str(len(chapter_data))
    document.getElementById("stat-duration").innerText = f"{duration} min"
    
    # Pass data to JS via PyScript window binding
    js_book_data = ffi.to_js(structured_book)
    window.app.loadBookData(js_book_data)
    
    document.getElementById("processing-status").innerText = "Analysis Complete! Ready to play."
    document.getElementById("processing-status").className = "success"

# Bind to button
document.getElementById("btn-analyze").addEventListener("click", analyze_script)


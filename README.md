# Offline Audiobook Studio 🎧

A complete production-quality web application that converts a user's written script into spoken audiobook narration **WITHOUT USING ANY EXTERNAL TTS API**. 

## Features
- **100% Client-Side:** No ElevenLabs, No OpenAI, No Google/Azure TTS. No backend required.
- **Browser Native Voices:** Uses `window.speechSynthesis` natively.
- **PyScript Integration:** Script analysis, chapter detection, and intelligent chunking are powered by local Python running in the browser.
- **Local Model Architecture:** Designed with a `LocalTTSProvider` interface so that client-side neural TTS models (e.g., ONNX, WebGL-based models) can be plugged in seamlessly in the future.
- **Offline PWA Support:** Installable and works entirely offline once cached.

## Important Note on Browser Voices
Browser-native voices (`SpeechSynthesis`) can play narration locally, but direct audio export (MP3/WAV) is not guaranteed or natively supported by standard web APIs without a local WebAudio routing trick, which is browser-dependent. The UI honestly reflects this limitation.

## Vercel Deployment Instructions
1. Push this repository to GitHub.
2. Log into Vercel and click **Add New... > Project**.
3. Import the GitHub repository.
4. Framework Preset: `Other`.
5. Build Command: `None` (Leave empty).
6. Output Directory: `None` (Leave empty).
7. Click **Deploy**. Vercel will serve the static files, and the app will function entirely in the browser.

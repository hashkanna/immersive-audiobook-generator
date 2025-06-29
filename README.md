# AudioNovel AI - Immersive Audiobook Generator

> 🏆 Built for the [Bolt x ElevenLabs AI Hackathon](https://lu.ma/nugckc58?tk=v1fFVk)

Transform novels into immersive audiobooks with AI-powered character voices and atmospheric sound effects. This project demonstrates the creation of a fully-voiced audiobook of Isaac Asimov's "The Caves of Steel" Chapter 1, featuring unique character voices, emotion-based voice modulation, and dramatic sound effects.

## 🚀 Features

- **Intelligent Text Processing**: Extracts and analyzes text from PDFs/text files
- **Character Voice Mapping**: Automatically identifies characters and assigns unique ElevenLabs voices
- **Emotion Detection**: Analyzes dialogue emotions and adjusts voice parameters accordingly
- **Dialogue Separation**: Ensures character voices speak their own lines, not the narrator
- **Atmospheric Sound Effects**: Generates contextual sound effects (footsteps, doors, rain, tension)
- **Modular Pipeline**: 8-step process that can be resumed, skipped, or re-run at any stage
- **Production Ready**: Combines all audio segments into a complete audiobook file

## Prerequisites

- Node.js 18+
- ffmpeg (for combining audio segments)
- OpenAI API key
- ElevenLabs API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install ffmpeg:
   - macOS: `brew install ffmpeg`
   - Ubuntu: `sudo apt-get install ffmpeg`
   - Windows: Download from https://ffmpeg.org/

4. Create a `.env` file with your API keys:
   ```bash
   # Create the .env file
   touch .env
   ```

5. Add your API keys to the `.env` file:
   ```bash
   # Edit .env and add:
   OPENAI_API_KEY=your_openai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

   **Get your API keys from:**
   - OpenAI: https://platform.openai.com/api-keys
   - ElevenLabs: https://elevenlabs.io/api

   **⚠️ Security Note**: The `.env` file is blocked by .gitignore to keep your API keys secure.

## Usage

### Full Generation (All Steps)
Run the complete audiobook generator:

```bash
npm start
```

### Modular Generation (Skip Completed Steps)
The system is modular and caches results from each step. Use the modular approach to resume from any step:

```bash
# Run all steps (checks for existing files and skips completed ones)
npm run modular

# Start from a specific step (1-7)
npm run modular -- --start-from 6

# Force rerun specific steps
npm run modular -- --force-rerun 2,3

# Skip specific steps
npm run modular -- --skip 1,2

# Combine options
npm run modular -- --start-from 4 --force-rerun 6
```

### Generation Steps
1. **Extract text** from PDF/TXT → `chapter1_extracted.txt`
2. **Create sequential segments** → `sequential_segments.json`
3. **Extract character info** → `characters_and_dialogues.json`
4. **Analyze emotions** → `dialogues_with_emotions.json`
5. **Map voices** → `voice_assignments.json`
6. **Generate audio** → individual MP3 files + `audiobook_manifest.json`
7. **Combine audio** → `audiobook_chapter1.mp3`
8. **Generate sound effects** → ambient effects + `sound_effects_manifest.json`

### Examples

```bash
# First run - generates everything
npm run modular

# Regenerate audio with different settings (skips steps 1-5)
npm run modular -- --start-from 6

# Redo emotion analysis and everything after
npm run modular -- --start-from 4

# Force regenerate just the voice mapping
npm run modular -- --force-rerun 5

# Show help
npm run modular -- --help
```

## Output

All output files are saved in the `output/` directory:
- `chapter1_extracted.txt` - Extracted text from PDF
- `characters_and_dialogues.json` - Identified characters and dialogues
- `dialogues_with_emotions.json` - Dialogues with emotion analysis
- `voice_assignments.json` - Character to voice mappings
- `audiobook_manifest.json` - Details of all audio segments
- `audiobook_chapter1.mp3` - Final combined audiobook

## Configuration

### Voice Settings

The `voiceMapper.js` file contains voice assignments for different character types. You can modify the voice IDs to use different ElevenLabs voices.

### Emotion Mapping

The system adjusts voice settings based on detected emotions:
- Angry: Less stability, more style
- Sad: Reduced stability and style
- Excited: Less stability, more style
- Anxious: Reduced stability
- Calm: Increased stability, reduced style

## Troubleshooting

1. **Rate Limiting**: If you encounter rate limits from ElevenLabs, increase the delay in `main.js`
2. **Missing ffmpeg**: Ensure ffmpeg is installed and in your PATH
3. **PDF Extraction Issues**: Some PDFs may not extract cleanly - check the extracted text file

## 🏗️ Tech Stack

- **OpenAI GPT-4**: Character extraction, emotion analysis, and text segmentation
- **ElevenLabs API**: Voice synthesis and sound effect generation
- **Node.js**: Runtime environment
- **FFmpeg**: Audio processing and concatenation

## 🎯 Hackathon Submission

This project was created for the [Bolt x ElevenLabs AI Hackathon](https://lu.ma/nugckc58?tk=v1fFVk), showcasing the potential of AI in creating immersive audio experiences. The system demonstrates:

- Advanced AI text analysis for narrative understanding
- Dynamic voice synthesis with emotional intelligence
- Atmospheric sound design for enhanced immersion
- Scalable architecture for processing entire novels

## 📝 License

This project is for educational and demonstration purposes. Ensure you have rights to process any copyrighted material.

---

Built with ❤️ using [Bolt](https://bolt.new) and [ElevenLabs](https://elevenlabs.io)
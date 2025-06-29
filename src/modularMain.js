import dotenv from 'dotenv';
import { extractTextFromPDF, saveTextToFile } from './pdfExtractor.js';
import { extractTextFromPDFWithPdfjs } from './pdfExtractorPdfjs.js';
import { extractTextFromPDFWithPdf2json } from './pdfExtractorPdf2json.js';
import { TextProcessor } from './textProcessor.js';
import { VoiceMapper } from './voiceMapper.js';
import { AudioGenerator } from './audioGenerator.js';
import { SoundEffectsGenerator } from './soundEffects.js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

class ModularAudiobookGenerator {
  constructor() {
    this.outputDir = 'output';
    this.stepFiles = {
      textExtraction: 'chapter1_extracted.txt',
      sequentialSegments: 'sequential_segments.json',
      characters: 'characters_and_dialogues.json',
      emotions: 'dialogues_with_emotions.json',
      voiceMapping: 'voice_assignments.json',
      manifest: 'audiobook_manifest.json',
      soundEffects: 'sound_effects_manifest.json'
    };
  }

  async fileExists(filename) {
    try {
      await fs.access(path.join(this.outputDir, filename));
      return true;
    } catch {
      return false;
    }
  }

  async loadData(filename) {
    try {
      const content = await fs.readFile(path.join(this.outputDir, filename), 'utf-8');
      return filename.endsWith('.json') ? JSON.parse(content) : content;
    } catch (error) {
      console.log(`Could not load ${filename}:`, error.message);
      return null;
    }
  }

  async saveData(filename, data) {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await fs.writeFile(path.join(this.outputDir, filename), content);
  }

  async step1_extractText(forceRerun = false) {
    console.log('📄 Step 1: Loading Chapter 1 text...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.textExtraction)) {
      console.log('   ✅ Text already extracted, loading from file...');
      const text = await this.loadData(this.stepFiles.textExtraction);
      return {
        text: text,
        numpages: Math.ceil(text.length / 2000),
        info: { source: 'cached' }
      };
    }

    const txtPath = path.join(process.cwd(), 'caves-of-steel-chapter1.txt');
    const pdfPath = path.join(process.cwd(), 'caves-of-steel-chapter1.pdf');
    
    let textData;
    
    try {
      await fs.access(txtPath);
      console.log('   Found text file, using caves-of-steel-chapter1.txt');
      const textContent = await fs.readFile(txtPath, 'utf-8');
      textData = {
        text: textContent,
        numpages: Math.ceil(textContent.length / 2000),
        info: { source: 'text file' }
      };
    } catch (error) {
      console.log('   Text file not found, trying PDF extraction...');
      try {
        textData = await extractTextFromPDFWithPdf2json(pdfPath);
        console.log('   Successfully extracted text with pdf2json');
      } catch (error) {
        console.log('   pdf2json failed, trying pdfjs-dist...');
        try {
          textData = await extractTextFromPDFWithPdfjs(pdfPath);
        } catch (error2) {
          console.log('   pdfjs-dist failed, falling back to pdf-parse-new...');
          textData = await extractTextFromPDF(pdfPath);
        }
      }
    }
    
    await this.saveData(this.stepFiles.textExtraction, textData.text);
    console.log(`   ✅ Loaded text content (${textData.text.length} characters)\n`);
    return textData;
  }

  async step2_createSequentialSegments(textData, forceRerun = false) {
    console.log('🤖 Step 2: Creating sequential audiobook segments...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.sequentialSegments)) {
      console.log('   ✅ Sequential segments already created, loading from file...');
      return await this.loadData(this.stepFiles.sequentialSegments);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    const textProcessor = new TextProcessor(process.env.OPENAI_API_KEY);
    const sequentialData = await textProcessor.createSequentialSegments(textData.text);
    
    await this.saveData(this.stepFiles.sequentialSegments, sequentialData);
    console.log(`   ✅ Created ${sequentialData.segments.length} sequential segments\n`);
    return sequentialData;
  }

  async step3_extractCharacters(textData, forceRerun = false) {
    console.log('🎭 Step 3: Extracting character information...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.characters)) {
      console.log('   ✅ Characters already extracted, loading from file...');
      return await this.loadData(this.stepFiles.characters);
    }

    const textProcessor = new TextProcessor(process.env.OPENAI_API_KEY);
    const extractedData = await textProcessor.extractCharactersAndDialogue(textData.text);
    
    await this.saveData(this.stepFiles.characters, extractedData);
    console.log(`   ✅ Found ${Object.keys(extractedData.characters).length} characters\n`);
    return extractedData;
  }

  async step4_analyzeEmotions(sequentialData, forceRerun = false) {
    console.log('😊 Step 4: Analyzing emotions in dialogue segments...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.emotions)) {
      console.log('   ✅ Emotions already analyzed, loading from file...');
      return await this.loadData(this.stepFiles.emotions);
    }

    const textProcessor = new TextProcessor(process.env.OPENAI_API_KEY);
    const dialogueSegments = sequentialData.segments.filter(seg => seg.type === 'dialogue');
    const analyzedDialogues = await textProcessor.analyzeEmotions(
      dialogueSegments.map(seg => ({
        speaker: seg.speaker,
        text: seg.text,
        context: `Segment ${seg.order} in the sequence`
      }))
    );
    
    await this.saveData(this.stepFiles.emotions, analyzedDialogues);
    console.log(`   ✅ Analyzed emotions for ${analyzedDialogues.length} dialogues\n`);
    return analyzedDialogues;
  }

  async step5_mapVoices(extractedData, forceRerun = false) {
    console.log('🎵 Step 5: Mapping characters to voices...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.voiceMapping)) {
      console.log('   ✅ Voice mapping already created, loading from file...');
      return await this.loadData(this.stepFiles.voiceMapping);
    }

    const voiceMapper = new VoiceMapper();
    const voiceAssignments = voiceMapper.assignVoicesToCharacters(extractedData.characters);
    
    await this.saveData(this.stepFiles.voiceMapping, voiceAssignments);
    console.log('   ✅ Voice mapping complete\n');
    return { voiceAssignments, voiceMapper };
  }

  async step6_generateAudio(sequentialData, analyzedDialogues, voiceAssignments, voiceMapper, forceRerun = false) {
    console.log('🔊 Step 6: Generating audio with ElevenLabs...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.manifest)) {
      console.log('   ✅ Audio already generated, loading manifest...');
      const manifest = await this.loadData(this.stepFiles.manifest);
      
      // Check if all audio files exist
      const audioGenerator = new AudioGenerator(process.env.ELEVENLABS_API_KEY);
      audioGenerator.audioSegments = manifest.segments.map((seg, index) => ({
        ...seg,
        index,
        filepath: path.join('output', seg.filename)
      }));
      
      console.log(`   ✅ Found ${manifest.segments.length} existing audio segments\n`);
      return audioGenerator;
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found in environment variables');
    }

    const audioGenerator = new AudioGenerator(process.env.ELEVENLABS_API_KEY);
    const sortedSegments = [...sequentialData.segments].sort((a, b) => a.order - b.order);
    
    let segmentCount = 0;
    const totalSegments = sortedSegments.length;
    
    for (const segment of sortedSegments) {
      segmentCount++;
      console.log(`   Processing segment ${segmentCount}/${totalSegments} (${segment.type})...`);
      
      if (segment.type === 'dialogue') {
        const dialogueWithEmotion = analyzedDialogues.find(d => 
          d.text === segment.text && d.speaker === segment.speaker
        ) || {
          speaker: segment.speaker,
          text: segment.text,
          emotion: {
            primary_emotion: "neutral",
            intensity: "medium",
            voice_modulation: "normal"
          }
        };
        
        await audioGenerator.generateAudioForDialogue(
          dialogueWithEmotion,
          voiceAssignments,
          voiceMapper
        );
      } else {
        await audioGenerator.generateAudioForNarration(
          segment.text,
          voiceAssignments
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await audioGenerator.saveManifest();
    console.log('   ✅ Audio generation complete\n');
    return audioGenerator;
  }

  async step7_combineAudio(audioGenerator, forceRerun = false) {
    console.log('🎵 Step 7: Combining audio segments...');
    
    const finalAudioPath = path.join('output', 'audiobook_chapter1.mp3');
    
    if (!forceRerun) {
      try {
        await fs.access(finalAudioPath);
        console.log('   ✅ Final audiobook already exists\n');
        return finalAudioPath;
      } catch {
        // File doesn't exist, continue with combination
      }
    }

    const combinedPath = await audioGenerator.combineAudioSegments();
    console.log('   ✅ Audio combination complete\n');
    return combinedPath;
  }

  async step8_generateSoundEffects(sequentialData, forceRerun = false) {
    console.log('🎭 Step 8: Generating dramatic sound effects...');
    
    if (!forceRerun && await this.fileExists(this.stepFiles.soundEffects)) {
      console.log('   ✅ Sound effects already generated, loading manifest...');
      const manifest = await this.loadData(this.stepFiles.soundEffects);
      const soundEffects = new SoundEffectsGenerator(process.env.ELEVENLABS_API_KEY);
      soundEffects.effectSegments = manifest.effects || [];
      console.log(`   ✅ Found ${manifest.effects?.length || 0} existing sound effects\n`);
      return soundEffects;
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found in environment variables');
    }

    const soundEffects = new SoundEffectsGenerator(process.env.ELEVENLABS_API_KEY);
    
    // Analyze segments for sound effect opportunities
    const effectPrompts = await soundEffects.analyzeForSoundEffects(sequentialData.segments);
    console.log(`   📝 Found ${effectPrompts.length} opportunities for sound effects`);
    
    // Generate sound effects
    let effectCount = 0;
    for (const effectPrompt of effectPrompts) {
      effectCount++;
      console.log(`   Processing effect ${effectCount}/${effectPrompts.length}: ${effectPrompt.description}...`);
      
      await soundEffects.generateAmbientEffect(effectPrompt.description);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    await soundEffects.saveEffectsManifest();
    console.log('   ✅ Sound effects generation complete\n');
    return soundEffects;
  }

  async generateAudiobook(options = {}) {
    const {
      startFromStep = 1,
      forceRerunSteps = [],
      skipSteps = []
    } = options;

    try {
      console.log('🚀 Starting Modular Caves of Steel Audiobook Generation...\n');

      let textData, sequentialData, extractedData, analyzedDialogues, voiceData, audioGenerator, soundEffects;

      // Step 1: Extract text
      if (startFromStep <= 1 && !skipSteps.includes(1)) {
        textData = await this.step1_extractText(forceRerunSteps.includes(1));
      } else {
        textData = { text: await this.loadData(this.stepFiles.textExtraction) };
      }

      // Step 2: Create sequential segments
      if (startFromStep <= 2 && !skipSteps.includes(2)) {
        sequentialData = await this.step2_createSequentialSegments(textData, forceRerunSteps.includes(2));
      } else {
        sequentialData = await this.loadData(this.stepFiles.sequentialSegments);
      }

      // Step 3: Extract characters
      if (startFromStep <= 3 && !skipSteps.includes(3)) {
        extractedData = await this.step3_extractCharacters(textData, forceRerunSteps.includes(3));
      } else {
        extractedData = await this.loadData(this.stepFiles.characters);
      }

      // Step 4: Analyze emotions
      if (startFromStep <= 4 && !skipSteps.includes(4)) {
        analyzedDialogues = await this.step4_analyzeEmotions(sequentialData, forceRerunSteps.includes(4));
      } else {
        analyzedDialogues = await this.loadData(this.stepFiles.emotions);
      }

      // Step 5: Map voices
      if (startFromStep <= 5 && !skipSteps.includes(5)) {
        voiceData = await this.step5_mapVoices(extractedData, forceRerunSteps.includes(5));
      } else {
        const voiceAssignments = await this.loadData(this.stepFiles.voiceMapping);
        const voiceMapper = new VoiceMapper();
        voiceData = { voiceAssignments, voiceMapper };
      }

      // Step 6: Generate audio
      if (startFromStep <= 6 && !skipSteps.includes(6)) {
        audioGenerator = await this.step6_generateAudio(
          sequentialData, 
          analyzedDialogues, 
          voiceData.voiceAssignments, 
          voiceData.voiceMapper, 
          forceRerunSteps.includes(6)
        );
      } else {
        audioGenerator = new AudioGenerator(process.env.ELEVENLABS_API_KEY);
        const manifest = await this.loadData(this.stepFiles.manifest);
        audioGenerator.audioSegments = manifest.segments || [];
      }

      // Step 7: Combine audio
      if (startFromStep <= 7 && !skipSteps.includes(7)) {
        await this.step7_combineAudio(audioGenerator, forceRerunSteps.includes(7));
      }

      // Step 8: Generate sound effects
      if (startFromStep <= 8 && !skipSteps.includes(8)) {
        soundEffects = await this.step8_generateSoundEffects(sequentialData, forceRerunSteps.includes(8));
        
        console.log('\n✨ Audiobook generation complete!');
        console.log(`📁 Output saved to: output/audiobook_chapter1.mp3`);
        console.log('\n📊 Summary:');
        console.log(`   - Characters: ${Object.keys(extractedData?.characters || {}).length}`);
        console.log(`   - Total segments: ${sequentialData?.segments?.length || 0}`);
        console.log(`   - Audio files generated: ${audioGenerator?.audioSegments?.length || 0}`);
        console.log(`   - Sound effects generated: ${soundEffects?.effectSegments?.length || 0}`);
      }

    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const generator = new ModularAudiobookGenerator();

// Parse command line arguments
const options = {
  startFromStep: 1,
  forceRerunSteps: [],
  skipSteps: []
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--start-from' || arg === '-s') {
    options.startFromStep = parseInt(args[++i]) || 1;
  } else if (arg === '--force-rerun' || arg === '-f') {
    const steps = args[++i].split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
    options.forceRerunSteps = steps;
  } else if (arg === '--skip' || arg === '-k') {
    const steps = args[++i].split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
    options.skipSteps = steps;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Modular Audiobook Generator

Usage: node src/modularMain.js [options]

Options:
  -s, --start-from <step>     Start from step number (1-8)
  -f, --force-rerun <steps>   Force rerun specific steps (comma-separated: 1,2,3)
  -k, --skip <steps>          Skip specific steps (comma-separated: 1,2,3)
  -h, --help                  Show this help message

Steps:
  1. Extract text from PDF/TXT
  2. Create sequential segments
  3. Extract character information
  4. Analyze emotions
  5. Map voices
  6. Generate audio
  7. Combine audio
  8. Generate sound effects

Examples:
  node src/modularMain.js                    # Run all steps
  node src/modularMain.js -s 6               # Start from step 6 (audio generation)
  node src/modularMain.js -f 2,3             # Force rerun steps 2 and 3
  node src/modularMain.js -s 4 -f 6          # Start from step 4, force rerun step 6
  node src/modularMain.js -k 1,2             # Skip steps 1 and 2
    `);
    process.exit(0);
  }
}

// Run the generator
generator.generateAudiobook(options);
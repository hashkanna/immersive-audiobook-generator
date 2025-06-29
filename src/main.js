import dotenv from 'dotenv';
import { extractTextFromPDF, saveTextToFile } from './pdfExtractor.js';
import { extractTextFromPDFWithPdfjs } from './pdfExtractorPdfjs.js';
import { extractTextFromPDFWithPdf2json } from './pdfExtractorPdf2json.js';
import { TextProcessor } from './textProcessor.js';
import { VoiceMapper } from './voiceMapper.js';
import { AudioGenerator } from './audioGenerator.js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

async function main() {
  try {
    // Validate environment variables
    if (!process.env.OPENAI_API_KEY || !process.env.ELEVENLABS_API_KEY) {
      throw new Error('Please set OPENAI_API_KEY and ELEVENLABS_API_KEY in .env file');
    }

    console.log('🚀 Starting Caves of Steel Audiobook Generation...\n');

    // Step 1: Extract text from PDF or use provided text file
    console.log('📄 Step 1: Loading Chapter 1 text...');
    
    const txtPath = path.join(process.cwd(), 'caves-of-steel-chapter1.txt');
    const pdfPath = path.join(process.cwd(), 'caves-of-steel-chapter1.pdf');
    
    let textData;
    
    // Check if text file exists first
    try {
      await fs.access(txtPath);
      console.log('Found text file, using caves-of-steel-chapter1.txt');
      const textContent = await fs.readFile(txtPath, 'utf-8');
      textData = {
        text: textContent,
        numpages: Math.ceil(textContent.length / 2000), // Estimate pages
        info: { source: 'text file' }
      };
    } catch (error) {
      console.log('Text file not found, trying PDF extraction...');
      // Try with pdf2json first
      try {
        textData = await extractTextFromPDFWithPdf2json(pdfPath);
        console.log('Successfully extracted text with pdf2json');
      } catch (error) {
        console.log('pdf2json failed, trying pdfjs-dist...');
        try {
          textData = await extractTextFromPDFWithPdfjs(pdfPath);
        } catch (error2) {
          console.log('pdfjs-dist failed, falling back to pdf-parse-new...');
          textData = await extractTextFromPDF(pdfPath);
        }
      }
    }
    
    // Save extracted text for reference
    await saveTextToFile(textData.text, path.join('output', 'chapter1_extracted.txt'));
    console.log(`✅ Loaded text content (${textData.text.length} characters)\n`);

    // Step 2: Process text with OpenAI
    console.log('🤖 Step 2: Processing text with OpenAI...');
    const textProcessor = new TextProcessor(process.env.OPENAI_API_KEY);
    
    // Create sequential segments (replaces separate character/dialogue/narration extraction)
    console.log('   - Creating sequential audiobook segments...');
    const sequentialData = await textProcessor.createSequentialSegments(textData.text);
    await fs.writeFile(
      path.join('output', 'sequential_segments.json'),
      JSON.stringify(sequentialData, null, 2)
    );
    
    // Extract character info for voice mapping
    console.log('   - Extracting character information...');
    const extractedData = await textProcessor.extractCharactersAndDialogue(textData.text);
    await fs.writeFile(
      path.join('output', 'characters_and_dialogues.json'),
      JSON.stringify(extractedData, null, 2)
    );
    
    console.log(`   ✅ Found ${Object.keys(extractedData.characters).length} characters`);
    console.log(`   ✅ Created ${sequentialData.segments.length} sequential segments\n`);

    // Step 3: Analyze emotions for dialogue segments
    console.log('😊 Step 3: Analyzing emotions in dialogue segments...');
    const dialogueSegments = sequentialData.segments.filter(seg => seg.type === 'dialogue');
    const analyzedDialogues = await textProcessor.analyzeEmotions(
      dialogueSegments.map(seg => ({
        speaker: seg.speaker,
        text: seg.text,
        context: `Segment ${seg.order} in the sequence`
      }))
    );
    await fs.writeFile(
      path.join('output', 'dialogues_with_emotions.json'),
      JSON.stringify(analyzedDialogues, null, 2)
    );
    console.log('✅ Emotion analysis complete\n');

    // Step 4: Map characters to voices  
    console.log('🎭 Step 4: Mapping characters to voices...');
    const voiceMapper = new VoiceMapper();
    const voiceAssignments = voiceMapper.assignVoicesToCharacters(extractedData.characters);
    await fs.writeFile(
      path.join('output', 'voice_assignments.json'),
      JSON.stringify(voiceAssignments, null, 2)
    );
    console.log('✅ Voice mapping complete\n');

    // Step 5: Generate audio with ElevenLabs
    console.log('🔊 Step 5: Generating audio with ElevenLabs...');
    const audioGenerator = new AudioGenerator(process.env.ELEVENLABS_API_KEY);
    
    // Sort segments by order to ensure correct sequence
    const sortedSegments = [...sequentialData.segments].sort((a, b) => a.order - b.order);
    
    // Generate audio for each segment in order
    let segmentCount = 0;
    const totalSegments = sortedSegments.length;
    
    for (const segment of sortedSegments) {
      segmentCount++;
      console.log(`   Processing segment ${segmentCount}/${totalSegments} (${segment.type})...`);
      
      if (segment.type === 'dialogue') {
        // Find emotion analysis for this dialogue
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
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Audio generation complete\n');

    // Step 6: Combine audio segments
    console.log('🎵 Step 6: Combining audio segments...');
    await audioGenerator.saveManifest();
    const finalAudioPath = await audioGenerator.combineAudioSegments();
    
    console.log('\n✨ Audiobook generation complete!');
    console.log(`📁 Output saved to: ${finalAudioPath}`);
    console.log('\n📊 Summary:');
    console.log(`   - Characters: ${Object.keys(extractedData.characters).length}`);
    console.log(`   - Total segments: ${sequentialData.segments.length}`);
    console.log(`   - Dialogue segments: ${sortedSegments.filter(s => s.type === 'dialogue').length}`);
    console.log(`   - Narration segments: ${sortedSegments.filter(s => s.type === 'narration').length}`);
    console.log(`   - Audio files generated: ${audioGenerator.audioSegments.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
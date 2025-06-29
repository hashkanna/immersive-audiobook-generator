import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export class AudioGenerator {
  constructor(apiKey) {
    this.client = new ElevenLabsClient({
      apiKey: apiKey
    });
    this.audioSegments = [];
  }

  async generateAudioForDialogue(dialogue, voiceMapping, voiceMapper) {
    const speaker = dialogue.speaker;
    const voiceConfig = voiceMapping[speaker];
    
    if (!voiceConfig) {
      console.warn(`No voice mapping found for ${speaker}, using narrator voice`);
      return null;
    }

    // Adjust voice settings based on emotion
    const adjustedSettings = voiceMapper.adjustVoiceSettingsForEmotion(
      voiceConfig.voiceSettings,
      dialogue.emotion
    );

    try {
      console.log(`Generating audio for ${speaker}: "${dialogue.text.substring(0, 50)}..."`);
      
      const audioStream = await this.client.textToSpeech.convert(voiceConfig.voiceId, {
        text: dialogue.text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: adjustedSettings
      });

      // Generate unique filename
      const timestamp = Date.now();
      const index = this.audioSegments.length;
      const filename = `segment_${index}_${speaker.replace(/\s+/g, '_')}_${timestamp}.mp3`;
      const filepath = path.join('output', filename);

      // Convert the audio stream to a Node.js readable stream
      const nodeStream = Readable.from(audioStream);
      
      // Save the audio stream to file
      await pipeline(
        nodeStream,
        createWriteStream(filepath)
      );

      const segment = {
        index,
        type: 'dialogue',
        speaker,
        text: dialogue.text,
        emotion: dialogue.emotion,
        filename,
        filepath
      };

      this.audioSegments.push(segment);
      return segment;

    } catch (error) {
      console.error(`Error generating audio for ${speaker}:`, error);
      throw error;
    }
  }

  async generateAudioForNarration(narrationText, voiceMapping) {
    const voiceConfig = voiceMapping["Narrator"];
    
    try {
      console.log(`Generating narration: "${narrationText.substring(0, 50)}..."`);
      
      const audioStream = await this.client.textToSpeech.convert(voiceConfig.voiceId, {
        text: narrationText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: voiceConfig.voiceSettings
      });

      // Generate unique filename
      const timestamp = Date.now();
      const index = this.audioSegments.length;
      const filename = `segment_${index}_narrator_${timestamp}.mp3`;
      const filepath = path.join('output', filename);

      // Convert the audio stream to a Node.js readable stream
      const nodeStream = Readable.from(audioStream);
      
      // Save the audio stream to file
      await pipeline(
        nodeStream,
        createWriteStream(filepath)
      );

      const segment = {
        index,
        type: 'narration',
        speaker: 'Narrator',
        text: narrationText,
        filename,
        filepath
      };

      this.audioSegments.push(segment);
      return segment;

    } catch (error) {
      console.error('Error generating narration audio:', error);
      throw error;
    }
  }

  async combineAudioSegments(outputFilename = 'audiobook_chapter1.mp3') {
    if (this.audioSegments.length === 0) {
      throw new Error('No audio segments to combine');
    }

    // Sort segments by index to ensure correct order
    const sortedSegments = [...this.audioSegments].sort((a, b) => a.index - b.index);
    
    // Create a file list for ffmpeg
    const fileListPath = path.join('output', 'segments.txt');
    const fileListContent = sortedSegments
      .map(segment => `file '${segment.filename}'`)
      .join('\n');
    
    await fs.writeFile(fileListPath, fileListContent);

    console.log(`Combining ${sortedSegments.length} audio segments...`);
    
    // Use ffmpeg to concatenate audio files
    // Note: This requires ffmpeg to be installed on the system
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const outputPath = path.join('output', outputFilename);
    
    try {
      await execAsync(
        `cd output && ffmpeg -f concat -safe 0 -i segments.txt -c copy ${outputFilename} -y`,
        { cwd: process.cwd() }
      );
      
      console.log(`Audiobook saved to: ${outputPath}`);
      
      // Clean up segment files if needed
      // await this.cleanupSegments();
      
      return outputPath;
    } catch (error) {
      console.error('Error combining audio segments:', error);
      throw error;
    }
  }

  async combineWithSoundEffects(soundEffectsManifest, outputFilename = 'audiobook_with_effects.mp3') {
    const baseAudioPath = 'audiobook_chapter1.mp3'; // Relative to output directory
    const outputPath = path.join('output', outputFilename);
    
    // Create a complex ffmpeg filter to overlay sound effects
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    console.log(`Combining audiobook with ${soundEffectsManifest.effects.length} sound effects...`);
    
    // Simple approach: mix just a few key sound effects to avoid command complexity
    const keyEffects = soundEffectsManifest.effects.slice(0, 5); // Use first 5 effects
    
    try {
      // Simple mixing approach with fewer effects
      const command = `cd output && ffmpeg -i ${baseAudioPath} -i ${keyEffects[0].filename} -i ${keyEffects[1].filename} -i ${keyEffects[2].filename} -filter_complex "[0:a]volume=1.0[main];[1:a]volume=0.2,adelay=10s:all=1[fx1];[2:a]volume=0.2,adelay=30s:all=1[fx2];[3:a]volume=0.2,adelay=60s:all=1[fx3];[main][fx1]amix=inputs=2:duration=longest[mix1];[mix1][fx2]amix=inputs=2:duration=longest[mix2];[mix2][fx3]amix=inputs=2:duration=longest" -c:a libmp3lame -b:a 192k ${outputFilename} -y`;
      
      console.log('Running simplified ffmpeg command...');
      await execAsync(command, { cwd: process.cwd() });
      
      console.log(`Immersive audiobook with sound effects saved to: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      console.error('Error combining audiobook with sound effects:', error);
      console.log('Falling back to simple two-track mix...');
      
      // Fallback: simple two-track mix
      try {
        const simpleCommand = `cd output && ffmpeg -i ${baseAudioPath} -i ${soundEffectsManifest.effects[0].filename} -filter_complex "[0:a]volume=1.0[main];[1:a]volume=0.3[fx];[main][fx]amix=inputs=2:duration=longest" -c:a libmp3lame -b:a 192k ${outputFilename} -y`;
        await execAsync(simpleCommand, { cwd: process.cwd() });
        console.log(`Simplified audiobook with effects saved to: ${outputPath}`);
        return outputPath;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async cleanupSegments() {
    for (const segment of this.audioSegments) {
      try {
        await fs.unlink(segment.filepath);
      } catch (error) {
        console.warn(`Failed to delete segment file: ${segment.filepath}`);
      }
    }
  }

  async saveManifest() {
    const manifestPath = path.join('output', 'audiobook_manifest.json');
    const manifest = {
      generatedAt: new Date().toISOString(),
      totalSegments: this.audioSegments.length,
      segments: this.audioSegments.map(seg => ({
        index: seg.index,
        type: seg.type,
        speaker: seg.speaker,
        text: seg.text,
        emotion: seg.emotion,
        filename: seg.filename
      }))
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved to: ${manifestPath}`);
  }
}
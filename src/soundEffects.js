import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export class SoundEffectsGenerator {
  constructor(apiKey) {
    this.client = new ElevenLabsClient({
      apiKey: apiKey
    });
    this.effectSegments = [];
  }

  // Analyze text to determine where sound effects should be added
  async analyzeForSoundEffects(segments) {
    const effectPrompts = [];
    
    segments.forEach((segment, index) => {
      // Look for action words and scenes that need sound effects
      const text = segment.text.toLowerCase();
      
      // Door sounds
      if (text.includes('door') || text.includes('stepped in') || text.includes('entered')) {
        effectPrompts.push({
          afterSegment: index,
          description: "door opening or closing",
          duration: "short"
        });
      }
      
      // Footsteps
      if (text.includes('walked') || text.includes('stepped') || text.includes('paced')) {
        effectPrompts.push({
          afterSegment: index,
          description: "footsteps on hard floor",
          duration: "short"
        });
      }
      
      // Rain (mentioned in the text)
      if (text.includes('rain') || text.includes('raining') || text.includes('water dropping')) {
        effectPrompts.push({
          afterSegment: index,
          description: "gentle rain on window",
          duration: "medium"
        });
      }
      
      // Tension/suspense moments
      if (text.includes('murder') || text.includes('died') || text.includes('killed')) {
        effectPrompts.push({
          afterSegment: index,
          description: "ominous tension, dramatic pause",
          duration: "short"
        });
      }
      
      // Technology sounds
      if (text.includes('tape reeled') || text.includes('instrument searched')) {
        effectPrompts.push({
          afterSegment: index,
          description: "futuristic computer processing sounds",
          duration: "short"
        });
      }
      
      // Window/glass sounds
      if (text.includes('window') || text.includes('glass') || text.includes('transparent')) {
        effectPrompts.push({
          afterSegment: index,
          description: "subtle glass or window sound",
          duration: "short"
        });
      }
    });
    
    return effectPrompts;
  }

  // Generate sound effect using ElevenLabs
  async generateSoundEffect(description, duration = "short") {
    try {
      console.log(`Generating sound effect: ${description}`);
      
      // Map duration to approximate seconds
      const durationMap = {
        "short": "2-3 seconds",
        "medium": "4-5 seconds", 
        "long": "6-8 seconds"
      };
      
      const effectPrompt = `Generate a realistic ${description} sound effect lasting approximately ${durationMap[duration]}. Make it subtle and appropriate for an audiobook.`;
      
      // Generate sound effect using ElevenLabs sound generation
      const response = await this.client.textToSpeech.convert("pNInz6obpgDQGcFmaJgB", {
        text: effectPrompt,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3
        }
      });

      // Generate unique filename
      const timestamp = Date.now();
      const index = this.effectSegments.length;
      const filename = `effect_${index}_${description.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.mp3`;
      const filepath = path.join('output', filename);

      // Convert the audio stream to a Node.js readable stream
      const nodeStream = Readable.from(response);
      
      // Save the audio stream to file
      await pipeline(
        nodeStream,
        createWriteStream(filepath)
      );

      const effectSegment = {
        index,
        type: 'effect',
        description,
        duration,
        filename,
        filepath
      };

      this.effectSegments.push(effectSegment);
      return effectSegment;

    } catch (error) {
      console.error(`Error generating sound effect for "${description}":`, error);
      return null;
    }
  }

  // Alternative: Generate ambient sound effects using text prompts
  async generateAmbientEffect(description) {
    try {
      console.log(`Generating ambient effect: ${description}`);
      
      // Use a more neutral voice for ambient sounds
      const response = await this.client.textToSpeech.convert("EXAVITQu4vr4xnSDxMaL", {
        text: `*${description}*`, // Wrap in asterisks to indicate sound effect
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.9,
          similarity_boost: 0.3,
          style: 0.1,
          use_speaker_boost: false
        }
      });

      const timestamp = Date.now();
      const index = this.effectSegments.length;
      const filename = `ambient_${index}_${description.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.mp3`;
      const filepath = path.join('output', filename);

      const nodeStream = Readable.from(response);
      await pipeline(nodeStream, createWriteStream(filepath));

      const effectSegment = {
        index,
        type: 'ambient',
        description,
        filename,
        filepath
      };

      this.effectSegments.push(effectSegment);
      return effectSegment;

    } catch (error) {
      console.error(`Error generating ambient effect for "${description}":`, error);
      return null;
    }
  }

  // Create enhanced segments list with sound effects interspersed
  createEnhancedSegmentsList(originalSegments, effectPrompts) {
    const enhancedSegments = [];
    let effectIndex = 0;
    
    originalSegments.forEach((segment, index) => {
      // Add the original segment
      enhancedSegments.push({
        ...segment,
        originalIndex: index,
        enhancedIndex: enhancedSegments.length
      });
      
      // Check if there should be a sound effect after this segment
      const effectsForThisSegment = effectPrompts.filter(ep => ep.afterSegment === index);
      
      effectsForThisSegment.forEach(effectPrompt => {
        enhancedSegments.push({
          type: 'effect',
          description: effectPrompt.description,
          duration: effectPrompt.duration,
          originalIndex: -1, // Not from original text
          enhancedIndex: enhancedSegments.length,
          effectPrompt: effectPrompt
        });
      });
    });
    
    return enhancedSegments;
  }

  // Save sound effects manifest
  async saveEffectsManifest() {
    const manifestPath = path.join('output', 'sound_effects_manifest.json');
    const manifest = {
      generatedAt: new Date().toISOString(),
      totalEffects: this.effectSegments.length,
      effects: this.effectSegments
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Sound effects manifest saved to: ${manifestPath}`);
  }
}
import OpenAI from 'openai';

export class TextProcessor {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async extractCharactersAndDialogue(text) {
    const prompt = `
    Analyze the following text from "The Caves of Steel" Chapter 1 and extract:
    1. All character names that appear in the text
    2. All dialogues with their speakers
    3. Character descriptions and personality traits
    
    Return the result in JSON format with the following structure:
    {
      "characters": {
        "characterName": {
          "description": "brief description of character",
          "personality": "personality traits",
          "role": "their role in the story"
        }
      },
      "dialogues": [
        {
          "speaker": "character name",
          "text": "dialogue text",
          "context": "brief context or scene description"
        }
      ]
    }
    
    Text:
    ${text}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a literary analyst expert at identifying characters and extracting dialogue from science fiction novels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting characters and dialogue:', error);
      throw error;
    }
  }

  async analyzeEmotions(dialogues) {
    const analyzedDialogues = [];
    
    for (const dialogue of dialogues) {
      const prompt = `
      Analyze the emotional tone of this dialogue from "${dialogue.speaker}":
      
      Context: ${dialogue.context || 'N/A'}
      Dialogue: "${dialogue.text}"
      
      Return a JSON object with:
      {
        "primary_emotion": "main emotion (e.g., angry, sad, excited, calm, anxious, curious)",
        "intensity": "low/medium/high",
        "voice_modulation": "suggested voice characteristics (e.g., tense, soft, loud, trembling)"
      }
      `;

      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing emotional tone and voice characteristics in dialogue."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.5
        });

        const emotion = JSON.parse(response.choices[0].message.content);
        
        analyzedDialogues.push({
          ...dialogue,
          emotion: emotion
        });
      } catch (error) {
        console.error(`Error analyzing emotion for dialogue: ${dialogue.text}`, error);
        analyzedDialogues.push({
          ...dialogue,
          emotion: {
            primary_emotion: "neutral",
            intensity: "medium",
            voice_modulation: "normal"
          }
        });
      }
    }
    
    return analyzedDialogues;
  }

  async createSequentialSegments(text) {
    const prompt = `
    Analyze the following text from "The Caves of Steel" and create a sequential audiobook structure.
    CRITICAL: Extract ALL dialogue from narration and assign it to the correct character voices.
    
    Return a JSON object with:
    {
      "segments": [
        {
          "type": "narration" | "dialogue",
          "text": "the actual text content",
          "speaker": "character name (for dialogue) or Narrator (for narration)",
          "order": sequential_number_starting_from_0
        }
      ]
    }
    
    IMPORTANT RULES:
    1. **SEPARATE ALL DIALOGUE**: Any text in quotes should be a dialogue segment with the correct speaker
    2. **IDENTIFY SPEAKERS**: Look for patterns like "Baley said", "the Commissioner replied", etc.
    3. **CLEAN NARRATION**: Remove all quoted dialogue from narration segments
    4. **MAINTAIN ORDER**: Keep the exact sequence from the original text
    5. **SPLIT MIXED PARAGRAPHS**: If a paragraph has both narration and dialogue, split them into separate segments
    
    Example:
    Original: "Baley looked up. 'What do you want?' he asked."
    Should become:
    - Segment N (narration): "Baley looked up."
    - Segment N+1 (dialogue, speaker: Baley): "What do you want?"
    - Segment N+2 (narration): "he asked."
    
    Text:
    ${text}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at parsing novels for audiobook production. Your primary job is to correctly separate ALL dialogue from narration and assign each line to the appropriate character voice. Never let the narrator speak a character's dialogue."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error creating sequential segments:', error);
      throw error;
    }
  }
}
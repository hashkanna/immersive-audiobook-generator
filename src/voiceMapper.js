export class VoiceMapper {
  constructor() {
    // Default ElevenLabs voice IDs - these are some of the pre-made voices
    // You can get more voice IDs from the ElevenLabs API or dashboard
    this.availableVoices = {
      male: {
        deep: {
          id: "pNInz6obpgDQGcFmaJgB", // Adam
          name: "Adam",
          description: "Deep, mature male voice"
        },
        middle: {
          id: "VR6AewLTigWG4xSOukaG", // Arnold
          name: "Arnold",
          description: "Clear, middle-aged male voice"
        },
        young: {
          id: "ErXwobaYiN019PkySvjV", // Antoni
          name: "Antoni",
          description: "Young, energetic male voice"
        }
      },
      female: {
        mature: {
          id: "MF3mGyEYCl7XYWbV9V6O", // Elli
          name: "Elli",
          description: "Mature, professional female voice"
        },
        middle: {
          id: "XrExE9yKIg1WjnnlVkGX", // Matilda
          name: "Matilda",
          description: "Warm, middle-aged female voice"
        },
        young: {
          id: "21m00Tcm4TlvDq8ikWAM", // Rachel
          name: "Rachel",
          description: "Young, clear female voice"
        }
      },
      narrator: {
        id: "EXAVITQu4vr4xnSDxMaL", // Bella
        name: "Bella",
        description: "Clear, professional narrator voice"
      },
      robotic: {
        id: "nPczCjzI2devNBz1zQrb", // Brian
        name: "Brian",
        description: "Slightly mechanical, precise voice for robot characters"
      }
    };
    
    this.characterVoiceMap = {};
  }

  assignVoicesToCharacters(characters) {
    const voiceAssignments = {};
    
    for (const [characterName, characterInfo] of Object.entries(characters)) {
      const assignment = this.selectVoiceForCharacter(
        characterName,
        characterInfo.description,
        characterInfo.personality,
        characterInfo.role
      );
      
      voiceAssignments[characterName] = assignment;
      this.characterVoiceMap[characterName] = assignment;
      
      // Also map common short names/aliases
      if (characterName.includes("Baley")) {
        voiceAssignments["Baley"] = assignment;
        this.characterVoiceMap["Baley"] = assignment;
        voiceAssignments["Lije"] = assignment;
        this.characterVoiceMap["Lije"] = assignment;
      }
      if (characterName.includes("Enderby")) {
        voiceAssignments["Enderby"] = assignment;
        this.characterVoiceMap["Enderby"] = assignment;
        voiceAssignments["Commissioner"] = assignment;
        this.characterVoiceMap["Commissioner"] = assignment;
      }
      if (characterName.includes("Daneel")) {
        voiceAssignments["Daneel"] = assignment;
        this.characterVoiceMap["Daneel"] = assignment;
        voiceAssignments["R. Daneel Olivaw"] = assignment;
        this.characterVoiceMap["R. Daneel Olivaw"] = assignment;
      }
      if (characterName.includes("Simpson")) {
        voiceAssignments["Simpson"] = assignment;
        this.characterVoiceMap["Simpson"] = assignment;
      }
      if (characterName.includes("R. Sammy")) {
        voiceAssignments["R. Sammy"] = assignment;
        this.characterVoiceMap["R. Sammy"] = assignment;
      }
    }
    
    // Add narrator voice
    voiceAssignments["Narrator"] = {
      voiceId: this.availableVoices.narrator.id,
      voiceName: this.availableVoices.narrator.name,
      voiceSettings: {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    };
    
    return voiceAssignments;
  }

  selectVoiceForCharacter(name, description, personality, role) {
    // Special handling for known characters
    if (name.toLowerCase().includes("elijah") || name.toLowerCase().includes("baley")) {
      return {
        voiceId: this.availableVoices.male.middle.id,
        voiceName: this.availableVoices.male.middle.name,
        voiceSettings: {
          stability: 0.65, // Slightly less stable for human anxiety
          similarity_boost: 0.75,
          style: 0.6,
          use_speaker_boost: true
        }
      };
    }
    
    if (name.toLowerCase().includes("daneel") || name.toLowerCase().includes("r.") || 
        description.toLowerCase().includes("robot") || role.toLowerCase().includes("robot")) {
      return {
        voiceId: this.availableVoices.robotic.id,
        voiceName: this.availableVoices.robotic.name,
        voiceSettings: {
          stability: 0.95, // Very stable for robotic precision
          similarity_boost: 0.85,
          style: 0.2, // Less expressive
          use_speaker_boost: false
        }
      };
    }
    
    // Generic assignment based on description
    const descLower = description.toLowerCase();
    const isYoung = descLower.includes("young") || descLower.includes("youth");
    const isMature = descLower.includes("old") || descLower.includes("mature") || descLower.includes("senior");
    const isFemale = descLower.includes("woman") || descLower.includes("female") || 
                     descLower.includes("she") || descLower.includes("her");
    
    let voice;
    if (isFemale) {
      if (isYoung) voice = this.availableVoices.female.young;
      else if (isMature) voice = this.availableVoices.female.mature;
      else voice = this.availableVoices.female.middle;
    } else {
      if (isYoung) voice = this.availableVoices.male.young;
      else if (isMature) voice = this.availableVoices.male.deep;
      else voice = this.availableVoices.male.middle;
    }
    
    return {
      voiceId: voice.id,
      voiceName: voice.name,
      voiceSettings: {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    };
  }

  adjustVoiceSettingsForEmotion(baseSettings, emotion) {
    const settings = { ...baseSettings };
    
    switch (emotion.primary_emotion) {
      case 'angry':
        settings.stability = Math.max(0.3, settings.stability - 0.2);
        settings.style = Math.min(1.0, settings.style + 0.3);
        break;
      case 'sad':
        settings.stability = Math.max(0.4, settings.stability - 0.1);
        settings.style = Math.max(0.2, settings.style - 0.2);
        break;
      case 'excited':
        settings.stability = Math.max(0.3, settings.stability - 0.2);
        settings.style = Math.min(1.0, settings.style + 0.2);
        break;
      case 'anxious':
        settings.stability = Math.max(0.35, settings.stability - 0.15);
        break;
      case 'calm':
        settings.stability = Math.min(0.95, settings.stability + 0.1);
        settings.style = Math.max(0.3, settings.style - 0.1);
        break;
    }
    
    // Adjust for intensity
    if (emotion.intensity === 'high') {
      settings.style = Math.min(1.0, settings.style + 0.1);
    } else if (emotion.intensity === 'low') {
      settings.style = Math.max(0.2, settings.style - 0.1);
    }
    
    return settings;
  }
}
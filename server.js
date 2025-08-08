console.log('Starting AI Music Composer Backend...');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MidiWriter } = require('midi-writer-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Music theory data structures
const musicTheory = {
  scales: {
    'C': { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], mode: 'major' },
    'G': { notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], mode: 'major' },
    'D': { notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], mode: 'major' },
    'A': { notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'], mode: 'major' },
    'E': { notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'], mode: 'major' },
    'Am': { notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], mode: 'minor' },
    'Em': { notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'], mode: 'minor' },
    'Dm': { notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'], mode: 'minor' }
  },
  
  chordProgressions: {
    classical: [
      { chord: 'I', notes: [0, 2, 4] },
      { chord: 'IV', notes: [3, 5, 0] },
      { chord: 'V', notes: [4, 6, 1] },
      { chord: 'I', notes: [0, 2, 4] }
    ],
    jazz: [
      { chord: 'IMaj7', notes: [0, 2, 4, 6] },
      { chord: 'vi7', notes: [5, 0, 2, 4] },
      { chord: 'ii7', notes: [1, 3, 5, 0] },
      { chord: 'V7', notes: [4, 6, 1, 3] }
    ],
    pop: [
      { chord: 'I', notes: [0, 2, 4] },
      { chord: 'vi', notes: [5, 0, 2] },
      { chord: 'IV', notes: [3, 5, 0] },
      { chord: 'V', notes: [4, 6, 1] }
    ],
    rock: [
      { chord: 'I', notes: [0, 2, 4] },
      { chord: 'bVII', notes: [6, 1, 3] },
      { chord: 'IV', notes: [3, 5, 0] },
      { chord: 'I', notes: [0, 2, 4] }
    ],
    electronic: [
      { chord: 'i', notes: [0, 2, 4] },
      { chord: 'VI', notes: [5, 0, 2] },
      { chord: 'III', notes: [2, 4, 6] },
      { chord: 'VII', notes: [6, 1, 3] }
    ],
    ambient: [
      { chord: 'I', notes: [0, 2, 4, 6] },
      { chord: 'IV', notes: [3, 5, 0, 2] },
      { chord: 'vi', notes: [5, 0, 2, 4] },
      { chord: 'I', notes: [0, 2, 4, 6] }
    ]
  },

  rhythmPatterns: {
    1: ['4n'], // Very simple
    2: ['4n', '8n'], // Simple
    3: ['4n', '8n', '8n'], // Medium
    4: ['4n', '8n', '16n', '8n'], // Complex
    5: ['8n', '16n', '16n', '8n.', '16n'] // Very complex
  },

  moodAdjustments: {
    happy: { velocityRange: [80, 127], octavePreference: 'high', intervalJumps: 'large' },
    sad: { velocityRange: [40, 80], octavePreference: 'low', intervalJumps: 'small' },
    energetic: { velocityRange: [100, 127], octavePreference: 'high', intervalJumps: 'large' },
    calm: { velocityRange: [50, 90], octavePreference: 'middle', intervalJumps: 'small' },
    mysterious: { velocityRange: [60, 100], octavePreference: 'low', intervalJumps: 'wide' },
    romantic: { velocityRange: [70, 110], octavePreference: 'middle', intervalJumps: 'smooth' }
  }
};

// AI Music Generation Class
class AIComposer {
  constructor() {
    this.compositions = new Map();
  }

  generateComposition(params) {
    const compositionId = this.generateId();
    const composition = this.createComposition(params);
    this.compositions.set(compositionId, composition);
    return { id: compositionId, ...composition };
  }

  createComposition(params) {
    const scale = musicTheory.scales[params.key];
    const progression = musicTheory.chordProgressions[params.genre];
    const mood = musicTheory.moodAdjustments[params.mood];
    const rhythms = musicTheory.rhythmPatterns[params.complexity];

    // Generate melody
    const melody = this.generateMelody(scale, params, mood, rhythms);
    
    // Generate harmony
    const harmony = this.generateHarmony(scale, progression, params);
    
    // Generate bass line
    const bassLine = this.generateBassLine(scale, progression, params);
    
    // Generate drums (for non-classical genres)
    const drums = params.genre !== 'classical' ? this.generateDrums(params) : null;

    return {
      title: this.generateTitle(params),
      melody,
      harmony,
      bassLine,
      drums,
      structure: this.generateStructure(params),
      metadata: {
        genre: params.genre,
        key: params.key,
        tempo: params.tempo,
        mood: params.mood,
        duration: params.duration,
        complexity: params.complexity,
        generatedAt: new Date().toISOString()
      }
    };
  }

  generateMelody(scale, params, mood, rhythms) {
    const melody = [];
    const totalBeats = Math.floor((params.duration / 60) * params.tempo);
    const noteCount = Math.floor(totalBeats / 2); // Approximate note count
    
    let currentOctave = 4;
    let lastNoteIndex = 0;

    for (let i = 0; i < noteCount; i++) {
      // Choose note based on mood and musical logic
      let noteIndex = this.chooseNextNote(lastNoteIndex, scale.notes.length, mood);
      
      // Adjust octave based on mood preference
      if (mood.octavePreference === 'high' && Math.random() > 0.7) {
        currentOctave = Math.min(6, currentOctave + 1);
      } else if (mood.octavePreference === 'low' && Math.random() > 0.7) {
        currentOctave = Math.max(3, currentOctave - 1);
      }

      const note = scale.notes[noteIndex] + currentOctave;
      const rhythm = rhythms[Math.floor(Math.random() * rhythms.length)];
      const velocity = this.randomInRange(mood.velocityRange[0], mood.velocityRange[1]);

      melody.push({
        note,
        duration: rhythm,
        velocity,
        time: i * 0.5, // Basic timing
        pitch: this.noteToPitch(note)
      });

      lastNoteIndex = noteIndex;
    }

    return melody;
  }

  generateHarmony(scale, progression, params) {
    const harmony = [];
    const chordsPerSection = 4;
    const sectionsNeeded = Math.ceil(params.duration / 8); // 8 seconds per section

    for (let section = 0; section < sectionsNeeded; section++) {
      for (let i = 0; i < chordsPerSection; i++) {
        const chordTemplate = progression[i % progression.length];
        const chord = chordTemplate.notes.map(noteIndex => {
          const octave = 3 + Math.floor(noteIndex / 7);
          return scale.notes[noteIndex % scale.notes.length] + octave;
        });

        harmony.push({
          chord,
          duration: '2n',
          time: (section * chordsPerSection + i) * 2,
          velocity: this.randomInRange(60, 90),
          chordName: chordTemplate.chord
        });
      }
    }

    return harmony;
  }

  generateBassLine(scale, progression, params) {
    const bassLine = [];
    const sectionsNeeded = Math.ceil(params.duration / 8);

    for (let section = 0; section < sectionsNeeded; section++) {
      for (let i = 0; i < 4; i++) {
        const chordTemplate = progression[i % progression.length];
        const rootNoteIndex = chordTemplate.notes[0];
        const bassNote = scale.notes[rootNoteIndex % scale.notes.length] + '2';

        bassLine.push({
          note: bassNote,
          duration: '2n',
          time: (section * 4 + i) * 2,
          velocity: this.randomInRange(70, 100),
          pitch: this.noteToPitch(bassNote)
        });
      }
    }

    return bassLine;
  }

  generateDrums(params) {
    const drums = [];
    const totalBeats = Math.floor((params.duration / 60) * params.tempo);

    for (let beat = 0; beat < totalBeats; beat++) {
      // Kick drum on beats 1 and 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        drums.push({
          instrument: 'kick',
          time: beat * 0.25,
          velocity: this.randomInRange(90, 127)
        });
      }

      // Snare on beats 2 and 4
      if (beat % 4 === 1 || beat % 4 === 3) {
        drums.push({
          instrument: 'snare',
          time: beat * 0.25,
          velocity: this.randomInRange(80, 110)
        });
      }

      // Hi-hat
      if (params.genre === 'electronic' || params.genre === 'rock') {
        drums.push({
          instrument: 'hihat',
          time: beat * 0.125,
          velocity: this.randomInRange(50, 80)
        });
      }
    }

    return drums;
  }

  chooseNextNote(lastIndex, scaleLength, mood) {
    let nextIndex;
    
    switch (mood.intervalJumps) {
      case 'small':
        nextIndex = lastIndex + this.randomChoice([-1, 0, 1]);
        break;
      case 'large':
        nextIndex = lastIndex + this.randomChoice([-3, -2, -1, 1, 2, 3]);
        break;
      case 'wide':
        nextIndex = lastIndex + this.randomChoice([-5, -4, -3, 3, 4, 5]);
        break;
      case 'smooth':
        nextIndex = lastIndex + this.randomChoice([-2, -1, 0, 1, 2]);
        break;
      default:
        nextIndex = Math.floor(Math.random() * scaleLength);
    }

    return Math.max(0, Math.min(scaleLength - 1, nextIndex));
  }

  generateStructure(params) {
    const structures = {
      classical: 'Exposition - Development - Recapitulation',
      jazz: 'Head - Solos - Head Out',
      pop: 'Verse - Chorus - Verse - Chorus - Bridge - Chorus',
      rock: 'Intro - Verse - Chorus - Verse - Chorus - Solo - Chorus',
      electronic: 'Intro - Build - Drop - Break - Build - Drop - Outro',
      ambient: 'Emergence - Evolution - Transformation - Resolution'
    };

    return structures[params.genre] || 'Intro - Development - Climax - Resolution';
  }

  generateTitle(params) {
    const genreTitles = {
      classical: ['Sonata', 'Prelude', 'Etude', 'Nocturne', 'Fantasy'],
      jazz: ['Blue Note', 'Swing Time', 'Cool Jazz', 'Bebop', 'Smooth'],
      pop: ['Summer Dreams', 'City Lights', 'Dancing Tonight', 'Heartbeat', 'Shine'],
      rock: ['Thunder Road', 'Electric Storm', 'Rock Anthem', 'Power Drive', 'Wild Fire'],
      electronic: ['Digital Dreams', 'Neon Nights', 'Synth Wave', 'Cyber Space', 'Future Pulse'],
      ambient: ['Ethereal Journey', 'Cosmic Drift', 'Peaceful Waters', 'Silent Dawn', 'Infinite Space']
    };

    const moodAdjectives = {
      happy: 'Joyful',
      sad: 'Melancholy',
      energetic: 'Dynamic',
      calm: 'Serene',
      mysterious: 'Enigmatic',
      romantic: 'Tender'
    };

    const baseTitles = genreTitles[params.genre] || ['Composition'];
    const baseTitle = baseTitles[Math.floor(Math.random() * baseTitles.length)];
    const moodPrefix = moodAdjectives[params.mood];

    return `${moodPrefix} ${baseTitle} in ${params.key}`;
  }

  // Utility methods
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  noteToPitch(note) {
    const noteMap = { 'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63, 'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68, 'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71 };
    const noteName = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));
    return noteMap[noteName] + (octave - 4) * 12;
  }
}

// Initialize AI Composer
const aiComposer = new AIComposer();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate music composition
app.post('/api/generate', async (req, res) => {
  try {
    const params = req.body;
    
    // Validate parameters
    if (!params.genre || !params.mood || !params.key) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Generating composition with params:', params);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const composition = aiComposer.generateComposition(params);
    
    res.json({
      success: true,
      composition,
      message: 'Composition generated successfully'
    });
  } catch (error) {
    console.error('Error generating composition:', error);
    res.status(500).json({ error: 'Failed to generate composition' });
  }
});

// Get composition by ID
app.get('/api/composition/:id', (req, res) => {
  const { id } = req.params;
  const composition = aiComposer.compositions.get(id);
  
  if (!composition) {
    return res.status(404).json({ error: 'Composition not found' });
  }
  
  res.json({ success: true, composition });
});

// Generate and download MIDI file
app.post('/api/download-midi/:id', (req, res) => {
  try {
    const { id } = req.params;
    const composition = aiComposer.compositions.get(id);
    
    if (!composition) {
      return res.status(404).json({ error: 'Composition not found' });
    }

    // Create MIDI file
    const track = new MidiWriter.Track();
    
    // Set tempo
    track.addEvent(new MidiWriter.TempoEvent({ 
      bpm: composition.metadata.tempo 
    }));

    // Add melody notes
    composition.melody.forEach(note => {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: note.pitch,
        duration: note.duration,
        velocity: note.velocity
      }));
    });

    // Add harmony (chords)
    composition.harmony.forEach(harmony => {
      const chordPitches = harmony.chord.map(note => 
        aiComposer.noteToPitch(note)
      );
      
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: chordPitches,
        duration: harmony.duration,
        velocity: harmony.velocity
      }));
    });

    const write = new MidiWriter.Writer(track);
    const midiBuffer = Buffer.from(write.buildFile());
    
    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('Content-Disposition', 
      `attachment; filename="${composition.title.replace(/\s+/g, '_')}.mid"`);
    res.send(midiBuffer);

  } catch (error) {
    console.error('Error generating MIDI:', error);
    res.status(500).json({ error: 'Failed to generate MIDI file' });
  }
});

// Get all compositions (for admin/debugging)
app.get('/api/compositions', (req, res) => {
  const compositions = Array.from(aiComposer.compositions.entries()).map(
    ([id, composition]) => ({ id, ...composition })
  );
  
  res.json({ success: true, compositions });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'AI Music Composer Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 AI Music Composer Backend running on port ${PORT}`);
  console.log(`🚀 Server started at ${new Date().toISOString()}`);
});
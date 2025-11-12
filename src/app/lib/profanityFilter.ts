// Simple profanity filter for college project
// List of common inappropriate words/phrases to filter
const PROFANITY_LIST = [
  // Common profanities (lowercase)
  'fuck', 'fucking', 'fucked', 'fucker',
  'shit', 'shitting', 'shitted',
  'damn', 'damned', 'dammit',
  'hell', 'hells',
  'ass', 'asses', 'asshole',
  'bitch', 'bitches', 'bitching',
  'bastard', 'bastards',
  'crap', 'crappy',
  'piss', 'pissing', 'pissed',
  'dick', 'dicks',
  'cock', 'cocks',
  'pussy', 'pussies',
  'whore', 'whores',
  'slut', 'sluts',
  'nigger', 'niggers', 'nigga', 'niggas', // Racial slurs
  'retard', 'retarded', 'retards',
  // Add more as needed
];

/**
 * Checks if text contains profanity
 * @param text - Text to check
 * @returns Object with isProfane boolean and matchedWords array
 */
export function checkProfanity(text: string): { isProfane: boolean; matchedWords: string[] } {
  if (!text || typeof text !== 'string') {
    return { isProfane: false, matchedWords: [] };
  }

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const matchedWords: string[] = [];

  // Check each word against profanity list
  for (const word of words) {
    // Remove punctuation for comparison
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    
    // Check for exact match or if the word contains a profanity as a whole word
    for (const profanity of PROFANITY_LIST) {
      // Exact match
      if (cleanWord === profanity) {
        if (!matchedWords.includes(profanity)) {
          matchedWords.push(profanity);
        }
        continue;
      }
      
      // Check if word contains profanity as a whole word (not just substring)
      // Use word boundaries to avoid false positives like "class" matching "ass"
      const wordBoundaryRegex = new RegExp(`\\b${profanity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(cleanWord)) {
        if (!matchedWords.includes(profanity)) {
          matchedWords.push(profanity);
        }
      }
    }
  }

  return {
    isProfane: matchedWords.length > 0,
    matchedWords,
  };
}

/**
 * Validates text and returns error message if profanity is detected
 * @param text - Text to validate
 * @returns Error message if profanity found, null otherwise
 */
export function validateText(text: string): string | null {
  const { isProfane, matchedWords } = checkProfanity(text);
  
  if (isProfane) {
    return `Please avoid using inappropriate language. Detected: ${matchedWords.join(', ')}`;
  }
  
  return null;
}


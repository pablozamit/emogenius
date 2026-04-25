export interface Challenge {
  id?: string;
  emoji: string;
  phrase: string;
  aliases?: string[];
  category: string;
  subcategory?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  totalAttempts?: number;
  totalSuccesses?: number;
  clue1?: string;
  clue2?: string;
  clue3?: string;
}

export interface ResponseLog {
  challengeId?: string;
  challengePhrase: string;
  userInput: string;
  isCorrect: boolean;
  similarity: number;
  score: number;
  mode: 'solo' | 'duo' | 'progressive';
  timestamp: any;
  userId?: string;
}

export interface TrainingTask {
  id?: string;
  phrase: string;
  category: string;
  subcategory?: string;
  optionA: string;
  optionB: string;
}

export interface Dispute {
  challengePhrase: string;
  userInput: string;
  score: number;
  reason: string;
  timestamp: any;
  userId?: string;
}

export interface LobbyPlayer {
  uid: string;
  name: string;
  joinedAt: any;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: string[];
  describerId?: string;
  guesserId?: string;
  targetPhrase?: string;
  targetAliases?: string[];
  targetCategory?: string;
  targetSubcategory?: string;
  currentEmojis?: string;
  score: number;
  createdAt: any;
  lastGuess?: string;
  lastGuessCorrect?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  photoURL?: string;
  soloHighscore: number;
}

// --- BATTLE 2V2 TYPES ---

export interface BattlePlayer {
  uid: string;
  name: string;
  photoURL?: string;
  ready: boolean;
  team?: number;
}

export interface BattleTeam {
  uids: string[];
  emojiBank: number;
  usedEmojis: number;
  totalTime: number;
  score: number;
}

export interface BattleGame {
  id: string;
  status: 'lobby' | 'playing' | 'finished';
  createdAt: any;
  players: Record<string, BattlePlayer>;
  teams: [BattleTeam, BattleTeam];
  gameState: {
    round: number;
    currentTeam: number;
    drawerId: string;
    guesserId: string;
    challenge: { phrase: string; category: string };
    turnStartTime: any;
    currentEmojis: string;
    lastGuess: string;
    blockedEmoji: string | null;
  };
  winnerTeam?: number;
}

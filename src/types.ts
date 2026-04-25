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

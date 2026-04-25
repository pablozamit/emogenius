import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { stringSimilarity } from 'string-similarity-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function normalizeString(str: string): string {
  return str.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "") // Keep spaces
    .replace(/\s+/g, " "); // Collapse multiple spaces
}

export function calculateSimilarityScore(input: string, target: string, aliases: string[] = []): { similarity: number, isCorrect: boolean, score: number } {
  const normalizedInput = normalizeString(input);
  const targets = [target, ...aliases];
  
  if (!normalizedInput) return { similarity: 0, isCorrect: false, score: 0 };
  
  let bestSimilarity = 0;
  
  for (const t of targets) {
    const normalizedTarget = normalizeString(t);
    if (!normalizedTarget) continue;
    
    // Exact match
    if (normalizedInput === normalizedTarget) {
      bestSimilarity = 1;
      break;
    }

    // Keyword match: if input contains the target or vice-versa (as whole words)
    const inputWords = normalizedInput.split(" ");
    const targetWords = normalizedTarget.split(" ");
    
    const containsTarget = targetWords.every(word => inputWords.includes(word));
    const isContained = inputWords.every(word => targetWords.includes(word));

    let currentSimilarity = stringSimilarity(normalizedInput, normalizedTarget);
    
    // Boost if it's a semantic subset (e.g., "arroz al curry" vs "curry")
    if (containsTarget || isContained) {
      currentSimilarity = Math.max(currentSimilarity, 0.9);
    }

    if (currentSimilarity > bestSimilarity) {
      bestSimilarity = currentSimilarity;
    }
  }
  
  const isCorrect = bestSimilarity >= 0.85;
  const score = Math.round(bestSimilarity * 100);
  
  return { similarity: bestSimilarity, isCorrect, score };
}

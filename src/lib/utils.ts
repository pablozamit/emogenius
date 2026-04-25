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
    .replace(/[^a-z0-9\s]/g, "") 
    .replace(/\s+/g, " ");
}

/**
 * Distancia de Levenshtein para tolerancia a typos
 */
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

export function calculateSimilarityScore(input: string, target: string, aliases: string[] = []): { similarity: number, isCorrect: boolean, score: number } {
  const normalizedInput = normalizeString(input);
  const targets = [target, ...aliases];
  
  if (!normalizedInput) return { similarity: 0, isCorrect: false, score: 0 };
  
  let bestSimilarity = 0;
  
  for (const t of targets) {
    const normalizedTarget = normalizeString(t);
    if (!normalizedTarget) continue;
    
    if (normalizedInput === normalizedTarget) {
      bestSimilarity = 1;
      break;
    }

    // Keyword logic
    const inputWords = normalizedInput.split(" ");
    const targetWords = normalizedTarget.split(" ");
    const containsAllTargetWords = targetWords.every(word => inputWords.includes(word));
    const isInsideTargetWords = inputWords.every(word => targetWords.includes(word));

    let currentSim = stringSimilarity(normalizedInput, normalizedTarget);
    
    // Levenshtein check: si el error es de solo 1 o 2 letras (según longitud)
    const distance = getLevenshteinDistance(normalizedInput, normalizedTarget);
    const maxAllowedDist = normalizedTarget.length > 6 ? 2 : 1;
    
    if (distance <= maxAllowedDist) {
      // Reemplazamos la similitud por un valor alto si es un typo leve
      currentSim = Math.max(currentSim, 0.85);
    }

    if (containsAllTargetWords || isInsideTargetWords) {
      currentSim = Math.max(currentSim, 0.9);
    }

    if (currentSim > bestSimilarity) {
      bestSimilarity = currentSim;
    }
  }
  
  // Umbral más permisivo (antes 0.85)
  const isCorrect = bestSimilarity >= 0.80;
  const score = Math.round(bestSimilarity * 100);
  
  return { similarity: bestSimilarity, isCorrect, score };
}

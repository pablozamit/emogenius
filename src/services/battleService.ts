import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  onSnapshot,
  Timestamp, 
  deleteDoc
} from 'firebase/firestore';
import { BattleGame, BattlePlayer, BattleTeam } from '../types';
import { INITIAL_CHALLENGES } from '../constants/challenges';

const BATTLES_COLLECTION = 'battles';

export const createBattle = async (user: any): Promise<string> => {
  const battleData: Partial<BattleGame> = {
    status: 'lobby',
    createdAt: serverTimestamp(),
    players: {
      [user.uid]: {
        uid: user.uid,
        name: user.displayName || 'Jugador',
        photoURL: user.photoURL || '',
        ready: false
      }
    },
    teams: [
      { uids: [], emojiBank: 30, usedEmojis: 0, totalTime: 0, score: 0 },
      { uids: [], emojiBank: 30, usedEmojis: 0, totalTime: 0, score: 0 }
    ],
    gameState: {
      round: 0,
      currentTeam: 0,
      drawerId: '',
      guesserId: '',
      challenge: { phrase: '', category: '' },
      turnStartTime: null,
      currentEmojis: '',
      lastGuess: '',
      blockedEmoji: null
    }
  };

  const docRef = await addDoc(collection(db, BATTLES_COLLECTION), battleData);
  return docRef.id;
};

export const joinBattle = async (battleId: string, user: any) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  const battleSnap = await getDoc(battleRef);

  if (!battleSnap.exists()) throw new Error('Partida no encontrada');
  
  const data = battleSnap.data() as BattleGame;
  if (Object.keys(data.players).length >= 4) throw new Error('Partida llena');

  await updateDoc(battleRef, {
    [`players.${user.uid}`]: {
      uid: user.uid,
      name: user.displayName || 'Jugador',
      photoURL: user.photoURL || '',
      ready: false
    }
  });
};

export const findPublicBattle = async (): Promise<string | null> => {
  const q = query(
    collection(db, BATTLES_COLLECTION), 
    where('status', '==', 'lobby')
  );
  const querySnapshot = await getDocs(q);
  
  // Encontrar la primera partida con menos de 4 jugadores
  for (const doc of querySnapshot.docs) {
    const data = doc.data() as BattleGame;
    if (Object.keys(data.players || {}).length < 4) {
      return doc.id;
    }
  }
  return null;
};

export const setReady = async (battleId: string, uid: string, ready: boolean) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  await updateDoc(battleRef, {
    [`players.${uid}.ready`]: ready
  });
};

export const startBattleGame = async (battleId: string) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  const snap = await getDoc(battleRef);
  const data = snap.data() as BattleGame;
  
  const uids = Object.keys(data.players);
  // Barajar jugadores y crear equipos al azar
  const shuffled = uids.sort(() => Math.random() - 0.5);
  
  const team0 = [shuffled[0], shuffled[1]];
  const team1 = [shuffled[2], shuffled[3]];

  // Seleccionar reto inicial
  const randomChallenge = INITIAL_CHALLENGES[Math.floor(Math.random() * INITIAL_CHALLENGES.length)];

  await updateDoc(battleRef, {
    status: 'playing',
    teams: [
      { uids: team0, emojiBank: 30, usedEmojis: 0, totalTime: 0, score: 0 },
      { uids: team1, emojiBank: 30, usedEmojis: 0, totalTime: 0, score: 0 }
    ],
    'gameState.round': 1,
    'gameState.currentTeam': Math.floor(Math.random() * 2),
    'gameState.drawerId': team0[0], // Luego se ajusta segun equipo elegido
    'gameState.guesserId': team0[1],
    'gameState.challenge': { phrase: randomChallenge.phrase, category: randomChallenge.category },
    'gameState.turnStartTime': serverTimestamp(),
    'gameState.currentEmojis': '',
    'gameState.lastGuess': ''
  });

  // Ajuste fino del primer turno
  const freshSnap = await getDoc(battleRef);
  const freshData = freshSnap.data() as BattleGame;
  const currentTeamIdx = freshData.gameState.currentTeam;
  const activeTeamUids = freshData.teams[currentTeamIdx].uids;
  
  await updateDoc(battleRef, {
    'gameState.drawerId': activeTeamUids[0],
    'gameState.guesserId': activeTeamUids[1]
  });
};

export const updateEmojis = async (battleId: string, emojis: string) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  await updateDoc(battleRef, {
    'gameState.currentEmojis': emojis
  });
};

export const checkGuess = async (battleId: string, guess: string) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  const snap = await getDoc(battleRef);
  const data = snap.data() as BattleGame;
  
  const isCorrect = guess.toLowerCase().trim() === data.gameState.challenge.phrase.toLowerCase().trim();
  
  if (isCorrect) {
    const emojisUsed = (data.gameState.currentEmojis.match(/\p{Emoji}/gu) || []).length;
    const teamIdx = data.gameState.currentTeam;
    const currentTeam = data.teams[teamIdx];
    
    // Calcular tiempo
    const startTime = data.gameState.turnStartTime.toDate();
    const duration = (new Date().getTime() - startTime.getTime()) / 1000;

    let emojiBonus = 0;
    if (emojisUsed === 1) emojiBonus = 2;

    const newScore = currentTeam.score + 1;
    const newUsedEmojis = currentTeam.usedEmojis + emojisUsed;
    const newEmojiBank = Math.max(1, currentTeam.emojiBank - emojisUsed + emojiBonus);
    
    const nextRound = data.gameState.round + 1;
    
    if (nextRound > 12) {
      // Fin de partida - determinar ganador
      // (Lógica de victoria aquí o en un hook dedicado)
      await updateDoc(battleRef, {
        status: 'finished',
        [`teams.${teamIdx}.score`]: newScore,
        [`teams.${teamIdx}.usedEmojis`]: newUsedEmojis,
        [`teams.${teamIdx}.totalTime`]: currentTeam.totalTime + duration,
        [`teams.${teamIdx}.emojiBank`]: newEmojiBank
      });
    } else {
      // Siguiente turno
      const nextTeamIdx = 1 - teamIdx;
      const nextTeam = data.teams[nextTeamIdx];
      
      // Rotar roles dentro del equipo siguiente
      const nextRoundForTeam = Math.floor((nextRound - 1) / 2);
      const drawerIdx = nextRoundForTeam % 2; 
      
      const nextChallenge = INITIAL_CHALLENGES[Math.floor(Math.random() * INITIAL_CHALLENGES.length)];

      await updateDoc(battleRef, {
        'gameState.round': nextRound,
        'gameState.currentTeam': nextTeamIdx,
        'gameState.drawerId': nextTeam.uids[drawerIdx],
        'gameState.guesserId': nextTeam.uids[1 - drawerIdx],
        'gameState.challenge': { phrase: nextChallenge.phrase, category: nextChallenge.category },
        'gameState.turnStartTime': serverTimestamp(),
        'gameState.currentEmojis': '',
        'gameState.lastGuess': '',
        'gameState.blockedEmoji': null,
        [`teams.${teamIdx}.score`]: newScore,
        [`teams.${teamIdx}.usedEmojis`]: newUsedEmojis,
        [`teams.${teamIdx}.totalTime`]: currentTeam.totalTime + duration,
        [`teams.${teamIdx}.emojiBank`]: newEmojiBank
      });
    }
  } else {
    await updateDoc(battleRef, {
      'gameState.lastGuess': guess
    });
  }
};

export const appySabotage = async (battleId: string, teamIndex: number, blockedEmoji: string) => {
  const battleRef = doc(db, BATTLES_COLLECTION, battleId);
  const snap = await getDoc(battleRef);
  const data = snap.data() as BattleGame;
  
  const team = data.teams[teamIndex];
  if (team.emojiBank < 2) return;

  await updateDoc(battleRef, {
    [`teams.${teamIndex}.emojiBank`]: team.emojiBank - 2,
    'gameState.blockedEmoji': blockedEmoji
  });
};

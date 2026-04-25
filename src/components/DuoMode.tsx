import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, Send, Smile, Info, RefreshCcw, LogOut, Check, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, onSnapshot, doc, serverTimestamp, deleteDoc, limit, orderBy, increment } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Room, Challenge, ResponseLog } from '../types';
import { INITIAL_CHALLENGES } from '../constants/challenges';
import { shuffleArray, cn, calculateSimilarityScore } from '../lib/utils';
import confetti from 'canvas-confetti';
import EmojiPicker from './EmojiPicker';

interface DuoModeProps {
  user: FirebaseUser;
  challenges: Challenge[];
  onBack: () => void;
}

export default function DuoMode({ user, onBack, challenges: allChallenges }: DuoModeProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const logResponse = async (phrase: string, input: string, isCorrect: boolean, similarity: number, score: number) => {
    try {
      const responseLog: ResponseLog = {
        challengePhrase: phrase,
        userInput: input,
        isCorrect,
        similarity,
        score,
        mode: 'duo',
        timestamp: serverTimestamp(),
        userId: user.uid
      };
      await addDoc(collection(db, 'responses'), responseLog);
    } catch (error) {
      console.error("Error logging duo response:", error);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'), 
      where('players', 'array-contains', user.uid),
      where('status', '!=', 'finished')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const roomDoc = snapshot.docs[0];
        setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
        setSearching(false);
      } else if (!searching) {
        setRoom(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, searching]);

  const joinOrCreateMatch = async () => {
    setSearching(true);
    try {
      const q = query(
        collection(db, 'rooms'), 
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'asc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const roomDoc = snapshot.docs[0];
        const roomData = roomDoc.data();
        if (roomData.players.includes(user.uid)) return;

        const players = [...roomData.players, user.uid];
        const challengeRes = allChallenges.length > 0 ? shuffleArray(allChallenges) : shuffleArray(INITIAL_CHALLENGES);
        const challenge = challengeRes[0];

        await updateDoc(roomDoc.ref, {
          players,
          status: 'playing',
          describerId: roomData.players[0],
          guesserId: user.uid,
          targetPhrase: challenge.phrase,
          targetAliases: challenge.aliases || [],
          targetCategory: challenge.category,
          targetSubcategory: challenge.subcategory || '',
          score: 0,
          currentEmojis: ''
        });
      } else {
        await addDoc(collection(db, 'rooms'), {
          players: [user.uid],
          status: 'waiting',
          createdAt: serverTimestamp(),
          score: 0
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rooms');
    }
  };

  const handleLeaveRoom = async () => {
    if (!room) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), { status: 'finished' });
      setRoom(null);
    } catch (e) {
      console.error(e);
    }
  };

  const skipChallenge = async () => {
    if (!room || room.describerId !== user.uid) return;
    const challengeRes = allChallenges.length > 0 ? shuffleArray(allChallenges) : shuffleArray(INITIAL_CHALLENGES);
    const nextChallenge = challengeRes[0];
    await updateDoc(doc(db, 'rooms', room.id), {
      targetPhrase: nextChallenge.phrase,
      targetAliases: nextChallenge.aliases || [],
      targetCategory: nextChallenge.category,
      targetSubcategory: nextChallenge.subcategory || '',
      currentEmojis: '',
      lastGuess: null,
      lastGuessCorrect: null
    });
  };

  const handleSendEmojis = async () => {
    if (!room || !emojiInput.trim()) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      currentEmojis: emojiInput.trim(),
      lastGuess: null
    });
    setEmojiInput('');
  };

  const handleGuess = async (e: FormEvent) => {
    e.preventDefault();
    if (!room || !guessInput.trim()) return;

    const result = calculateSimilarityScore(guessInput, room.targetPhrase || '', room.targetAliases || []);
    
    // Log async
    logResponse(room.targetPhrase || '', guessInput, result.isCorrect, result.similarity, result.score);

    if (result.isCorrect) {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 }
      });

      const challengeRes = allChallenges.length > 0 ? shuffleArray(allChallenges) : shuffleArray(INITIAL_CHALLENGES);
      const nextChallenge = challengeRes[0];
      await updateDoc(doc(db, 'rooms', room.id), {
        score: increment(result.score),
        describerId: room.guesserId,
        guesserId: room.describerId,
        targetPhrase: nextChallenge.phrase,
        targetAliases: nextChallenge.aliases || [],
        targetCategory: nextChallenge.category,
        targetSubcategory: nextChallenge.subcategory || '',
        currentEmojis: '',
        lastGuess: `${guessInput} (${result.score} pts)`,
        lastGuessCorrect: true
      });
    } else {
      await updateDoc(doc(db, 'rooms', room.id), {
        lastGuess: `${guessInput} (${result.score} pts)`,
        lastGuessCorrect: false
      });
    }
    setGuessInput('');
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Cargando...</div>;

  if (!room) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[32px] shadow-[8px_8px_0px_0px_#FFCD4B] border-4 border-[#2D2D2D]"
      >
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h3 className="text-3xl font-black uppercase tracking-tighter italic">Duelo Dúo</h3>
        </div>

        <div className="text-center py-12 bg-[#F3F3F3] border-4 border-dashed border-[#CCCCCC] rounded-3xl">
          {searching ? (
            <>
              <div className="relative mb-8 flex justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-[#00D1FF] rounded-full filter blur-2xl opacity-20"
                />
                <div className="w-24 h-24 bg-[#00D1FF] border-4 border-[#2D2D2D] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#2D2D2D] relative z-10">
                  <Users className="w-12 h-12 text-white" />
                </div>
              </div>
              <h4 className="text-2xl font-black mb-2 uppercase tracking-tighter">Buscando Pareja...</h4>
              <p className="text-slate-500 mb-8 font-bold text-sm">Emparejando con otro aventurero.</p>
              <button 
                onClick={() => setSearching(false)}
                className="text-[#FF4B91] font-black uppercase text-xs tracking-widest hover:underline"
              >
                Cancelar búsqueda
              </button>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-white border-4 border-[#2D2D2D] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[4px_4px_0px_0px_#FFCD4B]">
                <Users className="w-12 h-12 text-[#00D1FF]" />
              </div>
              <h4 className="text-2xl font-black mb-2 uppercase tracking-tighter">Cooperación Total</h4>
              <p className="text-slate-500 mb-10 max-w-xs mx-auto font-bold text-sm">
                Uno describe, el otro adivina. <br/> ¡Sincronizad vuestros emojis!
              </p>
              <button 
                onClick={joinOrCreateMatch}
                className="bg-[#00D1FF] text-[#2D2D2D] font-black py-5 px-12 rounded-2xl text-xl uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[6px_6px_0px_0px_#2D2D2D] border-4 border-[#2D2D2D]"
              >
                Entrar en Cola
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  if (room.status === 'waiting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#00D1FF]">
        <motion.div 
          animate={{ rotate: [-5, 5, -5] }} 
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-24 h-24 bg-[#FFCD4B] border-4 border-[#2D2D2D] rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#2D2D2D]"
        >
          <Users className="w-12 h-12 text-[#2D2D2D]" />
        </motion.div>
        <h3 className="text-4xl font-black uppercase tracking-tighter italic">Sala de Espera</h3>
        <p className="text-slate-500 mt-4 font-bold">Esperando a tu compañero de aventuras...</p>
        <button 
          onClick={handleLeaveRoom}
          className="mt-12 flex items-center gap-2 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-[#FF4B91] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Abandonar Sala
        </button>
      </div>
    );
  }

  const isDescriber = room.describerId === user.uid;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button onClick={handleLeaveRoom} className="p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all group">
          <LogOut className="w-6 h-6 text-slate-400 group-hover:text-[#FF4B91]" />
        </button>
        <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl border-4 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#FF4B91]">
          <div className="flex flex-col items-center border-r-4 border-[#2D2D2D] pr-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos</span>
            <span className="font-black text-2xl italic tracking-tighter">{room.score}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("w-4 h-4 rounded-full animate-pulse border-2 border-[#2D2D2D]", isDescriber ? "bg-[#FF4B91]" : "bg-[#00D1FF]")} />
            <span className="text-xs font-black text-[#2D2D2D] uppercase tracking-widest">
              {isDescriber ? 'DESCRIBE' : 'ADIVINA'}
            </span>
          </div>
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <div className="flex-1 flex flex-col gap-8">
        {/* Game Board */}
        <div className="bg-white rounded-[40px] shadow-[8px_8px_0px_0px_#2D2D2D] border-4 border-[#2D2D2D] p-10 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
          {/* Status Label */}
          <AnimatePresence>
            {room.lastGuess && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute top-8 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border-2 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D]",
                  room.lastGuessCorrect ? "bg-green-400 text-white" : "bg-[#FF4B91] text-white"
                )}
              >
                Intento: "{room.lastGuess}"
              </motion.div>
            )}
          </AnimatePresence>

          {isDescriber ? (
            <div className="text-center w-full">
              <div className="flex justify-center gap-2 mb-4">
                <span className="bg-[#FFCD4B] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                  {room.targetCategory}
                </span>
                {room.targetSubcategory && (
                  <span className="bg-[#00D1FF] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                    {room.targetSubcategory}
                  </span>
                )}
              </div>
              <h2 className="text-4xl font-black text-[#2D2D2D] mb-10 italic uppercase tracking-tighter leading-none tracking-tight">"{room.targetPhrase}"</h2>
              
              <div className="bg-[#F3F3F3] p-10 rounded-[32px] border-4 border-dashed border-[#CCCCCC] mb-2">
                <span className="text-8xl sm:text-9xl block drop-shadow-[6px_6px_0px_rgba(0,0,0,0.1)] font-emoji">
                  {room.currentEmojis || '🤔'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Transmitiendo al compañero...</p>
            </div>
          ) : (
            <div className="text-center w-full">
              <div className="flex justify-center gap-2 mb-6">
                <span className="bg-[#FFCD4B] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                  {room.targetCategory}
                </span>
                {room.targetSubcategory && (
                  <span className="bg-[#00D1FF] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                    {room.targetSubcategory}
                  </span>
                )}
              </div>
              <motion.span 
                key={room.currentEmojis}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl sm:text-10xl block drop-shadow-[8px_8px_0px_rgba(0,0,0,0.05)] mb-4 font-emoji"
              >
                {room.currentEmojis || '...'}
              </motion.span>
              <p className="text-sm text-slate-400 font-black italic uppercase tracking-widest">Interpretación requerida</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-white p-8 rounded-[32px] shadow-[8px_8px_0px_0px_#FFCD4B] border-4 border-[#2D2D2D]">
          {isDescriber ? (
            <div className="space-y-4">
              <div className="flex gap-4 relative">
                <input 
                  type="text"
                  value={emojiInput}
                  onChange={(e) => setEmojiInput(e.target.value)}
                  placeholder="Señal de emojis..."
                  className="flex-1 bg-[#F3F3F3] border-4 border-[#2D2D2D] rounded-2xl px-6 py-5 text-3xl outline-none focus:bg-white transition-all font-black font-emoji"
                />
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "p-6 border-4 border-[#2D2D2D] rounded-2xl transition-all",
                    showEmojiPicker ? "bg-[#FFCD4B]" : "bg-white"
                  )}
                >
                  <Smile className="w-8 h-8" />
                </button>
                <button 
                  onClick={handleSendEmojis}
                  disabled={!emojiInput.trim()}
                  className="bg-[#FF4B91] text-white p-6 rounded-2xl border-4 border-[#2D2D2D] shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-y-1 hover:shadow-none transition-all disabled:bg-slate-200"
                >
                  <Send className="w-8 h-8 fill-current" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-4 right-0 z-50">
                    <EmojiPicker 
                      onSelect={(emoji) => setEmojiInput(prev => prev + emoji)} 
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
              <button 
                onClick={skipChallenge}
                className="w-full text-[10px] font-black text-slate-400 hover:text-[#2D2D2D] transition-colors py-2 uppercase tracking-[0.3em]"
              >
                Cambiar frase secreta
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuess} className="space-y-4">
               <div className="flex gap-4 relative">
                <input 
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder={
                    room.targetCategory?.toLowerCase().includes('película') ? '¿Qué película es?' :
                    room.targetCategory?.toLowerCase().includes('refrán') ? '¿Qué refrán es?' :
                    room.targetCategory?.toLowerCase().includes('personaje') ? '¿Qué personaje es?' :
                    room.targetCategory?.toLowerCase().includes('ciudad') ? '¿Qué ciudad es?' :
                    room.targetCategory?.toLowerCase().includes('país') ? '¿Qué país es?' :
                    room.targetCategory?.toLowerCase().includes('canción') ? '¿Qué canción es?' :
                    '¿Qué es?'
                  }
                  className="flex-1 bg-[#F3F3F3] border-4 border-[#2D2D2D] rounded-2xl px-8 py-5 text-xl outline-none focus:bg-white transition-all font-black placeholder:text-slate-300 font-emoji"
                />
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "p-6 border-4 border-[#2D2D2D] rounded-2xl transition-all shadow-[6px_6px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none",
                    showEmojiPicker ? "bg-[#FFCD4B]" : "bg-white"
                  )}
                >
                  <Smile className="w-8 h-8" />
                </button>
                <button 
                  type="submit"
                  disabled={!guessInput.trim() || !room.currentEmojis}
                  className="bg-[#00D1FF] text-[#2D2D2D] p-6 rounded-2xl border-4 border-[#2D2D2D] shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-y-1 hover:shadow-none transition-all disabled:bg-slate-200"
                >
                  <Check className="w-8 h-8 stroke-[4px]" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-4 right-0 z-50">
                    <EmojiPicker 
                      onSelect={(emoji) => setGuessInput(prev => prev + emoji)} 
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-center">
          <div className="bg-white border-2 border-[#2D2D2D] px-6 py-2 rounded-full shadow-[4px_4px_0px_0px_#2D2D2D] text-[10px] text-[#2D2D2D] font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping border border-[#2D2D2D]" />
            Sincronización Activa
          </div>
        </div>
      </div>
    </div>
  );
}

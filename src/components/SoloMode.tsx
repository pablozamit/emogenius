import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, X, Trophy, RefreshCcw, Send, MessageSquare, AlertCircle, Smile } from 'lucide-react';
import { INITIAL_CHALLENGES } from '../constants/challenges';
import { Challenge, ResponseLog } from '../types';
import { shuffleArray, cn, calculateSimilarityScore } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import EmojiPicker from './EmojiPicker';

interface SoloModeProps {
  onBack: () => void;
  challenges: Challenge[];
}

export default function SoloMode({ onBack, challenges: allChallenges }: SoloModeProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [progressiveMode, setProgressiveMode] = useState(false);
  const [revealedEmojiCount, setRevealedEmojiCount] = useState(2);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'feedback' | 'finished'>('playing');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lastScore, setLastScore] = useState(0);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputed, setDisputed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(allChallenges.map(c => c.category)));

  const getEmojiUnits = (emojiStr: string) => {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(emojiStr)).map(s => s.segment);
    } catch (e) {
      return Array.from(emojiStr); 
    }
  };

  const handleStart = () => {
    let filtered = allChallenges;
    if (selectedCategories.length > 0) {
      filtered = allChallenges.filter(c => selectedCategories.includes(c.category));
    }
    const shuffled = shuffleArray(filtered).slice(0, 20);
    setChallenges(shuffled);
    setRevealedEmojiCount(2);
    setIsConfiguring(false);
  };

  useEffect(() => {
    if (!isConfiguring && gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConfiguring, gameState, currentIndex]);

  const logResponse = async (challenge: Challenge, input: string, isCorrect: boolean, similarity: number, score: number) => {
    try {
      const responseLog: ResponseLog = {
        challengePhrase: challenge.phrase,
        userInput: input,
        isCorrect,
        similarity,
        score,
        mode: progressiveMode ? 'progressive' : 'solo',
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous'
      };
      
      await addDoc(collection(db, 'responses'), responseLog);

      if (challenge.id) {
        const challengeRef = doc(db, 'challenges', challenge.id);
        await updateDoc(challengeRef, {
          totalAttempts: increment(1),
          totalSuccesses: isCorrect ? increment(1) : increment(0)
        });
      }
    } catch (error) {
      console.error("Error logging response:", error);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || gameState !== 'playing') return;
 
    const current = challenges[currentIndex];
    const result = calculateSimilarityScore(userInput, current.phrase, current.aliases || []);
    
    // Calculate final score with progressive mode penalty
    let finalScore = result.score;
    if (progressiveMode) {
      const units = getEmojiUnits(current.emoji);
      const hintCount = revealedEmojiCount - 2;
      const totalUnits = units.length;
      const penaltyFactor = totalUnits > 2 ? hintCount / (totalUnits - 2) : 0;
      // Max 40% reduction if all emojis are revealed
      finalScore = Math.round(result.score * (1 - (penaltyFactor * 0.4)));
    }

    setLastScore(finalScore);
    setTotalPoints(p => p + finalScore);
    setDisputed(false);
    setDisputeReason('');
    setShowDispute(false);
 
    if (result.isCorrect) {
      setSolvedCount(s => s + 1);
      setFeedback('correct');
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#EAB308', '#F97316']
      });
    } else {
      setFeedback('wrong');
    }
 
    setGameState('feedback');
    
    // Log async
    logResponse(current, userInput, result.isCorrect, result.similarity, finalScore);
    
    // We removed the auto-transition timer to allow manual progression
  };

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(i => i + 1);
      setRevealedEmojiCount(2);
      setUserInput('');
      setFeedback(null);
      setGameState('playing');
    } else {
      setGameState('finished');
    }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim() || !currentChallenge) return;
    
    try {
      await addDoc(collection(db, 'disputes'), {
        challengePhrase: currentChallenge.phrase,
        userInput: userInput,
        score: lastScore,
        reason: disputeReason,
        userId: auth.currentUser?.uid || 'anonymous',
        timestamp: serverTimestamp()
      });
      setDisputed(true);
      setShowDispute(false);
      // Removed auto-transition timer to allow manual progression via button
    } catch (e) {
      console.error("Error submitting dispute:", e);
    }
  };

  const currentChallenge = challenges[currentIndex];

  if (challenges.length === 0 && !isConfiguring) {
    return <div className="flex-1 flex items-center justify-center font-black uppercase italic text-slate-400">Cargando acertijos...</div>;
  }

  if (isConfiguring) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[32px] shadow-[8px_8px_0px_0px_#FFCD4B] border-4 border-[#2D2D2D]"
      >
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h3 className="text-2xl font-black uppercase tracking-tighter italic">Configura tu reto</h3>
        </div>

        <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest text-center">Selecciona Categorías</p>
        
        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={() => setSelectedCategories(categories)}
            className="text-[10px] font-black uppercase text-[#00D1FF] hover:underline"
          >
            Seleccionar todas
          </button>
          <span className="text-slate-300">|</span>
          <button 
            onClick={() => setSelectedCategories([])}
            className="text-[10px] font-black uppercase text-slate-400 hover:underline"
          >
            Deseleccionar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8 h-48 overflow-y-auto pr-2 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategories(prev => 
                prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
              )}
              className={cn(
                "p-4 rounded-2xl border-4 border-[#2D2D2D] font-black uppercase text-[10px] tracking-widest transition-all shadow-[4px_4px_0px_0px_#2D2D2D]",
                selectedCategories.includes(cat) ? "bg-[#FFCD4B]" : "bg-white opacity-60"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mb-8 p-6 bg-[#F3F3F3] rounded-[32px] border-4 border-[#2D2D2D] flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-xs font-black uppercase tracking-tight">Modo Progresivo</span>
             <span className="text-[9px] font-bold text-slate-500 uppercase">Empiezas con 2 emojis (Pistas reducen puntos)</span>
          </div>
          <button 
            onClick={() => setProgressiveMode(!progressiveMode)}
            className={cn(
              "w-12 h-6 rounded-full border-2 border-[#2D2D2D] relative transition-colors",
              progressiveMode ? "bg-[#00D1FF]" : "bg-white"
            )}
          >
            <motion.div 
              animate={{ x: progressiveMode ? 24 : 2 }}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#2D2D2D] rounded-full"
            />
          </button>
        </div>

        <button 
          onClick={handleStart}
          className="w-full bg-[#2D2D2D] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#FFCD4B]"
        >
          ¡EMPEZAR QUEST!
        </button>
      </motion.div>
    );
  }

  if (gameState === 'finished') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[32px] shadow-[8px_8px_0px_0px_#FF4B91] border-4 border-[#2D2D2D] text-center"
      >
        <Trophy className="w-20 h-20 text-[#FFCD4B] mx-auto mb-6" />
        <h3 className="text-4xl font-black mb-2 uppercase tracking-tighter">¡Juego Terminado!</h3>
        <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-sm">Puntuación Final</p>
        
        <div className="text-8xl font-black text-[#FF4B91] mb-2 italic tracking-tighter drop-shadow-[4px_4px_0px_#2D2D2D]">
          {solvedCount} <span className="text-3xl text-slate-300 not-italic">/ {challenges.length}</span>
        </div>
        <p className="text-xl font-black text-[#2D2D2D] mb-12 uppercase tracking-tight">
          Total: {totalPoints} Puntos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button 
            onClick={() => {
              setChallenges(shuffleArray(allChallenges).slice(0, 20));
              setCurrentIndex(0);
              setTotalPoints(0);
              setSolvedCount(0);
              setGameState('playing');
              setUserInput('');
            }}
            className="flex items-center justify-center gap-2 bg-white border-4 border-[#2D2D2D] text-[#2D2D2D] py-5 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#2D2D2D]"
          >
            <RefreshCcw className="w-5 h-5" />
            Reiniciar
          </button>
          <button 
            onClick={onBack}
            className="bg-[#2D2D2D] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#FF4B91]"
          >
            Menú Principal
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#FFFCF0] flex flex-col p-4 sm:p-6 md:p-8 h-screen overflow-hidden">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full min-h-0">
        <header className="flex items-center justify-between mb-4 shrink-0 px-2 leading-none">
          <button 
            onClick={onBack}
            className="p-2 sm:p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="text-center">
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Aventura</p>
            <p className="text-xl sm:text-2xl font-black italic tracking-tighter text-[#2D2D2D]">{currentIndex + 1} / {challenges.length}</p>
          </div>

          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest text-right mb-1">Puntos</p>
            <p className="text-xl sm:text-2xl font-black italic tracking-tighter text-[#FF4B91] uppercase">{totalPoints} PTS</p>
          </div>
        </header>

        <motion.div 
          layout
          className="flex-1 min-h-0 bg-white border-4 border-[#2D2D2D] rounded-[32px] sm:rounded-[40px] shadow-[8px_8px_0px_0px_#FFCD4B] relative overflow-hidden flex flex-col mb-4 sm:mb-6"
        >
          {/* Category Tags */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6 flex gap-2 z-30">
             <span className="bg-[#FFCD4B] text-[#2D2D2D] px-2 py-0.5 sm:px-4 sm:py-1 rounded-full font-black text-[7px] sm:text-[10px] uppercase border-2 border-[#2D2D2D]">
              {currentChallenge.category}
            </span>
            {currentChallenge.subcategory && (
              <span className="bg-[#00D1FF] text-[#2D2D2D] px-2 py-0.5 sm:px-4 sm:py-1 rounded-full font-black text-[7px] sm:text-[10px] uppercase border-2 border-[#2D2D2D]">
                {currentChallenge.subcategory}
              </span>
            )}
          </div>

          {/* Feedback Overlay inside the challenge box */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-white/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
              >
                <div className="w-full max-w-sm mx-auto flex flex-col items-center py-2">
                  {feedback === 'correct' ? (
                    <>
                      <div className="w-14 h-14 sm:w-24 sm:h-24 bg-green-100 rounded-2xl sm:rounded-3xl flex items-center justify-center border-4 border-green-500 mb-2 sm:mb-4">
                        <Check className="w-8 h-8 sm:w-16 sm:h-16 text-green-500 stroke-[4px]" />
                      </div>
                      <span className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-1 sm:mb-2 text-green-500">¡Sublime!</span>
                      <span className="text-base sm:text-xl font-black text-green-600 mb-1 sm:mb-2">+{lastScore} PTS</span>
                      <p className="text-[#2D2D2D] font-black text-xs sm:text-lg bg-[#FFCD4B] px-3 py-1 sm:px-4 sm:py-2 rounded-xl border-2 border-[#2D2D2D] uppercase tracking-wide">
                        {currentChallenge.phrase}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 sm:w-24 sm:h-24 bg-red-100 rounded-2xl sm:rounded-3xl flex items-center justify-center border-4 border-[#FF4B91] mb-2 sm:mb-4">
                        <X className="w-8 h-8 sm:w-16 sm:h-16 text-[#FF4B91] stroke-[4px]" />
                      </div>
                      <span className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-1 sm:mb-2 text-[#FF4B91]">¡Casi!</span>
                      <span className="text-base sm:text-xl font-black text-red-600 mb-0.5 sm:mb-1">{lastScore} Puntos <span className="text-[10px] sm:text-xs text-slate-400 font-normal tracking-normal">(Mín 85)</span></span>
                      <p className="text-[#2D2D2D] font-black text-xs sm:text-lg uppercase tracking-wide mb-2 sm:mb-4">Era: {currentChallenge.phrase}</p>

                      <div className="w-full flex flex-col gap-2">
                        {lastScore < 90 && !disputed && (
                          <div className="w-full">
                            {!showDispute ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDispute(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-white border-4 border-[#2D2D2D] py-2 rounded-xl font-black uppercase text-[8px] tracking-widest shadow-[3px_3px_0px_0px_#2D2D2D] active:translate-y-0.5 active:shadow-none transition-all"
                              >
                                <AlertCircle className="w-4 h-4" />
                                Discrepo con el resultado
                              </button>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#F3F3F3] p-3 rounded-2xl border-4 border-dashed border-[#CCCCCC] flex flex-col gap-2 text-left"
                              >
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#2D2D2D]">¿Por qué crees que el resultado es incorrecto?</p>
                                <textarea 
                                  value={disputeReason}
                                  onChange={(e) => setDisputeReason(e.target.value)}
                                  placeholder="Explica tu respuesta..."
                                  className="w-full bg-white border-2 border-[#2D2D2D] rounded-xl p-2 text-[10px] font-bold outline-none h-20 resize-none"
                                  autoFocus
                                />
                                <button 
                                  onClick={handleDisputeSubmit}
                                  disabled={!disputeReason.trim()}
                                  className="w-full bg-[#2D2D2D] text-white py-1.5 rounded-xl font-black uppercase text-[8px] tracking-widest disabled:opacity-50"
                                >
                                  Enviar mensaje
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {disputed && (
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center justify-center gap-2 text-green-600 font-black uppercase text-[8px] tracking-widest py-2"
                          >
                            <Check className="w-3 h-3" />
                            Mensaje enviado
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="mt-4 sm:mt-8 px-8 py-2.5 sm:px-10 sm:py-3 bg-[#2D2D2D] text-white rounded-xl font-black uppercase text-xs sm:text-base tracking-widest shadow-[4px_4px_0px_0px_#FFCD4B] hover:translate-y-1 hover:shadow-none transition-all active:scale-95 mb-2 shrink-0"
                  >
                    Siguiente
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col items-center justify-center w-full bg-[#F3F3F3] border-b-4 border-dashed border-[#CCCCCC] p-8 min-h-0">
            <span className="text-7xl sm:text-8xl md:text-9xl drop-shadow-[6px_6px_0px_rgba(0,0,0,0.1)] select-none font-emoji text-center leading-tight">
            {progressiveMode 
                ? getEmojiUnits(currentChallenge.emoji).slice(0, revealedEmojiCount).join('')
                : currentChallenge.emoji
              }
            </span>
            
            {progressiveMode && revealedEmojiCount < getEmojiUnits(currentChallenge.emoji).length && gameState === 'playing' && (
              <button 
                onClick={() => setRevealedEmojiCount(prev => prev + 1)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-[#FFCD4B] border-2 border-[#2D2D2D] rounded-full font-black text-[9px] sm:text-[11px] uppercase shadow-[4px_4px_0px_0px_#2D2D2D] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
              >
                💡 Pedir pista (-10% puntos)
              </button>
            )}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="shrink-0 flex gap-3 sm:gap-4 relative pb-4 sm:pb-6">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={gameState !== 'playing'}
            placeholder={
              currentChallenge?.category.toLowerCase().includes('película') ? '¿Qué película es?' :
              currentChallenge?.category.toLowerCase().includes('refrán') ? '¿Qué refrán es?' :
              currentChallenge?.category.toLowerCase().includes('personaje') ? '¿Qué personaje es?' :
              currentChallenge?.category.toLowerCase().includes('ciudad') ? '¿Qué ciudad es?' :
              currentChallenge?.category.toLowerCase().includes('país') ? '¿Qué país es?' :
              currentChallenge?.category.toLowerCase().includes('canción') ? '¿Qué canción es?' :
              '¿Qué es?'
            }
            className="flex-1 bg-white border-4 border-[#2D2D2D] rounded-2xl px-8 py-5 text-xl font-black placeholder:text-slate-300 focus:bg-[#FFFCF0] outline-none transition-all shadow-[6px_6px_0px_0px_#2D2D2D] disabled:opacity-50 font-emoji"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={gameState !== 'playing'}
            className={cn(
              "p-6 border-4 border-[#2D2D2D] rounded-2xl transition-all shadow-[6px_6px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none disabled:opacity-50",
              showEmojiPicker ? "bg-[#FFCD4B]" : "bg-white"
            )}
          >
            <Smile className="w-8 h-8" />
          </button>
          <button
            type="submit"
            disabled={gameState !== 'playing' || !userInput.trim()}
            className="bg-[#FF4B91] text-white p-6 aspect-square rounded-2xl hover:translate-y-1 hover:shadow-none disabled:bg-slate-300 border-4 border-[#2D2D2D] transition-all shadow-[6px_6px_0px_0px_#2D2D2D] active:scale-95 flex items-center justify-center"
          >
            <Send className="w-8 h-8 fill-current" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-4 right-0 z-50">
              <EmojiPicker 
                onSelect={(emoji) => {
                  setUserInput(prev => prev + emoji);
                  inputRef.current?.focus();
                }} 
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

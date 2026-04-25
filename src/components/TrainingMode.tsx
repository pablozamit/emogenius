import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, Check, ThumbsUp, Info, Smile } from 'lucide-react';
import { generateTrainingTask } from '../services/geminiService';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { TrainingTask } from '../types';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import EmojiPicker from './EmojiPicker';

interface TrainingModeProps {
  user: FirebaseUser;
  onBack: () => void;
}

export default function TrainingMode({ user, onBack }: TrainingModeProps) {
  const [task, setTask] = useState<TrainingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const [userIdea, setUserIdea] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fetchTask = async () => {
    setLoading(true);
    setVoted(false);
    setShowIdeaInput(false);
    setUserIdea("");
    const newTask = await generateTrainingTask();
    setTask(newTask);
    setLoading(false);
  };

  useEffect(() => {
    fetchTask();
  }, []);

  const handleVote = async (option: 'A' | 'B' | 'none' | 'user_idea', customIdea?: string) => {
    if (!task) return;
    
    setVoted(true);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 }
    });

    try {
      await addDoc(collection(db, 'training_votes'), {
        phrase: task.phrase,
        category: task.category,
        subcategory: task.subcategory || null,
        optionA: task.optionA,
        optionB: task.optionB,
        selected: option,
        userIdea: customIdea || null,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Vote failed", e);
    }

    setTimeout(() => {
      fetchTask();
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D]">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter italic">Laboratorio Emoji</h3>
          <p className="text-[10px] font-bold text-[#FF4B91] uppercase tracking-widest">Ayúdanos a entrenar la IA</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="mb-4"
            >
              <Sparkles className="w-12 h-12 text-[#FFCD4B]" />
            </motion.div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Consultando al Oráculo Emoji...</p>
          </motion.div>
        ) : !task ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-red-50 border-4 border-dashed border-red-200 rounded-3xl"
          >
            <p className="font-black text-red-400 uppercase tracking-widest text-xs mb-4">El Oráculo está descansando (Límite de cuota)</p>
            <button 
              onClick={fetchTask}
              className="bg-white border-4 border-[#2D2D2D] px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#2D2D2D] active:translate-y-1 active:shadow-none transition-all"
            >
              Reintentar ahora
            </button>
          </motion.div>
        ) : task ? (
          <motion.div
            key="task"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex-1 flex flex-col gap-6"
          >
            <div className="bg-white border-4 border-[#2D2D2D] rounded-[40px] p-10 shadow-[8px_8px_0px_0px_#FF4B91] text-center relative overflow-hidden">
               <div className="absolute top-6 left-6 flex gap-2">
                 <span className="bg-[#FFCD4B] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                  {task.category}
                </span>
                {task.subcategory && (
                  <span className="bg-[#00D1FF] text-[#2D2D2D] px-4 py-1 rounded-full font-black text-[10px] uppercase border-2 border-[#2D2D2D]">
                    {task.subcategory}
                  </span>
                )}
              </div>
              
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-6">Representación de Emojis</h4>
              <h2 className="text-4xl font-black text-[#2D2D2D] uppercase italic tracking-tighter mb-8 leading-none underline decoration-[#00D1FF] decoration-4 underline-offset-8">
                "{task.phrase}"
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <VoteButton 
                  label="Opción A" 
                  emoji={task.optionA} 
                  disabled={voted}
                  onClick={() => handleVote('A')} 
                />
                <VoteButton 
                  label="Opción B" 
                  emoji={task.optionB} 
                  disabled={voted}
                  onClick={() => handleVote('B')} 
                />
              </div>

              <AnimatePresence>
                {!showIdeaInput ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                  >
                    <button 
                      disabled={voted}
                      onClick={() => handleVote('none')}
                      className="px-6 py-3 border-4 border-[#2D2D2D] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_#2D2D2D] hover:bg-slate-50 disabled:opacity-50"
                    >
                      Ninguna es buena
                    </button>
                    <button 
                      disabled={voted}
                      onClick={() => setShowIdeaInput(true)}
                      className="px-6 py-3 bg-[#00D1FF] border-4 border-[#2D2D2D] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                    >
                      💡 Tengo una idea mejor
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col gap-4 items-center bg-[#F3F3F3] p-6 rounded-3xl border-4 border-dashed border-[#CCCCCC]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D2D2D]">Escribe tu secuencia de emojis</p>
                    <div className="flex w-full gap-2 relative">
                       <input 
                        type="text"
                        value={userIdea}
                        onChange={(e) => setUserIdea(e.target.value)}
                        placeholder="Ej: 🍕🐢🥋"
                        className="flex-1 bg-white border-4 border-[#2D2D2D] rounded-2xl px-6 py-4 text-2xl outline-none font-black font-emoji"
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={cn(
                          "p-4 border-4 border-[#2D2D2D] rounded-2xl transition-all",
                          showEmojiPicker ? "bg-[#FFCD4B]" : "bg-white"
                        )}
                      >
                        <Smile className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => handleVote('user_idea', userIdea)}
                        disabled={!userIdea.trim() || voted}
                        className="bg-[#FF4B91] text-white p-4 rounded-2xl border-4 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D] disabled:opacity-50"
                      >
                        <Check className="w-6 h-6 stroke-[4px]" />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-full mb-4 right-0 z-50">
                          <EmojiPicker 
                            onSelect={(emoji) => setUserIdea(prev => prev + emoji)} 
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-[#00D1FF]/10 border-4 border-dashed border-[#00D1FF] rounded-3xl p-6 flex items-start gap-4">
              <Info className="w-10 h-10 text-[#00D1FF] shrink-0" />
              <p className="text-sm font-bold text-[#004A5C]">
                Tus votos ayudan a que nuestra IA aprenda qué emojis son más representativos y variados para cada concepto.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function VoteButton({ label, emoji, onClick, disabled }: any) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group bg-white border-4 border-[#2D2D2D] p-8 rounded-[32px] shadow-[6px_6px_0px_0px_#2D2D2D] flex flex-col items-center gap-4 transition-all disabled:opacity-50",
        !disabled && "hover:bg-[#FFFCF0]"
      )}
    >
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-[#FF4B91] transition-colors">{label}</span>
      <span className="text-5xl drop-shadow-sm font-emoji">{emoji}</span>
      <div className="mt-2 w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-[#FF4B91] group-hover:bg-[#FF4B91]/10 transition-all">
        <ThumbsUp className="w-4 h-4 text-slate-200 group-hover:text-[#FF4B91]" />
      </div>
    </motion.button>
  );
}

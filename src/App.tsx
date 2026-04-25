import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, User, Play, Gamepad2, Info, Smile, Sparkles } from 'lucide-react';
import { auth, googleProvider, db, signInWithPopup } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs, doc, writeBatch, query, limit } from 'firebase/firestore';
import SoloMode from './components/SoloMode';
import DuoMode from './components/DuoMode';
import TrainingMode from './components/TrainingMode';
import { cn } from './lib/utils';
import { INITIAL_CHALLENGES } from './constants/challenges';
import { Challenge } from './types';

type GameMode = 'menu' | 'solo' | 'duo' | 'about';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mode, setMode] = useState<GameMode>('menu');
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initChallenges = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shouldClean = urlParams.get('clean') === 'true';
        const challengesCol = collection(db, 'challenges');

        if (shouldClean) {
          const snapshot = await getDocs(challengesCol);
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          window.location.href = window.location.origin;
          return;
        }

        const snapshot = await getDocs(challengesCol);
        const existingPhrases = new Set(snapshot.docs.map(d => `${d.data().phrase}_${d.data().category}`));
        
        const newChallenges = INITIAL_CHALLENGES.filter(c => !existingPhrases.has(`${c.phrase}_${c.category}`));
        
        if (newChallenges.length > 0) {
          const batch = writeBatch(db);
          newChallenges.forEach((c) => {
            const newDoc = doc(challengesCol);
            batch.set(newDoc, {
              ...c,
              totalAttempts: 0,
              totalSuccesses: 0
            });
          });
          await batch.commit();
        }
        
        const allSnapshot = await getDocs(collection(db, 'challenges'));
        const loaded = allSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
        setChallenges(loaded);
      } catch (error) {
        console.error("Error loading challenges:", error);
        setChallenges(INITIAL_CHALLENGES);
      }
    };

    if (!loading) {
      initChallenges();
    }
  }, [loading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Gamepad2 className="w-12 h-12 text-yellow-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF0] font-sans text-[#2D2D2D] selection:bg-[#FFCD4B] overflow-x-hidden">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-6xl rotate-12">🤔</div>
        <div className="absolute top-40 right-20 text-6xl -rotate-12">🍿</div>
        <div className="absolute bottom-20 left-1/4 text-6xl rotate-45">🎮</div>
        <div className="absolute top-1/2 right-1/4 text-6xl -rotate-6">🧩</div>
      </div>

      <main className="relative max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-16">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setMode('menu')}
          >
            <div className="w-14 h-14 bg-[#FF4B91] rounded-2xl flex items-center justify-center border-4 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D] rotate-[-3deg] group-hover:rotate-0 transition-transform">
              <span className="text-3xl">✨</span>
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#2D2D2D]">
                Emogenius
              </h1>
              <p className="text-sm font-bold text-[#FF4B91] uppercase tracking-widest leading-none">
                ¡Adivina el enigma!
              </p>
            </div>
          </motion.div>
          
          {user ? (
            <div className="flex items-center gap-3 bg-white border-4 border-[#2D2D2D] rounded-full px-4 py-2 shadow-[4px_4px_0px_0px_#2D2D2D]">
              <span className="hidden sm:inline text-sm font-black uppercase tracking-tighter">{user.displayName}</span>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border-2 border-[#2D2D2D]"
              />
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-[#00D1FF] border-4 border-[#2D2D2D] px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#2D2D2D]"
            >
              Conectarse
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col justify-center gap-12"
            >
              <div className="text-center">
                <h2 className="text-6xl sm:text-7xl font-black text-[#2D2D2D] mb-6 leading-none italic uppercase tracking-tighter">
                  ¡Aceptas el <br/> <span className="text-[#FF4B91] underline decoration-8 underline-offset-8">Desafío?</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-md mx-auto font-bold">
                  Deducción visual con emoticonos. ¿Puedes descifrar el mensaje?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <MenuButton 
                  icon={<User className="w-10 h-10" />}
                  title="MODO SOLO"
                  description={`${challenges.length} retos disponibles`}
                  color="bg-[#FFCD4B]"
                  shadow="shadow-[8px_8px_0px_0px_#2D2D2D]"
                  onClick={() => setMode('solo')}
                />
                <MenuButton 
                  icon={<Users className="w-10 h-10" />}
                  title="DUELO DUO"
                  description="Adivina en pareja"
                  color="bg-[#00D1FF]"
                  shadow="shadow-[8px_8px_0px_0px_#2D2D2D]"
                  onClick={() => user ? setMode('duo') : handleLogin()}
                />
              </div>

              <div className="flex justify-center">
                 <button 
                  onClick={() => user ? setMode('training') : handleLogin()}
                  className="bg-white border-4 border-[#2D2D2D] px-8 py-4 rounded-[32px] shadow-[6px_6px_0px_0px_#FF4B91] flex items-center gap-3 group hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <Smile className="w-8 h-8 text-[#FF4B91]" />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ayúdanos a mejorar</p>
                    <p className="text-lg font-black text-[#2D2D2D] uppercase tracking-tighter leading-none">LABORATORIO EMOJI</p>
                  </div>
                </button>
              </div>

              <div className="flex justify-center mt-4">
                <button 
                  onClick={() => setMode('about')}
                  className="flex items-center gap-2 text-[#2D2D2D] opacity-60 hover:opacity-100 font-black uppercase text-xs tracking-widest transition-opacity"
                >
                  <Info className="w-5 h-5" />
                  <span>¿Cómo funciona?</span>
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'solo' && (
            <motion.div key="solo" className="flex-1 flex flex-col">
              <SoloMode onBack={() => setMode('menu')} challenges={challenges} />
            </motion.div>
          )}

          {mode === 'duo' && (
            <motion.div key="duo" className="flex-1 flex flex-col">
              <DuoMode 
                user={user!} 
                onBack={() => setMode('menu')} 
                challenges={challenges} 
              />
            </motion.div>
          )}

          {mode === 'training' && (
            <motion.div key="training" className="flex-1 flex flex-col">
              <TrainingMode user={user!} onBack={() => setMode('menu')} />
            </motion.div>
          )}

          {mode === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-10 rounded-[32px] shadow-[8px_8px_0px_0px_#FF4B91] border-4 border-[#2D2D2D]"
            >
              <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">¿Cómo jugar?</h3>
              <div className="space-y-6 text-slate-600 font-bold">
                <p>
                  <strong className="text-[#2D2D2D] uppercase tracking-wide">Modo Solo:</strong> Responde 20 acertijos de emojis. ¡Intenta conseguir la mayor puntuación posible! Los aciertos rápidos valen más.
                </p>
                <p>
                  <strong className="text-[#2D2D2D] uppercase tracking-wide">En Parejas:</strong> Te emparejaremos con alguien al azar. Uno verá la frase secreta y deberá elegir emojis para que el otro la adivine.
                </p>
                <div className="p-6 bg-[#FFFCF0] rounded-2xl border-4 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#FFCD4B]">
                  <p className="font-black text-[#2D2D2D] mb-2 uppercase text-sm tracking-widest">Ejemplo:</p>
                  <p className="text-3xl">🤫🐑 = El silencio de los corderos</p>
                </div>
              </div>
              <button 
                onClick={() => setMode('menu')}
                className="mt-10 w-full bg-[#2D2D2D] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#FF4B91]"
              >
                ¡LISTO PARA JUGAR!
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-auto py-12 text-center text-[#2D2D2D]/40 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} Emoji Quest • Designed with Vibrant Palette
        </footer>
      </main>
    </div>
  );
}

function MenuButton({ icon, title, description, color, shadow, onClick }: any) {
  return (
    <motion.button
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden group p-8 rounded-[32px] flex flex-col items-start gap-6 border-4 border-[#2D2D2D] transition-transform",
        color,
        shadow
      )}
    >
      <div className="p-4 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D]">
        {icon}
      </div>
      <div className="text-left">
        <h3 className="text-2xl font-black text-[#2D2D2D] uppercase tracking-tighter leading-none mb-1">{title}</h3>
        <p className="font-bold opacity-70 text-sm uppercase tracking-wide">{description}</p>
      </div>
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <Play className="w-16 h-16 fill-current" />
      </div>
    </motion.button>
  );
}

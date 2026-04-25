import React, { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { BattleGame } from '../../types';
import { createBattle, findPublicBattle, joinBattle, setReady, startBattleGame } from '../../services/battleService';
import Lobby from './Lobby';
import MatchView from './MatchView';
import { Trophy, Swords, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Battle2v2: React.FC = () => {
  const [battle, setBattle] = useState<BattleGame | null>(null);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!battle?.id) return;

    const unsub = onSnapshot(doc(db, 'battles', battle.id), (doc) => {
      if (doc.exists()) {
        setBattle({ id: doc.id, ...doc.data() } as BattleGame);
      }
    });

    return () => unsub();
  }, [battle?.id]);

  useEffect(() => {
    if (!battle && user) {
      handleSearchGame();
    }
  }, [user]);

  const handleSearchGame = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const publicBattleId = await findPublicBattle();
      if (publicBattleId) {
        await joinBattle(publicBattleId, user);
        setBattle({ id: publicBattleId } as BattleGame);
      } else {
        const newId = await createBattle(user);
        setBattle({ id: newId } as BattleGame);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReady = async () => {
    if (battle && user) {
      const isReady = !battle.players[user.uid]?.ready;
      await setReady(battle.id, user.uid, isReady);
    }
  };

  // Autostart si todos estan listos y son 4
  useEffect(() => {
    if (battle?.status === 'lobby' && Object.keys(battle.players).length === 4) {
      const allReady = Object.values(battle.players).every(p => p.ready);
      if (allReady) {
        startBattleGame(battle.id);
      }
    }
  }, [battle]);

  if (!battle || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl p-12 rounded-[40px] border border-white/20 shadow-2xl max-w-md w-full relative overflow-hidden"
        >
          {/* Animated background effects */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-yellow-400/20"
          />

          <div className="relative z-10">
            <div className="bg-yellow-400 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-yellow-400/20 rotate-3">
              <Loader2 size={48} className="text-black animate-spin" />
            </div>
            
            <h2 className="text-4xl font-black text-white mb-2 italic tracking-tighter">BUSCANDO...</h2>
            <p className="text-white/60 mb-8 font-medium">
              Conectando con la red de EmoGenius para encontrar gladiadores...
            </p>

            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    y: [0, -10, 0],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity,
                    delay: i * 0.2 
                  }}
                  className="w-3 h-3 bg-yellow-400 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <AnimatePresence mode="wait">
        {battle.status === 'lobby' ? (
          <Lobby key="lobby" battle={battle} onReady={handleReady} />
        ) : (
          <MatchView key="playing" battle={battle} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Battle2v2;

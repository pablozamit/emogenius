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

  if (!battle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl max-w-md w-full text-center"
        >
          <div className="bg-yellow-400 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-400/20">
            <Swords size={40} className="text-black" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter">BATALLA 2V2</h2>
          <p className="text-white/70 mb-8 font-medium">
            Forma equipo con amigos o desconocidos en la prueba definitiva de ingenio con emojis. 30 emojis, 12 retos, una sola joya.
          </p>

          <button
            onClick={handleSearchGame}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xl flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Users size={24} />}
            {loading ? 'BUSCANDO...' : 'BUSCAR PARTIDA'}
          </button>
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

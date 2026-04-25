import React from 'react';
import { BattleGame } from '../../types';
import { auth } from '../../lib/firebase';
import { motion } from 'motion/react';
import { User, CheckCircle2, Circle, Share2, Crown } from 'lucide-react';

interface LobbyProps {
  battle: BattleGame;
  onReady: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ battle, onReady }) => {
  const currentUid = auth.currentUser?.uid;
  const playerIds = Object.keys(battle.players);
  const slots = [0, 1, 2, 3];

  const handleShare = () => {
    const url = `${window.location.origin}?join=${battle.id}`;
    navigator.clipboard.writeText(url);
    alert('¡Enlace de invitación copiado! Pásaselo a un amigo.');
  };

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="text-center">
        <h3 className="text-5xl font-black text-white italic mb-2 tracking-tighter">SALA DE ESPERA</h3>
        <p className="text-yellow-400 font-bold uppercase tracking-widest text-sm">
          {playerIds.length} / 4 JUGADORES
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {slots.map((i) => {
          const playerId = playerIds[i];
          const player = playerId ? battle.players[playerId] : null;

          return (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`relative h-48 rounded-3xl border-2 flex flex-col items-center justify-center gap-4 transition-all overflow-hidden
                ${player ? 'bg-white/10 border-yellow-400/50 shadow-xl shadow-yellow-400/5' : 'bg-black/20 border-white/10 border-dashed'}
              `}
            >
              {player ? (
                <>
                  {i === 0 && <Crown size={16} className="absolute top-4 left-4 text-yellow-400" />}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-1">
                    {player.photoURL ? (
                      <img src={player.photoURL} className="w-full h-full rounded-xl object-cover" alt={player.name} />
                    ) : (
                      <div className="w-full h-full bg-black rounded-xl flex items-center justify-center">
                        <User className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-center px-2">
                    <p className="text-white font-bold truncate max-w-[120px]">{player.name}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${player.ready ? 'bg-green-500 text-black' : 'bg-white/10 text-white/50'}`}>
                      {player.ready ? 'LISTO' : 'ESPERANDO'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-white/20">
                  <User size={32} />
                  <p className="text-xs font-bold mt-2">VACÍO</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={handleShare}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-all"
        >
          <Share2 size={20} /> INVITAR AMIGO
        </button>
        <button
          onClick={onReady}
          className={`flex-1 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl
            ${battle.players[currentUid!]?.ready 
              ? 'bg-green-500 text-black' 
              : 'bg-yellow-400 text-black hover:scale-[1.02]'}
          `}
        >
          {battle.players[currentUid!]?.ready ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          {battle.players[currentUid!]?.ready ? 'LISTO' : 'CONFIRMAR'}
        </button>
      </div>

      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 max-w-sm text-center">
        <p className="text-white/40 text-[10px] font-medium leading-relaxed">
          * La partida comenzará automáticamente cuando los 4 espacios estén llenos y todos los jugadores hayan confirmado.
        </p>
      </div>
    </div>
  );
};

export default Lobby;

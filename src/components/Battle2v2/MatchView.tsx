import React, { useState, useEffect } from 'react';
import { BattleGame, BattleTeam } from '../../types';
import { auth } from '../../lib/firebase';
import { updateEmojis, checkGuess, appySabotage } from '../../services/battleService';
import EmojiPicker from '../EmojiPicker';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Zap, ShieldAlert, Send, Ghost, Trophy, Search } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchViewProps {
  battle: BattleGame;
}

const MatchView: React.FC<MatchViewProps> = ({ battle }) => {
  const user = auth.currentUser;
  const game = battle.gameState;
  const myTeamIdx = battle.teams?.findIndex(t => t.uids.includes(user?.uid || '')) ?? -1;
  const myTeam = battle.teams ? battle.teams[myTeamIdx] : null;

  if (myTeamIdx === -1 || !myTeam || !game) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
         <Loader2 className="text-yellow-400 animate-spin" size={48} />
      </div>
    );
  }

  const rivalTeamIdx = 1 - myTeamIdx;
  const rivalTeam = battle.teams[rivalTeamIdx];
  
  const isMyTeamTurn = game.currentTeam === myTeamIdx;
  const amIDrawer = game.drawerId === user?.uid;
  const amIGuesser = game.guesserId === user?.uid;
  
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);

  // Temporizador local (visual)
  useEffect(() => {
    if (game.turnStartTime) {
      const interval = setInterval(() => {
        const start = game.turnStartTime.toDate().getTime();
        const now = new Date().getTime();
        const diff = Math.floor(60 - (now - start) / 1000);
        setTimeLeft(Math.max(0, diff));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [game.turnStartTime]);

  const handleEmojiSelect = (emoji: string) => {
    if (!amIDrawer || !isMyTeamTurn) return;
    if (emoji === game.blockedEmoji) return;
    
    // Contar emojis actuales
    const currentCount = (game.currentEmojis.match(/\p{Emoji}/gu) || []).length;
    
    // Regla de economía: limite de 29 hasta la ronda 6
    if (game.round <= 6 && myTeam.usedEmojis + currentCount >= 29) {
       alert("¡Economía crítica! Debes guardar emojis para el final.");
       return;
    }
    
    if (myTeam.usedEmojis + currentCount >= myTeam.emojiBank) return;

    updateEmojis(battle.id, game.currentEmojis + emoji);
  };

  const onGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amIGuesser || !isMyTeamTurn || !guess.trim()) return;
    checkGuess(battle.id, guess);
    setGuess('');
  };

  const onSabotage = (emoji: string) => {
    if (isMyTeamTurn) return; // Solo el espectador sabotea
    appySabotage(battle.id, myTeamIdx, emoji);
  };

  return (
    <div className="flex flex-col h-[85vh] gap-4">
      {/* Header Central de Estado */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="text-[10px] font-black text-white/40 uppercase">RONDA</p>
            <p className="text-2xl font-black text-white italic">{game.round} <span className="text-white/20">/ 12</span></p>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <TeamStat name="TU EQUIPO" team={myTeam} isActive={isMyTeamTurn} accent="yellow" />
           <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-2xl
             ${timeLeft < 10 ? 'border-red-500 animate-pulse text-red-500' : 'border-yellow-400 text-white'}
           `}>
             {timeLeft}
           </div>
           <TeamStat name="RIVALES" team={rivalTeam} isActive={!isMyTeamTurn} accent="red" />
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* PANEL PRINCIPAL (70%) */}
        <div className="flex-[0.7] flex flex-col gap-4">
          <div className={`flex-1 rounded-[2.5rem] border-4 relative overflow-hidden transition-all duration-500 flex flex-col
            ${isMyTeamTurn ? 'bg-gradient-to-b from-blue-900 to-black border-blue-500' : 'bg-black/60 border-white/10'}
          `}>
            {/* Overlay de Rol */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <span className="bg-blue-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/20">
                {isMyTeamTurn ? (amIDrawer ? '🎨 DIBUJANTE' : '🔍 ADIVINADOR') : '👀 ESPECTADOR'}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              {amIDrawer && isMyTeamTurn ? (
                <div className="space-y-8 w-full max-w-sm">
                  <div className="space-y-1">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest">TU CONCEPTO ES:</p>
                    <h4 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-tight">
                      {game.challenge.phrase}
                    </h4>
                  </div>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 min-h-[140px] flex items-center justify-center text-8xl">
                    {game.currentEmojis || '...'}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 w-full max-w-md">
                   <div className="bg-white/5 p-12 rounded-[3rem] border-2 border-white/10 relative">
                     {game.blockedEmoji && (
                       <div className="absolute -top-4 -right-4 bg-red-600 text-white p-2 rounded-2xl animate-bounce shadow-xl">
                          <ShieldAlert size={24} />
                       </div>
                     )}
                     <p className="text-8xl mb-4">{game.currentEmojis || '🤔'}</p>
                     {!isMyTeamTurn && (
                       <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
                         Rival dibujando: <span className="text-white">{game.challenge.phrase}</span>
                       </p>
                     )}
                   </div>
                   
                   {amIGuesser && isMyTeamTurn && (
                     <form onSubmit={onGuessSubmit} className="relative group">
                       <input 
                         autoFocus
                         value={guess}
                         onChange={(e) => setGuess(e.target.value)}
                         placeholder="TU RESPUESTA..."
                         className="w-full bg-white/10 border-2 border-white/20 p-6 rounded-3xl text-white text-2xl font-black focus:border-blue-400 focus:outline-none transition-all placeholder:text-white/20 pr-20"
                       />
                       <button type="submit" className="absolute right-3 top-3 bottom-3 aspect-square bg-blue-500 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform">
                          <Send size={24} className="text-black" />
                       </button>
                     </form>
                   )}

                   {game.lastGuess && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       key={game.lastGuess}
                       className="bg-red-500/10 text-red-400 font-bold px-4 py-2 rounded-xl border border-red-500/20 inline-block"
                     >
                       ❌ {game.lastGuess}
                     </motion.div>
                   )}
                </div>
              )}
            </div>

            {/* Teclado para Dibujante */}
            {amIDrawer && isMyTeamTurn && (
               <div className="h-64 bg-black/80 backdrop-blur-md border-t border-white/10">
                 <EmojiPicker onSelect={handleEmojiSelect} />
               </div>
            )}
          </div>
        </div>

        {/* PANEL RIVAL (30%) */}
        <div className="flex-[0.3] flex flex-col gap-4">
           {/* Vista Rival */}
           <div className="flex-1 bg-black/40 rounded-[2.5rem] border border-white/5 p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                  <Ghost size={12} /> EQUIPO RIVAL
                </span>
                <div className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-red-500 uppercase">EN VIVO</span>
                </div>
              </div>

              <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 p-4 flex items-center justify-center text-4xl">
                 {!isMyTeamTurn ? (
                   <div className="text-center">
                     <p className="text-xs text-white/30 font-bold mb-4">SUS EMOJIS</p>
                     <p className="tracking-tighter">{game.currentEmojis || '✏️'}</p>
                   </div>
                 ) : (
                   <Zap className="text-white/10" size={48} />
                 )}
              </div>

              {/* Controles de Sabotaje */}
              {!isMyTeamTurn && (
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-white/50 uppercase text-center flex items-center justify-center gap-2">
                     <ShieldAlert size={12} /> SABOTAJE (-2 EMOJIS)
                   </p>
                   <div className="grid grid-cols-5 gap-2">
                      {['🚫', '🚢', '🧊', '🦁', '👑', '🃏', '🤡', '💀', '🧟', '🥊'].map(e => (
                        <button 
                          key={e}
                          onClick={() => onSabotage(e)}
                          className="bg-white/5 hover:bg-red-500/20 aspect-square rounded-xl flex items-center justify-center text-lg filter grayscale hover:grayscale-0 transition-all border border-white/5"
                        >
                          {e}
                        </button>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const TeamStat: React.FC<{ name: string, team: BattleTeam, isActive: boolean, accent: 'yellow' | 'red' }> = ({ name, team, isActive, accent }) => {
  const colors = {
    yellow: { bg: 'bg-yellow-400', text: 'text-yellow-400', shadow: 'shadow-yellow-400/20' },
    red: { bg: 'bg-red-500', text: 'text-red-500', shadow: 'shadow-red-500/20' }
  };
  const c = colors[accent];

  return (
    <div className={`transition-all duration-500 ${isActive ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
       <p className={`text-[10px] font-black uppercase tracking-widest text-center mb-1 ${c.text}`}>{name}</p>
       <div className={`flex items-center gap-4 bg-white/5 p-3 rounded-2xl border-2 ${isActive ? (accent === 'yellow' ? 'border-yellow-400' : 'border-red-500') : 'border-transparent'}`}>
          <div className="text-center min-w-[50px]">
            <p className="text-[8px] font-bold text-white/40">SCORE</p>
            <p className="text-xl font-black text-white">{team.score}</p>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="text-center min-w-[50px]">
             <p className="text-[8px] font-bold text-white/40">BANK</p>
             <div className="flex items-center gap-1 justify-center">
                <span className={`text-xl font-black ${team.emojiBank < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{team.emojiBank}</span>
                <span className="text-sm">🪙</span>
             </div>
          </div>
       </div>
    </div>
  );
};

export default MatchView;

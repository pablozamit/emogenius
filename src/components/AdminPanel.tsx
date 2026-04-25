import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Eye,
  Save,
  X,
  Check,
  ChevronRight,
  Lock,
  MessageSquare,
  Hash,
  Tag
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where
} from 'firebase/firestore';
import { Challenge, ResponseLog } from '../types';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Challenge } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [responses, setResponses] = useState<ResponseLog[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchChallenges();
    }
  }, [isAuthenticated]);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'challenges'), orderBy('phrase', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
      setChallenges(data);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'emogenius2024') {
      setIsAuthenticated(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const startEditing = (id: string, field: keyof Challenge, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    try {
      const challengeRef = doc(db, 'challenges', id);
      await updateDoc(challengeRef, { [field]: editValue });

      setChallenges(challenges.map(c => c.id === id ? { ...c, [field]: editValue } : c));
      setEditingCell(null);
    } catch (error) {
      console.error("Error updating challenge:", error);
      alert("Error al actualizar");
    }
  };

  const viewResponses = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setLoadingResponses(true);
    setResponses([]);
    try {
      const q = query(
        collection(db, 'responses'),
        where('challengePhrase', '==', challenge.phrase),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data() as ResponseLog);
      setResponses(data);
    } catch (error) {
      console.error("Error fetching responses:", error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const filteredChallenges = challenges.filter(c =>
    c.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.subcategory && c.subcategory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-[32px] border-4 border-[#2D2D2D] shadow-[8px_8px_0px_0px_#2D2D2D] max-w-md w-full"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#FFCD4B] rounded-2xl flex items-center justify-center border-4 border-[#2D2D2D] mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-center">Acceso Restringido</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">Contraseña de Admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F3F3F3] border-4 border-[#2D2D2D] rounded-xl px-4 py-3 font-bold outline-none focus:bg-white transition-all"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#2D2D2D] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#FF4B91]"
            >
              ENTRAR AL PANEL
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#2D2D2D] transition-colors"
            >
              VOLVER AL MENÚ
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-white border-4 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Panel de Admin</h2>
        </div>

        <div className="relative max-w-xs w-full hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pregunta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-4 border-[#2D2D2D] rounded-xl pl-12 pr-4 py-2 font-bold outline-none shadow-[4px_4px_0px_0px_#2D2D2D]"
          />
        </div>
      </header>

      <div className="flex-1 bg-white border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F3F3F3] border-b-4 border-[#2D2D2D]">
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Pregunta</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Categoría</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Emojis</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Pista 1</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Pista 2</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Pista 3</th>
                <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center font-black uppercase text-slate-300 italic">Cargando datos...</td>
                </tr>
              ) : filteredChallenges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center font-black uppercase text-slate-300 italic">No se encontraron retos</td>
                </tr>
              ) : (
                filteredChallenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 min-w-[200px]">
                      <EditableCell
                        value={challenge.phrase}
                        isEditing={editingCell?.id === challenge.id && editingCell?.field === 'phrase'}
                        onEdit={() => startEditing(challenge.id!, 'phrase', challenge.phrase)}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <span className="bg-[#FFCD4B] text-[#2D2D2D] px-2 py-0.5 rounded-lg border-2 border-[#2D2D2D] font-black text-[9px] uppercase w-fit">
                          {challenge.category}
                        </span>
                        {challenge.subcategory && (
                          <span className="bg-[#00D1FF] text-[#2D2D2D] px-2 py-0.5 rounded-lg border-2 border-[#2D2D2D] font-black text-[9px] uppercase w-fit">
                            {challenge.subcategory}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-emoji text-2xl min-w-[100px]">
                      <EditableCell
                        value={challenge.emoji}
                        isEditing={editingCell?.id === challenge.id && editingCell?.field === 'emoji'}
                        onEdit={() => startEditing(challenge.id!, 'emoji', challenge.emoji)}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>
                    <td className="px-4 py-2 min-w-[120px]">
                      <EditableCell
                        value={challenge.clue1 || ''}
                        isEditing={editingCell?.id === challenge.id && editingCell?.field === 'clue1'}
                        onEdit={() => startEditing(challenge.id!, 'clue1', challenge.clue1 || '')}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onCancel={() => setEditingCell(null)}
                        placeholder="Pista 1"
                        className="text-[10px]"
                      />
                    </td>
                    <td className="px-4 py-2 min-w-[120px]">
                      <EditableCell
                        value={challenge.clue2 || ''}
                        isEditing={editingCell?.id === challenge.id && editingCell?.field === 'clue2'}
                        onEdit={() => startEditing(challenge.id!, 'clue2', challenge.clue2 || '')}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onCancel={() => setEditingCell(null)}
                        placeholder="Pista 2"
                        className="text-[10px]"
                      />
                    </td>
                    <td className="px-4 py-2 min-w-[120px]">
                      <EditableCell
                        value={challenge.clue3 || ''}
                        isEditing={editingCell?.id === challenge.id && editingCell?.field === 'clue3'}
                        onEdit={() => startEditing(challenge.id!, 'clue3', challenge.clue3 || '')}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onCancel={() => setEditingCell(null)}
                        placeholder="Pista 3"
                        className="text-[10px]"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => viewResponses(challenge)}
                        className="bg-white border-2 border-[#2D2D2D] px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2 ml-auto"
                      >
                        <Eye className="w-3 h-3" />
                        Ver Respuestas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responses Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#2D2D2D]/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white border-4 border-[#2D2D2D] shadow-[8px_8px_0px_0px_#FF4B91] rounded-[32px] max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b-4 border-[#2D2D2D] flex items-center justify-between bg-[#F3F3F3]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-5 h-5 text-[#FF4B91]" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Historial de Respuestas</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedChallenge.phrase}</p>
                </div>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingResponses ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 border-4 border-[#FF4B91] border-t-transparent rounded-full"
                    />
                    <p className="font-black uppercase text-xs tracking-widest text-slate-400">Consultando base de datos...</p>
                  </div>
                ) : responses.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="font-black uppercase text-sm tracking-widest text-slate-400 italic">No hay respuestas registradas aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {responses.map((res, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-2xl border-4 border-[#2D2D2D] flex items-center justify-between shadow-[4px_4px_0px_0px_#2D2D2D]",
                          res.isCorrect ? "bg-green-50" : "bg-red-50"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-tighter mb-1">El jugador escribió:</span>
                          <span className="text-lg font-black uppercase tracking-tight">{res.userInput}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Similitud</span>
                            <span className="text-sm font-black italic">{res.score}%</span>
                          </div>
                          <div className={cn(
                            "w-10 h-10 rounded-xl border-2 border-[#2D2D2D] flex items-center justify-center",
                            res.isCorrect ? "bg-green-400 shadow-[2px_2px_0px_0px_#2D2D2D]" : "bg-[#FF4B91] shadow-[2px_2px_0px_0px_#2D2D2D]"
                          )}>
                            {res.isCorrect ? <Check className="w-6 h-6 text-white stroke-[3px]" /> : <X className="w-6 h-6 text-white stroke-[3px]" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditableCell({
  value,
  isEditing,
  onEdit,
  onChange,
  onSave,
  onCancel,
  placeholder,
  className
}: {
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          className={cn("w-full bg-[#F3F3F3] border-2 border-[#2D2D2D] rounded-md px-2 py-1 font-bold outline-none", className)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <button onClick={onSave} className="p-1 bg-green-400 border-2 border-[#2D2D2D] rounded-md hover:translate-y-0.5 transition-all">
          <Check className="w-3 h-3 text-white" />
        </button>
        <button onClick={onCancel} className="p-1 bg-red-400 border-2 border-[#2D2D2D] rounded-md hover:translate-y-0.5 transition-all">
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        "cursor-pointer hover:bg-slate-200/50 p-2 rounded-lg transition-colors font-bold min-h-[40px] flex items-center",
        !value && "text-slate-300 italic font-normal",
        className
      )}
    >
      {value || placeholder || 'Click para editar'}
    </div>
  );
}

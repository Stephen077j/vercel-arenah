/**
 * Assistant ARENAH — bulle de discussion flottante.
 * Le "cerveau" est côté serveur (server/ai/chatbot.ts), sans API externe.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Brain, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { aiApi, ChatReply } from '@/api/ai';

interface Message { from: 'user' | 'bot'; text: string; reply?: ChatReply; feedback?: 'up' | 'down' }

const STORAGE_KEY = 'arenah_chat';
const WELCOME: Message = {
  from: 'bot',
  text: 'Bonjour ! 👋 Je suis l\'assistant ARENAH. Posez-moi une question : chambre libre, menu, spectacles, tarifs…',
  reply: {
    text: '', intent: null, confidence: 0, entities: {},
    suggestions: ['Chambre pour 2 ce week-end', 'Spectacles à venir', 'Que me conseilles-tu ?'],
  },
};

const INTENT_LABELS: Record<string, string> = {
  salutation: 'Salutation', au_revoir: 'Au revoir', remerciement: 'Remerciement', aide: 'Aide',
  hotel: 'Hôtel', restaurant: 'Restaurant', spectacle: 'Spectacle', salon: 'Salon', gym: 'Sport',
  piscine: 'Piscine', terrain: 'Terrain', enfants: 'Enfants', cybercafe: 'Cybercafé',
  evenement: 'Événementiel', boutique: 'Boutique', paiement: 'Paiement', fidelite: 'Fidélité',
  annulation: 'Annulation', horaires: 'Horaires', contact: 'Contact', recommandation: 'Recommandation',
};

const ENGINE_LABELS: Record<string, string> = {
  naive_bayes: '📊 Naive Bayes (mots)',
  neural: '🧠 réseau de neurones (sens)',
  memory: '💾 correction apprise',
  context: '🔗 suite de la question précédente',
};

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [WELCOME];
  } catch { return [WELCOME]; }
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* stockage indisponible */ }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const lastIntent = [...messages].reverse().find(m => m.reply?.intent)?.reply?.intent ?? null;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: message }]);
    setLoading(true);
    try {
      const reply = await aiApi.chat(message, lastIntent);
      setMessages(prev => [...prev, { from: 'bot', text: reply.text, reply }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Oups, je n\'arrive pas à joindre le serveur. Réessayez dans un instant.' }]);
    } finally {
      setLoading(false);
    }
  };

  // 👍/👎 : un 👎 envoie la question à l'admin, qui apprendra la bonne réponse à l'IA
  const rate = (index: number, helpful: boolean) => {
    const logId = messages[index]?.reply?.logId;
    if (!logId) return;
    setMessages(prev => prev.map((m, i) => (i === index ? { ...m, feedback: helpful ? 'up' : 'down' } : m)));
    aiApi.feedback(logId, helpful).catch(() => { /* non bloquant */ });
  };

  const last = messages[messages.length - 1];

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer l\'assistant' : 'Ouvrir l\'assistant'}
        className="fixed bottom-[6.5rem] right-6 z-[160] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed z-[160] bottom-[11rem] right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] h-[min(540px,calc(100vh-12.5rem))] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            {/* En-tête */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Assistant ARENAH</p>
                <p className="text-[11px] text-muted-foreground">IA intégrée · répond en temps réel</p>
              </div>
              <button
                onClick={() => setShowReasoning(v => !v)}
                title="Afficher le raisonnement de l'IA"
                className={`p-1.5 rounded-lg transition-colors ${showReasoning ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Brain className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                      m.from === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      {m.text}
                    </div>

                    {m.reply?.items && m.reply.items.length > 0 && (
                      <div className="w-full space-y-1.5">
                        {m.reply.items.map((it, j) => (
                          <div key={j} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{it.title}</p>
                              {it.price && <p className="text-xs font-semibold text-primary whitespace-nowrap">{it.price}</p>}
                            </div>
                            {it.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.reply?.actions && m.reply.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.reply.actions.map((a, j) => (
                          <Link key={j} to={a.to} onClick={() => setOpen(false)}
                            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                            {a.label} →
                          </Link>
                        ))}
                      </div>
                    )}

                    {m.from === 'bot' && m.reply?.logId && (
                      m.feedback ? (
                        <p className="text-[11px] text-muted-foreground">
                          {m.feedback === 'up' ? 'Merci pour votre retour !' : "Merci ! Votre question est transmise pour que j'apprenne."}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-[11px] mr-1">Réponse utile ?</span>
                          <button onClick={() => rate(i, true)} aria-label="Réponse utile" className="p-1 rounded hover:text-primary hover:bg-primary/10">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => rate(i, false)} aria-label="Réponse pas utile" className="p-1 rounded hover:text-destructive hover:bg-destructive/10">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}

                    {showReasoning && m.from === 'bot' && m.reply && m.reply.text && (
                      <div className="text-[11px] rounded-lg border border-dashed border-primary/40 px-2.5 py-1.5 text-muted-foreground font-mono leading-relaxed">
                        intention : <b className="text-foreground">{m.reply.intent ? INTENT_LABELS[m.reply.intent] ?? m.reply.intent : 'non comprise'}</b>
                        {' '}· confiance : <b className="text-foreground">{Math.round(m.reply.confidence * 100)} %</b>
                        {m.reply.engine && (
                          <><br />compris par : <b className="text-foreground">{ENGINE_LABELS[m.reply.engine]}</b></>
                        )}
                        {m.reply.neighbor && (
                          <><br />sens proche de : « {m.reply.neighbor} »</>
                        )}
                        {Object.keys(m.reply.entities).length > 0 && (
                          <><br />entités : {Object.entries(m.reply.entities).filter(([k]) => k !== 'date').map(([k, v]) => `${k}=${v}`).join(', ')}</>
                        )}
                        {m.reply.corrections && m.reply.corrections.length > 0 && (
                          <><br />fautes corrigées : {m.reply.corrections.map(c => `${c.from} → ${c.to}`).join(', ')}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted flex gap-1">
                    {[0, 1, 2].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions rapides */}
            {!loading && last?.reply?.suggestions && (
              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
                {last.reply.suggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:text-primary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Saisie */}
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2 p-3 border-t border-border">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Écrivez votre question…"
                maxLength={500}
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button type="submit" disabled={!input.trim() || loading} aria-label="Envoyer"
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="px-3 pb-2 -mt-1 text-[10px] text-muted-foreground text-center">
              Questions enregistrées anonymement pour améliorer l'assistant ·{' '}
              <Link to="/confidentialite" onClick={() => setOpen(false)} className="underline hover:text-foreground">En savoir plus</Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

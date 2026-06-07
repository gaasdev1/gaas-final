import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react-native';
import { ActivityIndicator, Animated, Easing, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
import { api } from '@/services/api';
import { Content, ContentType } from '@/types/content';

const DECISION_TARGET = 10;
const PROFILE_IMAGE = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces';

const intentDictionary = [
  { keys: ['horror', 'disturbante', 'paura', 'incubo', 'angoscia'], signals: ['horror', 'oscuro', 'teso', 'psicologico', 'mistero'], cluster: 'Tensione psicologica' },
  { keys: ['psicologico', 'mente', 'identita', 'ossessione', 'collasso'], signals: ['psicologico', 'identita', 'spiazzante', 'teso', 'noir'], cluster: 'Collasso interiore' },
  { keys: ['fantascienza', 'sci-fi', 'spazio', 'cosmico', 'futuro'], signals: ['fantascienza', 'spazio', 'intelligente', 'cyberpunk', 'primo contatto'], cluster: 'Orbite mentali' },
  { keys: ['malinconico', 'triste', 'solitudine', 'solo', 'nostalgico'], signals: ['malinconico', 'emotivo', 'dramma', 'lirico', 'intimo'], cluster: 'Bellezza malinconica' },
  { keys: ['conforto', 'comfort', 'calmo', 'leggero', 'coccola'], signals: ['confortante', 'caldo', 'ottimista', 'romance', 'famiglia scelta'], cluster: 'Rifugio morbido' },
  { keys: ['veloce', 'adrenalina', 'ritmo', 'azione', 'fast'], signals: ['ritmo alto', 'avventura', 'thriller', 'sopravvivenza', 'epico'], cluster: 'Impulso rapido' },
  { keys: ['filosofico', 'profondo', 'esistenziale', 'pensare', 'strano'], signals: ['intelligente', 'denso', 'strano', 'fantascienza', 'identita'], cluster: 'Tensione esistenziale' },
  { keys: ['romantico', 'amore', 'romance', 'sentimentale'], signals: ['romance', 'emotivo', 'caldo', 'glamour', 'intimo'], cluster: 'Magnetismo emotivo' },
  { keys: ['fantasy', 'magia', 'mito', 'epico'], signals: ['fantasy', 'mitologia', 'magia', 'epico', 'trasformazione'], cluster: 'Mito e meraviglia' }
];

const categories: Array<{ key: ContentType; label: string }> = [
  { key: 'movie', label: 'Film' },
  { key: 'tv', label: 'Serie' },
  { key: 'anime', label: 'Anime' },
  { key: 'game', label: 'Giochi' },
  { key: 'book', label: 'Libri' },
  { key: 'podcast', label: 'Podcast' }
];

type Decision = {
  item: Content;
  choice: 'left' | 'right' | 'superlike';
};

type DecisionSession = {
  id: string;
  category: string;
  decision_count: number;
  target_decisions: number;
  status: string;
};

type Top3Result = {
  content: Content;
  score: number;
  reason: string;
  matched_signals: string[];
  rank_type: string;
};

type InteractionResult = {
  ok: boolean;
  decision_count: number;
  target_decisions: number;
  session_completed: boolean;
  top_3: Top3Result[];
};

type GestureChoice = 'left' | 'right' | 'superlike';
type MatchKind = 'like' | 'super';
type MatchState = {
  kind: MatchKind;
  title: string;
  copy: string;
};
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type IntentSession = {
  id: string;
  session_title: string;
  user_intent_summary: string;
  category: ContentType;
  genres: string[];
  moods: string[];
  energy: string[];
  boost_tags: string[];
  exclude_tags: string[];
};
type AiIntentChatOut = {
  provider: string;
  assistant_message: string;
  questions: string[];
  intent: {
    session_title: string;
    user_intent_summary: string;
    category: ContentType;
    genres: string[];
    moods: string[];
    energy: string[];
    feed_query: { boost_tags: string[]; exclude_tags: string[] };
  };
  ready_to_start: boolean;
  intent_session?: IntentSession;
};

function collectSignals(decisions: Decision[]) {
  const liked = decisions.filter((entry) => entry.choice !== 'left');
  return liked.flatMap(({ item }) => [...(item.genres ?? []), ...(item.tags ?? []), ...(item.moods ?? [])].map((value) => value.toLowerCase()));
}

function itemSignals(item: Content) {
  return [...(item.genres ?? []), ...(item.tags ?? []), ...(item.moods ?? []), item.title, item.description]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function interpretIntent(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return { active: false, signals: [] as string[], clusters: [] as string[] };

  const signals = new Set<string>();
  const clusters = new Set<string>();
  intentDictionary.forEach((entry) => {
    if (entry.keys.some((key) => normalized.includes(key))) {
      entry.signals.forEach((signal) => signals.add(signal));
      clusters.add(entry.cluster);
    }
  });

  normalized
    .split(/[\s,.;:!?]+/)
    .filter((word) => word.length > 3)
    .forEach((word) => signals.add(word));

  return { active: true, signals: [...signals], clusters: [...clusters].slice(0, 3) };
}

function scoreIntent(item: Content, signals: string[]) {
  if (!signals.length) return 0;
  const haystack = itemSignals(item).join(' ');
  return signals.reduce((score, signal) => score + (haystack.includes(signal) ? 18 : 0), 0);
}

function intentFeedback(text: string, clusters: string[], signals: string[]) {
  if (!text.trim()) return 'Feed Identita attivo. Muoviti nel gusto, una scelta alla volta.';
  const visibleSignals = signals.slice(0, 3).join(' + ');
  if (clusters.length) return `Sto cercando segnali piu vicini a ${clusters.join(' / ')}. Profilo spostato verso ${visibleSignals}.`;
  return `Il feed si sta piegando verso "${text.trim()}".`;
}

function compatibility(item: Content, decisions: Decision[]) {
  const signals = collectSignals(decisions);
  const itemSignals = [...(item.genres ?? []), ...(item.tags ?? []), ...(item.moods ?? [])].map((value) => value.toLowerCase());
  const overlap = itemSignals.filter((signal) => signals.includes(signal)).length;
  const choice = decisions.find((entry) => entry.item.id === item.id)?.choice;
  const choiceBonus = choice === 'superlike' ? 24 : choice === 'right' ? 16 : choice === 'left' ? -10 : 0;
  const quality = Math.min((item.rating || 0) * 4, 36);
  const popularity = Math.min((item.popularity || 0) / 4, 22);
  return Math.max(1, Math.min(99, Math.round(quality + popularity + overlap * 9 + choiceBonus)));
}

function matchReason(item: Content, decisions: Decision[]) {
  const signals = collectSignals(decisions);
  const matches = [...(item.moods ?? []), ...(item.genres ?? []), ...(item.tags ?? [])]
    .filter((value) => signals.includes(value.toLowerCase()))
    .slice(0, 3);
  if (matches.length) return `Scelto per ${matches.join(', ')}: sono segnali emersi dalle tue decisioni.`;
  return `Scelto per qualita, popolarita e coerenza con la categoria.`;
}

function platformHints(item: Content) {
  if (item.content_type === 'movie' || item.content_type === 'tv') return ['JustWatch', 'Prime Video', 'Apple TV'];
  if (item.content_type === 'anime' || item.content_type === 'manga') return ['Crunchyroll', 'Netflix', 'AniList'];
  if (item.content_type === 'game') return ['Steam', 'PlayStation', 'Xbox'];
  if (item.content_type === 'book') return ['Google Books', 'Open Library', 'Kindle'];
  if (item.content_type === 'podcast') return ['Spotify', 'Apple Podcasts', 'YouTube'];
  return [item.source];
}

function sourceUrl(item: Content) {
  return item.external_url ?? `https://www.google.com/search?q=${encodeURIComponent(`${item.title} dove trovarlo`)}`;
}

function matchMicrocopy(item: Content, type: MatchKind) {
  const signal = item.moods?.[0] ?? item.genres?.[0] ?? 'il tuo gusto';
  if (type === 'super') return `Identity drift detected: + ${signal}. This aligns with your strongest signals.`;
  return `The system detected high emotional affinity with ${signal}.`;
}

export default function Feed() {
  const client = useQueryClient();
  const [category, setCategory] = useState<ContentType>('book');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [session, setSession] = useState<DecisionSession>();
  const [backendTop3, setBackendTop3] = useState<Top3Result[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [intentDraft, setIntentDraft] = useState('');
  const [intentSession, setIntentSession] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentSession>();
  const [matchState, setMatchState] = useState<MatchState>();
  const [heldAnalysis, setHeldAnalysis] = useState<Content>();
  const [premiumPrompt, setPremiumPrompt] = useState(false);
  const [resultTransition, setResultTransition] = useState(false);
  const viewedAt = useRef(Date.now());
  const matchOpacity = useRef(new Animated.Value(0)).current;
  const matchScale = useRef(new Animated.Value(0.9)).current;
  const matchGlow = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardLift = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.96)).current;
  const actionLocked = useRef(false);
  const interpretedIntent = useMemo(() => interpretIntent(intentSession), [intentSession]);

  useEffect(() => {
    let active = true;
    async function createSession() {
      const { data } = await api.post<DecisionSession>('/sessions', { category, target_decisions: DECISION_TARGET });
      if (active) setSession(data);
    }
    createSession();
    return () => {
      active = false;
    };
  }, [category]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['decision-feed', category, session?.id, activeIntent?.id],
    queryFn: async () => {
      const response = await api.get<Content[]>('/feed', { params: { category, session_id: session?.id, intent_session_id: activeIntent?.id } });
      return response.data;
    },
    staleTime: 1000 * 60 * 10
  });

  const pool = useMemo(() => {
    const seen = new Set<string>();
    return (data ?? []).filter((entry) => {
      const key = `${entry.content_type}:${entry.title.toLowerCase()}`;
      if (entry.content_type !== category || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [category, data]);
  const decidedIds = useMemo(() => new Set(decisions.map((entry) => entry.item.id)), [decisions]);
  const rankedPool = useMemo(() => {
    if (!interpretedIntent.active) return pool;
    return [...pool].sort((a, b) => {
      const intentDelta = scoreIntent(b, interpretedIntent.signals) - scoreIntent(a, interpretedIntent.signals);
      if (intentDelta !== 0) return intentDelta;
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    });
  }, [pool, interpretedIntent]);
  const item = rankedPool.find((entry) => !decidedIds.has(entry.id));
  const localTopMatches = useMemo(
    () =>
      [...decisions]
        .sort(
          (a, b) =>
            compatibility(b.item, decisions) +
            scoreIntent(b.item, interpretedIntent.signals) -
            (compatibility(a.item, decisions) + scoreIntent(a.item, interpretedIntent.signals))
        )
        .slice(0, 3),
    [decisions, interpretedIntent.signals]
  );
  const topMatches = backendTop3.length
    ? backendTop3.map((entry) => ({ item: entry.content, score: Math.round(entry.score), reason: entry.reason, rankType: entry.rank_type }))
    : localTopMatches.map(({ item }) => ({ item, score: compatibility(item, decisions), reason: matchReason(item, decisions), rankType: 'local' }));

  useEffect(() => {
    viewedAt.current = Date.now();
    cardOpacity.setValue(1);
    cardScale.setValue(1);
    cardLift.setValue(0);
    const next = rankedPool.find((entry) => entry.id !== item?.id && !decidedIds.has(entry.id));
    const image = next?.banner_url || next?.image_url;
    if (image) Image.prefetch(image);
  }, [item?.id, rankedPool, decidedIds, cardOpacity, cardScale, cardLift]);

  function resetSession(nextCategory = category) {
    setCategory(nextCategory);
    setDecisions([]);
    setSession(undefined);
    setBackendTop3([]);
    setShowResults(false);
    setIntentDraft('');
    setIntentSession('');
    setActiveIntent(undefined);
  }

  function submitIntent() {
    const value = intentDraft.trim();
    if (!value) return;
    setIntentSession(value);
  }

  function clearIntent() {
    setIntentDraft('');
    setIntentSession('');
    setActiveIntent(undefined);
    client.invalidateQueries({ queryKey: ['decision-feed'] });
  }

  async function sendAiMessage(text = aiDraft) {
    const message = text.trim();
    if (!message || aiLoading) return;
    const nextHistory = [...aiMessages, { role: 'user' as const, content: message }];
    setAiMessages(nextHistory);
    setAiDraft('');
    setAiLoading(true);
    try {
      const { data: result } = await api.post<AiIntentChatOut>('/ai/intent/chat', { message, history: aiMessages });
      setAiMessages([...nextHistory, { role: 'assistant', content: result.assistant_message }]);
      setAiQuestions(result.questions ?? []);
      setAiSummary(result.intent.user_intent_summary);
      if (result.ready_to_start && result.intent_session) {
        setActiveIntent(result.intent_session);
        setIntentSession(result.intent.session_title);
        setCategory(result.intent_session.category);
      }
    } finally {
      setAiLoading(false);
    }
  }

  function startIntentSession() {
    setAiOpen(false);
    setDecisions([]);
    setShowResults(false);
    setBackendTop3([]);
    client.invalidateQueries({ queryKey: ['decision-feed'] });
  }

  async function recordInteraction(current: Content, interactionType: 'LIKE' | 'DISLIKE' | 'SAVE' | 'CLICK_PLATFORM' | 'LONG_VIEW') {
    const { data: result } = await api.post<InteractionResult>('/interaction', {
      content_id: current.id,
      interaction_type: interactionType,
      session_id: session?.id,
      watch_time: Math.round((Date.now() - viewedAt.current) / 1000)
    });
    if (result.top_3?.length) setBackendTop3(result.top_3);
    return result;
  }

  async function trackPlatformClick() {
    if (!item) return;
    await recordInteraction(item, 'CLICK_PLATFORM');
  }

  function showMatchAnimation(current: Content, kind: MatchKind) {
    setMatchState({
      kind,
      title: kind === 'super' ? 'CORE SIGNAL DETECTED' : 'Signal detected.',
      copy: kind === 'super' ? `Vault updated. ${matchMicrocopy(current, kind)}` : matchMicrocopy(current, kind)
    });
    matchOpacity.setValue(0);
    matchScale.setValue(kind === 'super' ? 0.86 : 0.96);
    matchGlow.setValue(0);
    Animated.parallel([
      Animated.timing(matchOpacity, { toValue: 1, duration: kind === 'super' ? 260 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(matchScale, { toValue: 1, friction: kind === 'super' ? 6 : 8, tension: kind === 'super' ? 72 : 86, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(matchGlow, { toValue: 1, duration: kind === 'super' ? 420 : 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(matchGlow, { toValue: 0.62, duration: kind === 'super' ? 520 : 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    ]).start(() => {
      Animated.sequence([
        Animated.delay(kind === 'super' ? 760 : 360),
        Animated.timing(matchOpacity, { toValue: 0, duration: kind === 'super' ? 360 : 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      ]).start(() => setMatchState(undefined));
    });
  }

  function dissolveCard(type: GestureChoice, onDone: () => void) {
    const delay = type === 'left' ? 0 : 200;
    const duration = type === 'superlike' ? 520 : type === 'right' ? 360 : 260;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: type === 'superlike' ? 0.965 : 0.975, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardLift, { toValue: type === 'superlike' ? -16 : type === 'right' ? -8 : 8, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ])
    ]).start(() => {
      onDone();
      requestAnimationFrame(() => {
        cardOpacity.setValue(1);
        cardScale.setValue(1);
        cardLift.setValue(0);
        actionLocked.current = false;
      });
    });
  }

  function showResultAnimation(onDone: () => void) {
    setResultTransition(true);
    resultOpacity.setValue(0);
    resultScale.setValue(0.96);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(resultOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(resultScale, { toValue: 1, friction: 8, tension: 72, useNativeDriver: true })
      ]),
      Animated.delay(520),
      Animated.timing(resultOpacity, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
    ]).start(() => {
      setResultTransition(false);
      onDone();
    });
  }

  function swipe(type: GestureChoice) {
    const current = item;
    if (!current || actionLocked.current) return;
    if (type === 'superlike' && decisions.filter((entry) => entry.choice === 'superlike').length >= 2) {
      setPremiumPrompt(true);
      return;
    }
    actionLocked.current = true;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(type === 'superlike' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
      if (type === 'superlike') {
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 180);
      }
    }

    const viewSeconds = Math.round((Date.now() - viewedAt.current) / 1000);
    const next = [...decisions, { item: current, choice: type }];
    setDecisions(next);
    actionLocked.current = false;
    if (next.length >= DECISION_TARGET) {
      actionLocked.current = true;
      showResultAnimation(() => {
        setShowResults(true);
        actionLocked.current = false;
      });
    }

    const interactionType = type === 'left' ? 'DISLIKE' : type === 'right' ? 'LIKE' : 'SAVE';
    void (async () => {
      if (viewSeconds >= 8) await recordInteraction(current, 'LONG_VIEW');
      const result = await recordInteraction(current, interactionType);
      if (type !== 'left') client.invalidateQueries({ queryKey: ['favorites'] });
      client.invalidateQueries({ queryKey: ['decision-feed', category, session?.id, activeIntent?.id] });
      if (result?.session_completed) setBackendTop3(result.top_3 ?? []);
    })();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.claim}>Ora sai cosa fare.</Text>
            <Pressable style={styles.profileButton} onPress={() => router.push('/tabs/profile')}>
              <Image source={{ uri: PROFILE_IMAGE }} style={styles.profileImage} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {categories.map((entry) => (
            <Pressable key={entry.key} onPress={() => resetSession(entry.key)} style={[styles.category, category === entry.key && styles.categoryActive]}>
              <Text style={[styles.categoryText, category === entry.key && styles.categoryTextActive]}>{entry.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading && <View style={styles.center}><ActivityIndicator color="#D6FF3F" /></View>}

        {!isLoading && showResults && (
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
            <Text style={styles.resultsKicker}>Risultato</Text>
            <Text style={styles.resultsTitle}>Questi sono i tre da guardare.</Text>
            {topMatches.map(({ item: match, score, reason }, index) => (
              <View key={match.id} style={[styles.matchCard, index === 0 && styles.matchCardPrimary]}>
                <View style={styles.matchHeader}>
                  {!!match.image_url && <Image source={{ uri: match.image_url }} style={styles.matchImage} />}
                  <View style={styles.matchInfo}>
                    <View style={styles.matchTop}>
                      <Text style={styles.rank}>{index === 0 ? 'Priorita' : index === 1 ? 'Alternativa' : 'Scoperta'}</Text>
                      <Text style={[styles.score, index === 0 && styles.scorePrimary]}>{score}%</Text>
                    </View>
                    <Text style={[styles.matchTitle, index === 0 && styles.matchTitlePrimary]}>{match.title}</Text>
                  </View>
                </View>
                <Text style={[styles.matchReason, index === 0 && styles.matchReasonPrimary]}>{reason}</Text>
                <View style={styles.signalRow}>
                  {[...(match.moods ?? []), ...(match.genres ?? [])].slice(0, 4).map((signal) => (
                    <Text key={signal} style={[styles.signal, index === 0 && styles.signalPrimary]}>{signal}</Text>
                  ))}
                </View>
                <View style={styles.platformRow}>
                  {platformHints(match).map((platform) => (
                    <Text key={platform} style={[styles.platform, index === 0 && styles.platformPrimary]}>{platform}</Text>
                  ))}
                </View>
                <Pressable style={[styles.matchButton, index === 0 && styles.matchButtonPrimary]} onPress={() => Linking.openURL(sourceUrl(match))}>
                  <Text style={[styles.matchButtonText, index === 0 && styles.matchButtonTextPrimary]}>Trova dove vederlo</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.primary} onPress={() => resetSession()}>
              <RotateCcw color="#0F1115" size={18} />
              <Text style={styles.primaryText}>Nuova sessione</Text>
            </Pressable>
          </ScrollView>
        )}

          {!isLoading && !showResults && item && (
            <>
              <Animated.View
                style={[
                  styles.cardStage,
                  {
                    opacity: cardOpacity,
                    transform: [{ scale: cardScale }, { translateY: cardLift }]
                  }
                ]}
              >
                <ContentCard item={item} onPlatformOpen={trackPlatformClick} onHold={() => setHeldAnalysis(item)} />
                <View style={styles.cardActions}>
                  <Pressable style={styles.cardAction} onPress={() => swipe('left')}>
                  <X color="#F5F5F5" size={18} />
                  <Text style={styles.cardActionText}>Scarta</Text>
                </Pressable>
                <Pressable style={styles.cardActionPrimary} onPress={() => swipe('superlike')}>
                  <Sparkles color="#0F1115" size={18} />
                  <Text style={styles.cardActionPrimaryText}>Super {Math.max(0, 2 - decisions.filter((entry) => entry.choice === 'superlike').length)}</Text>
                </Pressable>
                <Pressable style={styles.cardAction} onPress={() => swipe('right')}>
                  <Heart color="#F5F5F5" size={18} />
                    <Text style={styles.cardActionText}>Like</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </>
          )}
        {!isLoading && !showResults && !item && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Non ho abbastanza contenuti</Text>
            <Text style={styles.empty}>Il catalogo Supabase non contiene ancora elementi disponibili per questa categoria.</Text>
            <Pressable style={styles.primary} onPress={() => refetch()}><Text style={styles.primaryText}>Riprova</Text></Pressable>
          </View>
        )}

      </View>
      {!showResults && (
        <View style={styles.aiFloatingWrap}>
          <Pressable style={styles.aiFloatingPill} onPress={() => setAiOpen(true)}>
            <MessageCircle color="#D6FF3F" size={21} />
            <Text style={styles.aiFloatingText}>{activeIntent ? activeIntent.session_title : 'Dimmi cosa vuoi vivere stasera...'}</Text>
            <Sparkles color="#D6FF3F" size={19} />
          </Pressable>
        </View>
      )}
      <Modal visible={aiOpen} transparent animationType="fade" onRequestClose={() => setAiOpen(false)}>
        <View style={styles.aiBackdrop}>
          <View style={styles.aiSheet}>
            <View style={styles.aiSheetTop}>
              <View>
                <Text style={styles.aiKicker}>GAAS AI</Text>
                <Text style={styles.aiTitle}>Costruiamo la tua sessione.</Text>
              </View>
              <Pressable style={styles.aiClose} onPress={() => setAiOpen(false)}>
                <X color="#F5F5F5" size={18} />
              </Pressable>
            </View>
            <ScrollView style={styles.aiMessages} contentContainerStyle={styles.aiMessagesContent}>
              {aiMessages.length === 0 && (
                <View style={styles.aiIntro}>
                  <Text style={styles.aiIntroText}>Scrivi un mood, una voglia, una sensazione. GAAS ti farà poche domande e poi apre il feed giusto.</Text>
                </View>
              )}
              {aiMessages.map((message, index) => (
                <View key={`${message.role}-${index}`} style={[styles.chatBubble, message.role === 'user' && styles.chatBubbleUser]}>
                  <Text style={[styles.chatText, message.role === 'user' && styles.chatTextUser]}>{message.content}</Text>
                </View>
              ))}
              {aiQuestions.map((question) => (
                <Pressable key={question} style={styles.questionChip} onPress={() => sendAiMessage(question)}>
                  <Text style={styles.questionText}>{question}</Text>
                </Pressable>
              ))}
              {!!aiSummary && <Text style={styles.aiSummary}>{aiSummary}</Text>}
            </ScrollView>
            <View style={styles.aiComposer}>
              <TextInput
                value={aiDraft}
                onChangeText={setAiDraft}
                placeholder="Tipo: qualcosa di oscuro ma elegante"
                placeholderTextColor="#7D8491"
                style={styles.aiInput}
                multiline
              />
              <Pressable style={styles.aiSend} onPress={() => sendAiMessage()} disabled={aiLoading}>
                <Sparkles color="#0F1115" size={16} />
              </Pressable>
            </View>
            {activeIntent && (
              <Pressable style={styles.startDrift} onPress={startIntentSession}>
                <Text style={styles.startDriftText}>INIZIA A SCROLLARE</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
      {heldAnalysis && (
        <Pressable style={styles.analysisOverlay} onPress={() => setHeldAnalysis(undefined)}>
          <View style={styles.analysisPanel}>
            <Text style={styles.analysisKicker}>Analisi nascosta</Text>
            <Text style={styles.analysisTitle}>{heldAnalysis.title}</Text>
            <Text style={styles.analysisCopy}>
              GAAS legge questo come un segnale verso {(heldAnalysis.moods ?? []).slice(0, 2).join(' e ') || 'un gusto piu preciso'}.
              Le reazioni della community indicano alta affinita nei profili vicini alla tua identita culturale.
            </Text>
            <View style={styles.analysisTags}>
              {[...(heldAnalysis.moods ?? []), ...(heldAnalysis.genres ?? []), ...(heldAnalysis.tags ?? [])].slice(0, 6).map((tag) => (
                <Text key={tag} style={styles.analysisTag}>{tag}</Text>
              ))}
            </View>
          </View>
        </Pressable>
      )}
      <Modal visible={premiumPrompt} transparent animationType="fade" onRequestClose={() => setPremiumPrompt(false)}>
        <View style={styles.aiBackdrop}>
          <View style={styles.premiumPanel}>
            <Text style={styles.matchKickerSuper}>Super esauriti</Text>
            <Text style={styles.premiumTitle}>Hai usato i 2 Super della sessione.</Text>
            <Text style={styles.premiumCopy}>Il piano premium sblocchera piu segnali forti e analisi profonde.</Text>
            <Pressable style={styles.startDrift} onPress={() => setPremiumPrompt(false)}>
              <Text style={styles.startDriftText}>CONTINUA</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {matchState && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.matchOverlay,
            matchState.kind === 'super' && styles.matchOverlaySuper,
            { opacity: matchOpacity, transform: [{ scale: matchScale }] }
          ]}
        >
          <Animated.View style={[styles.matchBloom, { opacity: matchGlow }]} />
          {matchState.kind === 'super' && (
            <>
              <Animated.View style={[styles.matchPulseOuter, { opacity: matchGlow }]} />
              <Animated.View style={[styles.matchPulseInner, { opacity: matchGlow }]} />
            </>
          )}
          <View style={[styles.matchPanel, matchState.kind === 'super' && styles.matchPanelSuper]}>
            <Text style={[styles.matchKicker, matchState.kind === 'super' && styles.matchKickerSuper]}>
              {matchState.kind === 'super' ? 'Rare emotional match' : 'AI signal reading'}
            </Text>
            <Text style={[styles.matchOverlayTitle, matchState.kind === 'super' && styles.matchOverlayTitleSuper]}>{matchState.title}</Text>
            <Text style={styles.matchOverlayCopy}>{matchState.copy}</Text>
            <View style={styles.particleRow}>
              <View style={styles.particle} />
              <View style={[styles.particle, styles.particleSoft]} />
              <View style={styles.particle} />
            </View>
          </View>
          </Animated.View>
      )}
      {resultTransition && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.resultTransition,
            { opacity: resultOpacity, transform: [{ scale: resultScale }] }
          ]}
        >
          <View style={styles.resultGlow} />
          <View style={styles.resultPanel}>
            <Text style={styles.resultKicker}>Sessione completata</Text>
            <Text style={styles.resultTitle}>La tua Top 3 e pronta.</Text>
            <Text style={styles.resultCopy}>GAAS ha letto i tuoi segnali e sta preparando le risposte.</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115', paddingHorizontal: 0, paddingTop: 8 },
  shell: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 6, paddingBottom: 132 },
  header: { alignItems: 'stretch', justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  headerCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.62)',
    backgroundColor: '#1D222B'
  },
  profileImage: { width: '100%', height: '100%' },
  claim: { flex: 1, color: '#D6FF3F', fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: 0, textAlign: 'left' },
  headerSpacer: { width: 42, height: 42 },
  categories: { gap: 5, paddingHorizontal: 18, paddingRight: 18 },
  category: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141820',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  categoryActive: { backgroundColor: '#D6FF3F', borderColor: '#D6FF3F' },
  categoryText: { color: '#B8BCC6', fontSize: 12, fontWeight: '900' },
  categoryTextActive: { color: '#0F1115' },
  center: { flex: 1, justifyContent: 'center' },
  cardStage: {
    marginHorizontal: 18,
    marginBottom: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(29,34,43,0.18)',
    shadowColor: '#0F1115',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'visible'
  },
  cardActions: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: -60,
    height: 50,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 30,
    backgroundColor: 'rgba(20,24,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#0F1115',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 }
  },
  cardAction: {
    flex: 1,
      height: 42,
      borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
      backgroundColor: 'rgba(15,17,21,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  cardActionText: { color: '#F5F5F5', fontSize: 12, fontWeight: '900' },
  cardActionPrimary: {
    flex: 1.12,
      height: 44,
      borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#D6FF3F'
  },
  cardActionPrimaryText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  intentBox: {
    marginHorizontal: 18,
    gap: 7,
    padding: 9,
    borderRadius: 24,
    backgroundColor: 'rgba(29,34,43,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  intentBoxActive: {
    borderColor: 'rgba(214,255,63,0.34)',
    backgroundColor: 'rgba(29,34,43,0.92)'
  },
  intentPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D6FF3F',
    shadowColor: '#D6FF3F',
    shadowOpacity: 0.8,
    shadowRadius: 12
  },
  intentClear: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  intentClearText: { color: '#B8BCC6', fontSize: 11, fontWeight: '900' },
  intentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intentInput: {
    flex: 1,
    minHeight: 34,
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'transparent'
  },
  intentButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6FF3F'
  },
  intentFeedback: { color: '#B8BCC6', fontSize: 11, lineHeight: 15, fontWeight: '700', paddingHorizontal: 22, paddingBottom: 3 },
  intentSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  intentChip: {
    color: '#D6FF3F',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(214,255,63,0.10)'
  },
  emptyBox: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    backgroundColor: '#181C24',
    padding: 24
  },
  emptyTitle: { color: '#F5F5F5', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  empty: { color: '#B8BCC6', textAlign: 'center', lineHeight: 20 },
  primary: {
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#D6FF3F'
  },
  primaryText: { color: '#0F1115', fontWeight: '900' },
  results: { maxHeight: 575, paddingHorizontal: 18 },
  resultsContent: { gap: 12, paddingBottom: 96 },
  resultsKicker: { color: '#7D8491', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  resultsTitle: { color: '#F5F5F5', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: 0, marginBottom: 4 },
  matchCard: { gap: 10, padding: 14, borderRadius: 8, backgroundColor: '#181C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  matchCardPrimary: { backgroundColor: '#D6FF3F', borderColor: '#D6FF3F' },
  matchHeader: { flexDirection: 'row', gap: 12 },
  matchImage: { width: 58, height: 82, borderRadius: 8, backgroundColor: '#141820' },
  matchInfo: { flex: 1, gap: 6, justifyContent: 'center' },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rank: { color: '#7D8491', fontSize: 12, fontWeight: '900' },
  score: { color: '#0F1115', backgroundColor: '#E8E6DF', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '900' },
  scorePrimary: { color: '#F5F5F5', backgroundColor: '#0F1115' },
  matchTitle: { color: '#F5F5F5', fontSize: 20, lineHeight: 24, fontWeight: '900' },
  matchTitlePrimary: { color: '#0F1115', fontSize: 24, lineHeight: 28 },
  matchReason: { color: '#B8BCC6', fontSize: 13, lineHeight: 19 },
  matchReasonPrimary: { color: '#141820' },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  signal: { color: '#F5F5F5', fontSize: 11, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  signalPrimary: { color: '#0F1115', borderColor: 'rgba(15,17,21,0.24)' },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  platform: { color: '#B8BCC6', fontSize: 11, fontWeight: '800', backgroundColor: '#1D222B', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden' },
  platformPrimary: { color: '#0F1115', backgroundColor: 'rgba(15,17,21,0.12)' },
  matchButton: { height: 42, borderRadius: 21, backgroundColor: '#E8E6DF', alignItems: 'center', justifyContent: 'center' },
  matchButtonPrimary: { backgroundColor: '#0F1115' },
  matchButtonText: { color: '#0F1115', fontSize: 13, fontWeight: '900' },
  matchButtonTextPrimary: { color: '#F5F5F5' },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15,17,21,0.72)'
  },
  analysisPanel: {
    width: '100%',
    maxWidth: 440,
    gap: 10,
    padding: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(29,34,43,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.18)'
  },
  analysisKicker: { color: '#D6FF3F', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  analysisTitle: { color: '#F5F5F5', fontSize: 28, lineHeight: 31, fontWeight: '900' },
  analysisCopy: { color: '#B8BCC6', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  analysisTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  analysisTag: {
    color: '#D6FF3F',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(214,255,63,0.10)'
  },
  matchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15,17,21,0.46)'
  },
  matchOverlaySuper: { backgroundColor: 'rgba(15,17,21,0.72)' },
  matchBloom: {
    position: 'absolute',
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: 'rgba(214,255,63,0.12)'
  },
  matchPulseOuter: {
    position: 'absolute',
    width: 430,
    height: 430,
    borderRadius: 215,
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.16)'
  },
  matchPulseInner: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(232,230,223,0.14)'
  },
  matchPanel: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(29,34,43,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  matchPanelSuper: {
    maxWidth: 410,
    paddingVertical: 26,
    backgroundColor: 'rgba(24,28,36,0.86)',
    borderColor: 'rgba(214,255,63,0.26)'
  },
  matchKicker: { color: '#AAB4C3', fontSize: 10, letterSpacing: 0.6, fontWeight: '900', textTransform: 'uppercase' },
  matchKickerSuper: { color: '#D6FF3F' },
  matchOverlayTitle: { color: '#F5F5F5', fontSize: 25, lineHeight: 30, fontWeight: '900', textAlign: 'center' },
  matchOverlayTitleSuper: { color: '#D6FF3F', fontSize: 30, lineHeight: 36 },
  matchOverlayCopy: { color: '#B8BCC6', fontSize: 13, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  particleRow: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  particle: { width: 38, height: 1, borderRadius: 1, backgroundColor: 'rgba(214,255,63,0.42)' },
  particleSoft: { width: 78, backgroundColor: 'rgba(232,230,223,0.26)' },
  aiFloatingWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 96,
    alignItems: 'center'
  },
  resultTransition: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15,17,21,0.72)'
  },
  resultGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(214,255,63,0.10)'
  },
  resultPanel: {
    width: '100%',
    maxWidth: 390,
    gap: 8,
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(24,28,36,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.20)'
  },
  resultKicker: { color: '#AAB4C3', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  resultTitle: { color: '#D6FF3F', fontSize: 28, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  resultCopy: { color: '#B8BCC6', fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  aiFloatingPill: {
    width: '100%',
    maxWidth: 520,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(29,34,43,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(232,230,223,0.13)',
    shadowColor: '#D6FF3F',
    shadowOpacity: 0.10,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 }
  },
  aiFloatingText: { flex: 1, color: '#F5F5F5', fontSize: 14, fontWeight: '900' },
  aiBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,17,21,0.74)'
  },
  aiSheet: {
    maxHeight: '86%',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#181C24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  aiSheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  aiKicker: { color: '#D6FF3F', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  aiTitle: { color: '#F5F5F5', fontSize: 27, lineHeight: 31, fontWeight: '900', marginTop: 3 },
  aiClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D222B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  aiMessages: { maxHeight: 360 },
  aiMessagesContent: { gap: 9, paddingVertical: 4 },
  aiIntro: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(214,255,63,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.16)'
  },
  aiIntroText: { color: '#B8BCC6', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  chatBubble: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#1D222B'
  },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: '#D6FF3F' },
  chatText: { color: '#F5F5F5', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  chatTextUser: { color: '#0F1115' },
  questionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  questionText: { color: '#F5F5F5', fontSize: 12, fontWeight: '900' },
  aiSummary: { color: '#D6FF3F', fontSize: 13, lineHeight: 18, fontWeight: '900', paddingTop: 4 },
  aiComposer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: '#0F1115',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  aiInput: { flex: 1, maxHeight: 88, color: '#F5F5F5', fontSize: 14, lineHeight: 18, fontWeight: '800', paddingVertical: 10 },
  aiSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6FF3F'
  },
  startDrift: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6FF3F'
  },
  startDriftText: { color: '#0F1115', fontSize: 13, fontWeight: '900' },
  premiumPanel: {
    marginHorizontal: 22,
    gap: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#181C24',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.22)'
  },
  premiumTitle: { color: '#F5F5F5', fontSize: 28, lineHeight: 32, fontWeight: '900' },
  premiumCopy: { color: '#B8BCC6', fontSize: 14, lineHeight: 20, fontWeight: '800' }
});

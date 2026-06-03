import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

const fallbackSignals = ['fantascienza', 'oscuro', 'emotivo', 'identita', 'solitudine', 'lento', 'filosofico', 'spiazzante'];
const fallbackPatterns = ['solitudine', 'sacrificio', 'conflitto interiore', 'ambiguita emotiva'];
const friendProfiles = [
  { name: 'Luca', archetype: 'Stratega Oscuro', match: 86, trait: 'thriller tesi, finali ambigui' },
  { name: 'Marta', archetype: 'Romantica Cosmica', match: 74, trait: 'storie emotive, mondi sospesi' },
  { name: 'Nico', archetype: 'Curatore Notturno', match: 61, trait: 'anime lenti, malinconia visiva' }
];

function pickArchetype(signals: string[]) {
  const joined = signals.join(' ').toLowerCase();
  if (joined.includes('fantascienza') || joined.includes('spazio')) return 'Esploratore Esistenziale';
  if (joined.includes('thriller') || joined.includes('oscuro')) return 'Stratega Oscuro';
  if (joined.includes('emotivo') || joined.includes('romance')) return 'Romantico Cosmico';
  if (joined.includes('mistero') || joined.includes('spiazzante')) return 'Analista Emotivo';
  return 'Curatore Notturno';
}

function FloatingSignal({ label, index }: { label: string; index: number }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2600 + index * 260, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 2600 + index * 260, useNativeDriver: true })
      ])
    ).start();
  }, [drift, index]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? -8 : 8] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? 5 : -5] });

  return (
    <Animated.View style={[styles.signal, { transform: [{ translateY }, { translateX }] }]}>
      <Text style={styles.signalText}>{label}</Text>
    </Animated.View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FriendProfile({ friend }: { friend: { name: string; archetype: string; match: number; trait: string } }) {
  return (
    <View style={styles.friend}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendInitial}>{friend.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.friendInfo}>
        <View style={styles.friendTop}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendMatch}>{friend.match}%</Text>
        </View>
        <Text style={styles.friendArchetype}>{friend.archetype}</Text>
        <Text style={styles.friendTrait}>{friend.trait}</Text>
      </View>
    </View>
  );
}

export default function Profile() {
  const { data } = useQuery({ queryKey: ['taste'], queryFn: async () => (await api.get('/profile/taste')).data });
  const rawSignals = Object.entries(data?.preferred_genres ?? {})
    .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
    .map(([name]) => name);
  const signals = rawSignals.length ? rawSignals.slice(0, 7) : fallbackSignals.slice(0, 7);
  const archetype = useMemo(() => pickArchetype(signals), [signals]);
  const totalSignals = Math.max(rawSignals.length, signals.length);
  const rareScore = Math.max(3, 11 - Math.min(totalSignals, 8));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <View style={styles.hero}>
          <View style={styles.aura} />
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>Profilo personale</Text>
              <Text style={styles.profileStatus}>Identita in evoluzione</Text>
            </View>
          </View>
          <Text style={styles.kicker}>IDENTITA</Text>
          <Text style={styles.title}>{archetype}</Text>
          <Text style={styles.copy}>
            Ti muovi verso storie intense, atmosferiche, con tensione emotiva e domande piu grandi della trama.
          </Text>
        </View>

        <View style={styles.floatZone}>
          <Text style={styles.sectionTitle}>Segnali vivi</Text>
          <View style={styles.signalCloud}>
            {signals.slice(0, 6).map((signal, index) => <FloatingSignal key={`${signal}-${index}`} label={signal} index={index} />)}
          </View>
        </View>

        <View style={styles.observation}>
          <Text style={styles.sectionKicker}>Evoluzione</Text>
          <Text style={styles.observationText}>Il tuo profilo sta diventando piu selettivo: meno catalogo, piu atmosfera.</Text>
          <Text style={styles.observationMuted}>GAAS rileva una preferenza crescente per narrazioni con identita, isolamento e tensione morale.</Text>
        </View>

        <View style={styles.social}>
          <View style={styles.socialTop}>
            <View>
              <Text style={styles.sectionKicker}>Cerchia</Text>
              <Text style={styles.sectionTitle}>Amici compatibili</Text>
            </View>
            <View style={styles.addFriend}>
              <Text style={styles.addFriendText}>Aggiungi</Text>
            </View>
          </View>
          <Text style={styles.body}>Confronta segnali e compatibilita culturale. Presto potrai vedere cosa stanno scegliendo i tuoi amici.</Text>
          <View style={styles.friendList}>
            {friendProfiles.map((friend) => <FriendProfile key={friend.name} friend={friend} />)}
          </View>
        </View>

        <View style={styles.rare}>
          <Text style={styles.rareNumber}>{rareScore}%</Text>
          <View style={styles.rareCopy}>
            <Text style={styles.sectionKicker}>Tratto raro</Text>
            <Text style={styles.body}>Pochi utenti condividono questa combinazione di intensita emotiva e curiosita speculativa.</Text>
          </View>
        </View>

        <View style={styles.patterns}>
          <Text style={styles.sectionTitle}>Pattern emotivi</Text>
          <View style={styles.patternList}>
            {fallbackPatterns.map((pattern) => (
              <View key={pattern} style={styles.pattern}>
                <Text style={styles.patternDot}>-</Text>
                <Text style={styles.patternText}>{pattern}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={`${Math.max(10, totalSignals * 7)}`} label="decisioni lette" />
          <Stat value={`${Math.max(4, Math.round(totalSignals / 2))}`} label="Super stimati" />
          <Stat value="Oracle" label="prossimo livello" />
        </View>

        <View style={styles.reward}>
          <Text style={styles.sectionKicker}>Sblocco futuro</Text>
          <Text style={styles.rewardTitle}>Minimalismo Emotivo</Text>
          <Text style={styles.body}>Un tratto nascosto apparira quando GAAS avra abbastanza scelte per distinguere desiderio, curiosita e impulso.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  content: { paddingHorizontal: 18, paddingTop: 34, paddingBottom: 120 },
  shell: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 },
  hero: {
    minHeight: 265,
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  aura: {
    position: 'absolute',
    width: 260,
    height: 260,
    right: -92,
    top: -82,
    borderRadius: 130,
    backgroundColor: 'rgba(214,255,63,0.18)'
  },
  kicker: { color: '#D6FF3F', fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  title: { color: '#F5F5F5', fontSize: 42, lineHeight: 45, fontWeight: '900', letterSpacing: 0 },
  copy: { color: '#DADADA', fontSize: 16, lineHeight: 23, fontWeight: '700', maxWidth: 390 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#D6FF3F'
  },
  avatarText: { color: '#0F1115', fontSize: 30, fontWeight: '900' },
  profileMeta: { gap: 3 },
  profileName: { color: '#F5F5F5', fontSize: 16, fontWeight: '900' },
  profileStatus: { color: '#AEB3BA', fontSize: 12, fontWeight: '800' },
  sectionKicker: { color: '#8F949C', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  body: { color: '#BFC3CA', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  floatZone: { gap: 12, paddingTop: 4 },
  sectionTitle: { color: '#F5F5F5', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  signalCloud: { minHeight: 136, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'center' },
  signal: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.22)'
  },
  signalText: { color: '#F5F5F5', fontSize: 13, fontWeight: '900' },
  observation: {
    gap: 9,
    padding: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)'
  },
  observationText: { color: '#F5F5F5', fontSize: 21, lineHeight: 26, fontWeight: '900' },
  observationMuted: { color: '#AEB3BA', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  rare: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  rareNumber: { color: '#D6FF3F', fontSize: 56, lineHeight: 60, fontWeight: '900' },
  rareCopy: { flex: 1, gap: 5 },
  patterns: { gap: 12 },
  patternList: { gap: 9 },
  pattern: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  patternDot: { color: '#D6FF3F', fontSize: 20, lineHeight: 20 },
  patternText: { color: '#F5F5F5', fontSize: 15, fontWeight: '800' },
  social: {
    gap: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)'
  },
  socialTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  addFriend: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6FF3F'
  },
  addFriendText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  friendList: { gap: 10 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161A20',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.25)'
  },
  friendInitial: { color: '#D6FF3F', fontSize: 16, fontWeight: '900' },
  friendInfo: { flex: 1, gap: 2 },
  friendTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  friendName: { color: '#F5F5F5', fontSize: 15, fontWeight: '900' },
  friendMatch: { color: '#D6FF3F', fontSize: 13, fontWeight: '900' },
  friendArchetype: { color: '#BFC3CA', fontSize: 12, fontWeight: '900' },
  friendTrait: { color: '#8F949C', fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161A20'
  },
  statValue: { color: '#F5F5F5', fontSize: 23, fontWeight: '900' },
  statLabel: { color: '#9EA4AD', fontSize: 11, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase' },
  reward: {
    gap: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.18)'
  },
  rewardTitle: { color: '#F5F5F5', fontSize: 26, lineHeight: 30, fontWeight: '900' }
});


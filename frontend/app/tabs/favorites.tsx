import { useMemo } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { decisionContent } from '@/data/decisionContent';
import { Content } from '@/types/content';

function signalText(item: Content) {
  const signals = [...(item.moods ?? []), ...(item.genres ?? []), ...(item.tags ?? [])].slice(0, 3);
  if (!signals.length) return 'risonanza emotiva + scelta personale + segnale forte';
  return `${signals.join(' + ')}`;
}

function CoreSignal({ item, index }: { item: Content; index: number }) {
  const image = item.banner_url || item.image_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba';
  return (
    <View style={[styles.core, index === 0 && styles.corePrimary]}>
      <ImageBackground source={{ uri: image }} resizeMode="cover" style={styles.coreImage}>
        <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.96)']} style={styles.coreShade}>
          <Text style={styles.coreKicker}>Segnale core {index + 1}</Text>
          <Text numberOfLines={2} style={styles.coreTitle}>{item.title}</Text>
          <Text numberOfLines={2} style={styles.coreSignal}>Rilevato: {signalText(item)}</Text>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

function LockedSignal({ index }: { index: number }) {
  return (
    <View style={styles.locked}>
      <View style={styles.lockedBlur} />
      <Lock color="#D6FF3F" size={18} />
      <Text style={styles.lockedText}>Segnale nascosto {index + 1}</Text>
    </View>
  );
}

function Thread({ items }: { items: Content[] }) {
  const names = items.slice(0, 4).map((item) => item.title);
  return (
    <View style={styles.thread}>
      {names.map((name, index) => (
        <View key={name} style={styles.threadItem}>
          <Text numberOfLines={1} style={styles.threadName}>{name}</Text>
          {index < names.length - 1 && <Text style={styles.threadArrow}>{'->'}</Text>}
        </View>
      ))}
    </View>
  );
}

export default function Favorites() {
  const { data } = useQuery({ queryKey: ['favorites'], queryFn: async () => (await api.get<Content[]>('/favorites')).data });
  const vaultItems = useMemo(() => {
    const live = data ?? [];
    return live.length >= 3 ? live : decisionContent.slice(0, 5);
  }, [data]);
  const core = vaultItems.slice(0, 3);
  const hiddenCount = Math.max(6, vaultItems.length + 7);
  const heroImage = core[0]?.banner_url || core[0]?.image_url || 'https://images.unsplash.com/photo-1519608487953-e999c86e7455';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <ImageBackground source={{ uri: heroImage }} resizeMode="cover" style={styles.hero}>
          <LinearGradient colors={['rgba(15,17,21,0.22)', 'rgba(15,17,21,0.76)', '#0F1115']} style={styles.heroShade}>
            <Text style={styles.kicker}>VAULT</Text>
            <Text style={styles.title}>Le storie che ti definiscono.</Text>
            <Text style={styles.subtitle}>Qui vivono i segnali piu forti: non preferiti, ma frammenti del tuo DNA culturale.</Text>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segnali core</Text>
          <Text style={styles.sectionCopy}>I primi tre Super pesano di piu: indicano dove risuoni davvero.</Text>
          <View style={styles.coreList}>
            {core.map((item, index) => <CoreSignal key={item.id} item={item} index={index} />)}
          </View>
        </View>

        <View style={styles.hiddenTrait}>
          <Text style={styles.kicker}>Tratto nascosto</Text>
          <Text style={styles.hiddenTitle}>Malinconia Cosmica</Text>
          <Text style={styles.sectionCopy}>Risuoni con storie in cui la solitudine diventa enorme, quasi spaziale, ma resta profondamente umana.</Text>
        </View>

        <View style={styles.analysis}>
          <Text style={styles.kicker}>Analisi emotiva</Text>
          <Text style={styles.analysisTitle}>I tuoi Super indicano attrazione verso mondi intensi, isolamento emotivo e conflitti interiori.</Text>
          <Text style={styles.analysisCopy}>Questo archivio conserva le ragioni per cui qualcosa ti resta addosso.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thread del gusto</Text>
          <Thread items={vaultItems} />
        </View>

        <View style={styles.section}>
          <View style={styles.lockedTop}>
            <View>
              <Text style={styles.sectionTitle}>Segnali bloccati</Text>
              <Text style={styles.sectionCopy}>+{hiddenCount} segnali nascosti nel tuo archivio completo.</Text>
            </View>
            <View style={styles.unlock}>
              <Text style={styles.unlockText}>Futuro</Text>
            </View>
          </View>
          <View style={styles.lockedGrid}>
            {[0, 1, 2, 3].map((index) => <LockedSignal key={index} index={index} />)}
          </View>
        </View>

        <View style={styles.premium}>
          <Text style={styles.premiumTitle}>Espansione Vault</Text>
          <Text style={styles.sectionCopy}>In futuro potrai sbloccare analisi profonda, compatibilita emotiva con amici e cluster nascosti di raccomandazioni.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  content: { paddingBottom: 120 },
  shell: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 18, paddingHorizontal: 18 },
  hero: { height: 310, marginHorizontal: -18, overflow: 'hidden', backgroundColor: '#111318' },
  heroShade: { flex: 1, justifyContent: 'flex-end', gap: 10, padding: 22 },
  kicker: { color: '#D6FF3F', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#F5F5F5', fontSize: 42, lineHeight: 45, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: '#DADADA', fontSize: 15, lineHeight: 22, fontWeight: '800', maxWidth: 390 },
  section: { gap: 12 },
  sectionTitle: { color: '#F5F5F5', fontSize: 25, lineHeight: 29, fontWeight: '900' },
  sectionCopy: { color: '#AEB3BA', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  coreList: { gap: 12 },
  core: {
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  corePrimary: { borderColor: 'rgba(214,255,63,0.42)' },
  coreImage: { flex: 1 },
  coreShade: { flex: 1, justifyContent: 'flex-end', gap: 7, padding: 16 },
  coreKicker: { color: '#D6FF3F', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  coreTitle: { color: '#F5F5F5', fontSize: 27, lineHeight: 31, fontWeight: '900' },
  coreSignal: { color: '#DADADA', fontSize: 13, lineHeight: 19, fontWeight: '800' },
  analysis: {
    gap: 9,
    padding: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)'
  },
  analysisTitle: { color: '#F5F5F5', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  analysisCopy: { color: '#AEB3BA', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  thread: { gap: 8 },
  threadItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threadName: { flex: 1, color: '#F5F5F5', fontSize: 15, fontWeight: '900' },
  threadArrow: { color: '#D6FF3F', fontSize: 14, fontWeight: '900' },
  hiddenTrait: {
    gap: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: 'rgba(214,255,63,0.18)'
  },
  hiddenTitle: { color: '#F5F5F5', fontSize: 29, lineHeight: 33, fontWeight: '900' },
  lockedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  unlock: { height: 34, borderRadius: 17, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D6FF3F' },
  unlockText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  lockedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  locked: {
    width: '48%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)'
  },
  lockedBlur: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(214,255,63,0.10)'
  },
  lockedText: { color: '#AEB3BA', fontSize: 12, fontWeight: '900' },
  premium: {
    gap: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#F5F5F5'
  },
  premiumTitle: { color: '#0F1115', fontSize: 25, lineHeight: 29, fontWeight: '900' }
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Bot, Sparkles } from 'lucide-react-native';
import { api } from '@/services/api';

const quickIntents = [
  'Horror psicologico',
  'Emotivo ma hopeful',
  'Sci-fi intelligente',
  'Qualcosa che non annoi',
  'Dark ma elegante'
];

const intensity = ['leggero', 'medio', 'intenso'];
const energy = ['emotivo', 'cerebrale', 'teso', 'confortante'];
const discovery = ['gemme nascoste', 'scelte popolari', 'mix'];
const categories = ['film', 'serie', 'anime', 'libri', 'giochi', 'podcast'];

const genreMap: Record<string, string[]> = {
  'horror psicologico': ['horror', 'thriller', 'mistero'],
  'emotivo ma hopeful': ['dramma', 'avventura', 'fantascienza'],
  'sci-fi intelligente': ['fantascienza', 'thriller', 'avventura'],
  'qualcosa che non annoi': ['thriller', 'avventura', 'mistero'],
  'dark ma elegante': ['noir', 'dramma', 'thriller']
};

export default function Onboarding() {
  const [intent, setIntent] = useState('Voglio qualcosa di oscuro ma intelligente.');
  const [selectedIntensity, setSelectedIntensity] = useState('medio');
  const [selectedEnergy, setSelectedEnergy] = useState<string[]>(['cerebrale', 'teso']);
  const [selectedDiscovery, setSelectedDiscovery] = useState('mix');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['film', 'serie', 'libri']);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);

  const interpreted = useMemo(() => {
    const key = Object.keys(genreMap).find((entry) => intent.toLowerCase().includes(entry.split(' ')[0]));
    const genres = key ? genreMap[key] : ['fantascienza', 'thriller', 'dramma'];
    const moods = [...selectedEnergy, selectedIntensity, selectedDiscovery].filter(Boolean);
    return { genres, moods };
  }, [intent, selectedDiscovery, selectedEnergy, selectedIntensity]);

  function toggle(value: string, state: string[], setter: (v: string[]) => void) {
    setter(state.includes(value) ? state.filter((x) => x !== value) : [...state, value]);
  }

  async function finish() {
    setSaving(true);
    setBuilding(true);
    await api.post('/onboarding', {
      favorite_genres: interpreted.genres,
      disliked_genres: selectedEnergy.includes('confortante') ? ['horror'] : [],
      favorite_titles: ['Interstellar', 'Death Note', 'Project Hail Mary'],
      preferred_moods: interpreted.moods,
      preferred_categories: selectedCategories
    });
    await api.post('/admin/ingestion/seed');
    setTimeout(() => {
      router.replace('/tabs/feed');
    }, 900);
  }

  if (building) {
    return (
      <View style={styles.buildScreen}>
        <View style={styles.buildGlow} />
        <View style={styles.buildPanel}>
          <Sparkles color="#D6FF3F" size={28} />
          <Text style={styles.buildTitle}>Ho capito il mood.</Text>
          <Text style={styles.buildCopy}>Meno scrolling. Tre scelte forti.</Text>
          <ActivityIndicator color="#D6FF3F" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient colors={['rgba(214,255,63,0.08)', 'rgba(15,17,21,0)']} style={styles.ambient} />
      <View style={styles.shell}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Primo profiling</Text>
          <Text style={styles.title}>Dimmi cosa vuoi vivere adesso.</Text>
          <Text style={styles.copy}>Non e un questionario. GAAS ti fa poche domande e costruisce la tua prima sessione.</Text>
        </View>

        <View style={styles.chat}>
          <View style={styles.aiBubble}>
            <View style={styles.botMark}><Bot color="#D6FF3F" size={17} /></View>
            <Text style={styles.aiText}>Che sensazione cerchi stasera?</Text>
          </View>
          <TextInput
            style={styles.intentInput}
            value={intent}
            onChangeText={setIntent}
            placeholder="Scrivi un mood, un titolo, una sensazione..."
            placeholderTextColor="#7D8491"
            multiline
          />
          <View style={styles.intentRow}>
            {quickIntents.map((entry) => (
              <Pressable key={entry} style={styles.intentChip} onPress={() => setIntent(entry)}>
                <Text style={styles.intentChipText}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.question}>Lo vuoi leggero o intenso?</Text>
          <View style={styles.wrap}>
            {intensity.map((entry) => (
              <Pressable key={entry} onPress={() => setSelectedIntensity(entry)} style={[styles.chip, selectedIntensity === entry && styles.chipActive]}>
                <Text style={[styles.chipText, selectedIntensity === entry && styles.chipTextActive]}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.question}>Piu emotivo o piu cerebrale?</Text>
          <View style={styles.wrap}>
            {energy.map((entry) => (
              <Pressable key={entry} onPress={() => toggle(entry, selectedEnergy, setSelectedEnergy)} style={[styles.chip, selectedEnergy.includes(entry) && styles.chipActive]}>
                <Text style={[styles.chipText, selectedEnergy.includes(entry) && styles.chipTextActive]}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.question}>Hidden gem o scelte popolari?</Text>
          <View style={styles.wrap}>
            {discovery.map((entry) => (
              <Pressable key={entry} onPress={() => setSelectedDiscovery(entry)} style={[styles.chip, selectedDiscovery === entry && styles.chipActive]}>
                <Text style={[styles.chipText, selectedDiscovery === entry && styles.chipTextActive]}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.question}>Quali mondi includo?</Text>
          <View style={styles.wrap}>
            {categories.map((entry) => (
              <Pressable key={entry} onPress={() => toggle(entry, selectedCategories, setSelectedCategories)} style={[styles.chip, selectedCategories.includes(entry) && styles.chipActive]}>
                <Text style={[styles.chipText, selectedCategories.includes(entry) && styles.chipTextActive]}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryKicker}>sessione interpretata</Text>
          <Text style={styles.summaryText}>{intent}</Text>
          <Text style={styles.summaryMeta}>{[...interpreted.genres, ...interpreted.moods].slice(0, 6).join(' / ')}</Text>
        </View>

        <Pressable style={styles.primary} onPress={finish} disabled={saving}>
          {saving ? <ActivityIndicator color="#0F1115" /> : (
            <>
              <Text style={styles.primaryText}>Inizia a scegliere</Text>
              <ArrowRight color="#0F1115" size={18} />
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  ambient: { position: 'absolute', top: -80, left: 0, right: 0, height: 260 },
  content: { padding: 18, paddingTop: 34, paddingBottom: 44 },
  shell: { width: '100%', maxWidth: 500, alignSelf: 'center', gap: 16 },
  hero: { gap: 10, paddingBottom: 4 },
  kicker: { color: '#7D8491', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#F5F5F5', fontSize: 42, lineHeight: 46, fontWeight: '900', letterSpacing: 0 },
  copy: { color: '#B8BCC6', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  chat: { gap: 10, padding: 12, borderRadius: 22, backgroundColor: 'rgba(24,28,36,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  aiBubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '92%', padding: 12, borderRadius: 18, backgroundColor: 'rgba(29,34,43,0.86)' },
  botMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(214,255,63,0.10)' },
  aiText: { color: '#F5F5F5', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  intentInput: { minHeight: 86, color: '#F5F5F5', fontSize: 16, lineHeight: 22, fontWeight: '800', borderRadius: 18, padding: 14, backgroundColor: '#141820', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  intentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intentChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: 'rgba(232,230,223,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  intentChipText: { color: '#B8BCC6', fontSize: 12, fontWeight: '900' },
  questionBlock: { gap: 9 },
  question: { color: '#F5F5F5', fontSize: 15, fontWeight: '900' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#181C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: '#D6FF3F', borderColor: '#D6FF3F' },
  chipText: { color: '#B8BCC6', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#0F1115' },
  summaryBox: { gap: 6, padding: 14, borderRadius: 18, backgroundColor: 'rgba(29,34,43,0.62)', borderWidth: 1, borderColor: 'rgba(214,255,63,0.14)' },
  summaryKicker: { color: '#7D8491', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  summaryText: { color: '#F5F5F5', fontSize: 16, lineHeight: 22, fontWeight: '900' },
  summaryMeta: { color: '#D6FF3F', fontSize: 12, lineHeight: 18, fontWeight: '900' },
  primary: { minHeight: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, backgroundColor: '#D6FF3F', marginTop: 4 },
  primaryText: { color: '#0F1115', fontWeight: '900', fontSize: 15 },
  buildScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0F1115' },
  buildGlow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(214,255,63,0.10)' },
  buildPanel: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 12, padding: 24, borderRadius: 24, backgroundColor: 'rgba(24,28,36,0.82)', borderWidth: 1, borderColor: 'rgba(214,255,63,0.18)' },
  buildTitle: { color: '#F5F5F5', fontSize: 34, lineHeight: 38, fontWeight: '900', textAlign: 'center' },
  buildCopy: { color: '#B8BCC6', fontSize: 15, lineHeight: 21, fontWeight: '800', textAlign: 'center' }
});

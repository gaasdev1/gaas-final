import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Sparkles } from 'lucide-react-native';

const examples = [
  'Voglio qualcosa di oscuro ma intelligente.',
  'Mi serve un film che tenga la tensione.',
  'Qualcosa di emotivo ma non deprimente.',
  'Anime con energia solitaria e bellissima.',
  'Un libro che sembri spazio e sopravvivenza.'
];

export default function Splash() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true })
      ]).start();
      setExampleIndex((value) => (value + 1) % examples.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [fade]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['rgba(214,255,63,0.10)', 'rgba(15,17,21,0)', 'rgba(15,17,21,0.88)']} style={styles.ambient} />
      <View style={styles.shell}>
        <View style={styles.top}>
          <View style={styles.mark}>
            <Sparkles color="#D6FF3F" size={17} />
          </View>
          <View>
            <Text style={styles.logo}>GAAS</Text>
            <Text style={styles.kicker}>AI decision system</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Smetti di scorrere.{'\n'}Inizia a scegliere.</Text>
          <Text style={styles.copy}>
            GAAS capisce il tuo gusto e il mood del momento. Poi ti dice cosa guardare, leggere, giocare o ascoltare, e perche.
          </Text>
          <Animated.View style={[styles.intentBubble, { opacity: fade }]}>
            <Text style={styles.intentLabel}>stasera potresti scrivere</Text>
            <Text style={styles.intentText}>{examples[exampleIndex]}</Text>
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.promiseRow}>
            <Text style={styles.promise}>mood</Text>
            <Text style={styles.promiseDot}>/</Text>
            <Text style={styles.promise}>gusto</Text>
            <Text style={styles.promiseDot}>/</Text>
            <Text style={styles.promise}>Top 3</Text>
          </View>
          <Link href="/login" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Trova la mia prossima scelta</Text>
              <ArrowRight color="#0F1115" size={18} />
            </Pressable>
          </Link>
          <Link href="/login" asChild>
            <Pressable style={styles.secondary}>
              <Text style={styles.secondaryText}>Ho gia un account</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115', overflow: 'hidden' },
  ambient: { position: 'absolute', top: -80, left: -80, right: -80, height: 380 },
  shell: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 34, paddingBottom: 24 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(214,255,63,0.10)', borderWidth: 1, borderColor: 'rgba(214,255,63,0.22)' },
  logo: { color: '#F5F5F5', fontSize: 16, fontWeight: '900', letterSpacing: 0 },
  kicker: { color: '#7D8491', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  hero: { gap: 18 },
  title: { color: '#F5F5F5', fontSize: 54, lineHeight: 58, fontWeight: '900', letterSpacing: 0 },
  copy: { color: '#B8BCC6', fontSize: 16, lineHeight: 24, maxWidth: 430, fontWeight: '700' },
  intentBubble: { gap: 8, padding: 16, borderRadius: 18, backgroundColor: 'rgba(29,34,43,0.70)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  intentLabel: { color: '#7D8491', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  intentText: { color: '#F5F5F5', fontSize: 18, lineHeight: 24, fontWeight: '900' },
  bottom: { gap: 12 },
  promiseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingBottom: 3 },
  promise: { color: '#B8BCC6', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  promiseDot: { color: '#D6FF3F', fontSize: 12, fontWeight: '900' },
  cta: { minHeight: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, backgroundColor: '#D6FF3F', paddingHorizontal: 18 },
  ctaText: { color: '#0F1115', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  secondary: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(29,34,43,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  secondaryText: { color: '#F5F5F5', fontWeight: '900' }
});

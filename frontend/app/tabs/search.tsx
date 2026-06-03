import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Send, Sparkles, Users } from 'lucide-react-native';
import { decisionContent } from '@/data/decisionContent';
import { Content } from '@/types/content';

type Mode = 'forYou' | 'community';

const comments = [
  'Mi ha lasciato addosso una sensazione stranissima.',
  'Questo e da Super, non da semplice like.',
  'Perfetto per chi ama storie lente ma enormi.',
  'Non sembra mainstream, ma ti entra in testa.'
];

function heroImage(item: Content) {
  return item.banner_url || item.image_url || 'https://images.unsplash.com/photo-1519608487953-e999c86e7455';
}

function modeReason(item: Content, mode: Mode, index: number) {
  const signals = [...(item.moods ?? []), ...(item.genres ?? [])].slice(0, 3);
  if (mode === 'community') {
    return `Sta salendo tra profili che reagiscono a ${signals.join(', ') || 'storie intense'}.`;
  }
  return `Il tuo profilo sta mostrando attrazione verso ${signals.join(', ') || 'segnali emotivi simili'}.`;
}

function FypCard({ item, mode, index }: { item: Content; mode: Mode; index: number }) {
  const superCount = mode === 'community' ? 900 + index * 137 : 120 + index * 46;
  const commentCount = mode === 'community' ? 80 + index * 18 : 12 + index * 5;
  const match = mode === 'community' ? 'Community' : `${92 - index * 3}% compatibile`;

  return (
    <View style={styles.card}>
      <ImageBackground source={{ uri: heroImage(item) }} resizeMode="cover" style={styles.image}>
        <LinearGradient colors={['rgba(15,17,21,0.08)', 'rgba(15,17,21,0.38)', 'rgba(15,17,21,0.98)']} style={styles.shade}>
          <View style={styles.modePill}>
            {mode === 'community' ? <Users color="#0F1115" size={14} /> : <Sparkles color="#0F1115" size={14} />}
            <Text style={styles.modeText}>{match}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.action}>
              <Heart color="#F5F5F5" size={22} />
              <Text style={styles.actionText}>{superCount}</Text>
            </Pressable>
            <Pressable style={styles.actionHot}>
              <Sparkles color="#0F1115" size={22} />
              <Text style={styles.actionHotText}>Super</Text>
            </Pressable>
            <Pressable style={styles.action}>
              <MessageCircle color="#F5F5F5" size={22} />
              <Text style={styles.actionText}>{commentCount}</Text>
            </Pressable>
            <Pressable style={styles.action}>
              <Send color="#F5F5F5" size={20} />
            </Pressable>
          </View>

          <View style={styles.copy}>
            <Text style={styles.kicker}>{mode === 'community' ? 'SEGNALE COMMUNITY' : 'PER TE'}</Text>
            <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
            <Text numberOfLines={2} style={styles.reason}>{modeReason(item, mode, index)}</Text>
            <View style={styles.comment}>
              <Text style={styles.commentName}>{mode === 'community' ? 'Profilo simile' : 'GAAS'}</Text>
              <Text numberOfLines={1} style={styles.commentText}>{comments[index % comments.length]}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

export default function SearchScreen() {
  const [mode, setMode] = useState<Mode>('forYou');
  const feed = useMemo(() => {
    const base = mode === 'forYou'
      ? [...decisionContent.slice(1), decisionContent[0]]
      : [...decisionContent].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    return [...base, ...base.slice(0, 4)];
  }, [mode]);

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMode('forYou')} style={[styles.switchButton, mode === 'forYou' && styles.switchActive]}>
            <Text style={[styles.switchText, mode === 'forYou' && styles.switchTextActive]}>Per te</Text>
          </Pressable>
          <Pressable onPress={() => setMode('community')} style={[styles.switchButton, mode === 'community' && styles.switchActive]}>
            <Text style={[styles.switchText, mode === 'community' && styles.switchTextActive]}>Community</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={590}
        decelerationRate="fast"
      >
        {feed.map((item, index) => <FypCard key={`${mode}-${item.id}-${index}`} item={item} mode={mode} index={index} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  topbar: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15,17,21,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E6DF',
    borderWidth: 1,
    borderColor: '#D6FF3F'
  },
  logoText: { color: '#0F1115', fontSize: 18, fontWeight: '900' },
  switcher: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 22,
    backgroundColor: '#181C24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  switchButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  switchActive: { backgroundColor: '#D6FF3F' },
  switchText: { color: '#B8BCC6', fontSize: 13, fontWeight: '900' },
  switchTextActive: { color: '#0F1115' },
  feed: { flex: 1 },
  feedContent: { gap: 14, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110 },
  card: {
    height: 576,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#181C24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  image: { flex: 1 },
  shade: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  modePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: '#D6FF3F'
  },
  modeText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 96,
    alignItems: 'center',
    gap: 12
  },
  action: {
    minWidth: 50,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(20,24,32,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  actionHot: {
    minWidth: 56,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#D6FF3F'
  },
  actionText: { color: '#F5F5F5', fontSize: 10, fontWeight: '900' },
  actionHotText: { color: '#0F1115', fontSize: 10, fontWeight: '900' },
  copy: { paddingRight: 70, gap: 7 },
  kicker: { color: '#D6FF3F', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#F5F5F5', fontSize: 33, lineHeight: 36, fontWeight: '900', letterSpacing: 0 },
  reason: { color: '#B8BCC6', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  comment: {
    marginTop: 5,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(20,24,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  commentName: { color: '#D6FF3F', fontSize: 11, fontWeight: '900' },
  commentText: { color: '#F5F5F5', fontSize: 12, fontWeight: '800', marginTop: 2 }
});

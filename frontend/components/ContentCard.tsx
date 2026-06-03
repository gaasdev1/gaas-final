import { useState } from 'react';
import { ImageBackground, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronDown, Gamepad2, Library, MonitorPlay, Music2, Play, Search, ShoppingBag, Sparkles, Tv, X } from 'lucide-react-native';
import { Content } from '@/types/content';

function categoryLabel(type: string) {
  return {
    movie: 'Film',
    tv: 'Serie',
    anime: 'Anime',
    manga: 'Manga',
    game: 'Gioco',
    book: 'Libro',
    podcast: 'Podcast'
  }[type] ?? type;
}

export function platformHints(item: Content) {
  if (item.content_type === 'movie' || item.content_type === 'tv') return ['JustWatch', 'Prime Video', 'Apple TV'];
  if (item.content_type === 'anime' || item.content_type === 'manga') return ['Crunchyroll', 'Netflix', 'AniList'];
  if (item.content_type === 'game') return ['Steam', 'PlayStation', 'Xbox'];
  if (item.content_type === 'book') return ['Google Books', 'Open Library', 'Kindle'];
  if (item.content_type === 'podcast') return ['Spotify', 'Apple Podcasts', 'YouTube'];
  return [item.source];
}

function platformBrand(platform: string) {
  const key = platform.toLowerCase();
  if (key.includes('netflix')) return { Icon: MonitorPlay, bg: '#E50914', fg: '#FFFFFF' };
  if (key.includes('prime')) return { Icon: Play, bg: '#00A8E1', fg: '#020617' };
  if (key.includes('apple')) return { Icon: Tv, bg: '#E8E6DF', fg: '#0F1115' };
  if (key.includes('crunchyroll')) return { Icon: MonitorPlay, bg: '#F47521', fg: '#050505' };
  if (key.includes('steam')) return { Icon: Gamepad2, bg: '#66C0F4', fg: '#050505' };
  if (key.includes('playstation')) return { Icon: Gamepad2, bg: '#006FCD', fg: '#FFFFFF' };
  if (key.includes('xbox')) return { Icon: Gamepad2, bg: '#107C10', fg: '#FFFFFF' };
  if (key.includes('spotify')) return { Icon: Music2, bg: '#1DB954', fg: '#050505' };
  if (key.includes('youtube')) return { Icon: Play, bg: '#FF0033', fg: '#FFFFFF' };
  if (key.includes('kindle')) return { Icon: BookOpen, bg: '#FF9900', fg: '#050505' };
  if (key.includes('google')) return { Icon: Search, bg: '#4285F4', fg: '#FFFFFF' };
  if (key.includes('open')) return { Icon: Library, bg: '#7C3AED', fg: '#FFFFFF' };
  return { Icon: ShoppingBag, bg: '#E8E6DF', fg: '#0F1115' };
}

function previewUrl(item: Content) {
  const title = item.title;
  if (item.content_type === 'game') {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} gameplay`)}`;
  }
  if (item.content_type === 'book' || item.content_type === 'manga') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${title} libro recensione trama opinioni`)}`;
  }
  if (item.content_type === 'podcast') {
    return item.external_url ?? `https://open.spotify.com/search/${encodeURIComponent(title)}`;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer ufficiale`)}`;
}

function previewLabel(item: Content) {
  return item.content_type === 'podcast' ? 'Ascolta' : 'Anteprima';
}

function emotionalCopy(item: Content) {
  const signals = [...(item.moods ?? []), ...(item.genres ?? []), ...(item.tags ?? [])].slice(0, 3);
  if (signals.length >= 2) return `Freddo, preciso, vicino a ${signals.join(', ')}.`;
  if (item.content_type === 'book') return 'Una storia scelta per lasciare una traccia mentale, non solo intrattenere.';
  if (item.content_type === 'podcast') return 'Una conversazione da ascoltare quando vuoi entrare in un tema, non solo riempire silenzio.';
  return 'Una traiettoria emotiva da attraversare, non solo da guardare.';
}

function communitySignal(item: Content) {
  const lead = item.moods?.[0] ?? item.genres?.[0] ?? 'questo segnale';
  if (item.content_type === 'book') return `Molto Super tra profili attratti da ${lead}.`;
  if (item.content_type === 'podcast') return `Molto ascoltato da profili attratti da ${lead}.`;
  return `Reazioni alte tra profili vicini a ${lead}.`;
}

function aiSignals(item: Content) {
  const signals = [...(item.genres ?? []), ...(item.moods ?? []), ...(item.tags ?? [])].filter(Boolean);
  const first = signals[0] ?? 'segnale emotivo';
  const second = signals[1] ?? 'profilo introspettivo';
  const third = signals[2] ?? 'tensione lenta';
  return [
    `Alto match con ${first}`,
    `Molto Super tra profili ${second}`,
    `Segnale forte: ${third}`
  ];
}

export function ContentCard({ item, onPlatformOpen, onHold }: { item: Content; onPlatformOpen?: () => void; onHold?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const heroImage = item.banner_url || item.image_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba';
  const meta = [
    { label: categoryLabel(item.content_type), tone: 'category' },
    { label: `${item.release_year ?? 'Nuovo'}`, tone: 'year' },
    { label: item.rating ? `${item.rating.toFixed(1)}` : undefined, tone: 'rating' }
  ].filter((entry) => entry.label);
  const platforms = platformHints(item);
  async function openSource() {
    onPlatformOpen?.();
    await Linking.openURL(previewUrl(item));
  }

  return (
    <View style={styles.card}>
      <ImageBackground source={{ uri: heroImage }} resizeMode="cover" style={styles.image}>
        <LinearGradient colors={['rgba(15,17,21,0.02)', 'rgba(15,17,21,0.28)', 'rgba(15,17,21,0.96)']} style={styles.imageShade}>
          <View style={styles.metaRow}>
            {meta.map((entry) => (
              <Text key={entry.label} style={[styles.metaPill, entry.tone === 'rating' && styles.ratingPill]}>
                {entry.label}
              </Text>
            ))}
          </View>
          <Pressable style={styles.previewFloat} onPress={openSource}>
            <Play color="#0F1115" size={15} fill="#0F1115" />
            <Text style={styles.previewFloatText}>{previewLabel(item)}</Text>
          </Pressable>
        </LinearGradient>
      </ImageBackground>
      <View style={styles.copy}>
        <View style={styles.categoryLine}>
          <Text style={styles.cardCategory}>{categoryLabel(item.content_type)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.aiLine}>{emotionalCopy(item)}</Text>
        <Text numberOfLines={3} style={styles.summary}>{item.description}</Text>

        <View style={styles.infoRow}>
          <Pressable style={styles.moreButton} onPress={() => setExpanded((value) => !value)} onLongPress={onHold}>
            <Text style={styles.moreText}>Analisi</Text>
            <ChevronDown color="#D6FF3F" size={16} style={expanded && styles.moreIconOpen} />
          </Pressable>
          <View style={styles.platformInline}>
            {platforms.slice(0, 3).map((platform) => {
              const brand = platformBrand(platform);
              const Icon = brand.Icon;
              return (
                <View key={platform} style={[styles.platformMini, { backgroundColor: brand.bg }]}>
                  <Icon color={brand.fg} size={12} strokeWidth={2.8} />
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.signalArea}>
          {aiSignals(item).map((signal) => (
            <View key={signal} style={styles.signalLine}>
              <Sparkles color="#AAB4C3" size={11} />
              <Text numberOfLines={1} style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </View>

        <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.details}>
              <View style={styles.modalTop}>
                <Text style={styles.modalTitle}>{item.title}</Text>
                <Pressable style={styles.closeButton} onPress={() => setExpanded(false)}>
                  <X color="#F5F5F5" size={18} />
                </Pressable>
              </View>
              <Text style={styles.modalSummary}>{item.description}</Text>
              <Text style={styles.modalInsight}>{emotionalCopy(item)}</Text>
              <Text style={styles.modalCommunity}>{communitySignal(item)}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Categoria</Text>
              <Text style={styles.detailValue}>{categoryLabel(item.content_type)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Anno</Text>
              <Text style={styles.detailValue}>{item.release_year ?? 'Nuovo'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valutazione</Text>
              <Text style={styles.detailValue}>{item.rating ? item.rating.toFixed(1) : 'N/D'}</Text>
            </View>
            <View style={styles.tagRow}>
              {[...(item.genres ?? []), ...(item.moods ?? [])].slice(0, 5).map((tag) => (
                <Text key={tag} style={styles.tag}>{tag}</Text>
              ))}
            </View>
            <Text style={styles.platformTitle}>Dove trovarlo</Text>
            <View style={styles.modalPlatforms}>
              {platforms.map((platform) => {
                const brand = platformBrand(platform);
                const Icon = brand.Icon;
                return (
                  <View key={platform} style={styles.platformChip}>
                    <View style={[styles.platformMini, { backgroundColor: brand.bg }]}>
                      <Icon color={brand.fg} size={12} strokeWidth={2.8} />
                    </View>
                    <Text style={styles.platformText}>{platform}</Text>
                  </View>
                );
              })}
            </View>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 402,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#181C24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#0F1115',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }
  },
  image: { height: 162 },
  imageShade: { flex: 1, justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 7 },
  metaPill: {
    color: '#F5F5F5',
    backgroundColor: 'rgba(20,24,32,0.78)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900'
  },
  ratingPill: { backgroundColor: '#D6FF3F', color: '#0F1115', borderColor: '#D6FF3F' },
  previewFloat: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(232,230,223,0.92)'
  },
  previewFloatText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  copy: { flex: 1, gap: 4, padding: 12, paddingBottom: 12, backgroundColor: '#181C24', alignItems: 'stretch' },
  categoryLine: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(214,255,63,0.12)', borderWidth: 1, borderColor: 'rgba(214,255,63,0.24)' },
  cardCategory: { color: '#D6FF3F', fontSize: 10, lineHeight: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#F5F5F5', fontSize: 22, lineHeight: 26, fontWeight: '900', letterSpacing: 0, textAlign: 'left' },
  aiLine: { color: '#F5F5F5', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'left' },
  summary: { color: '#B8BCC6', fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'left' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 1 },
  moreButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingVertical: 2 },
  moreText: { color: '#D6FF3F', fontSize: 13, fontWeight: '900' },
  moreIconOpen: { transform: [{ rotate: '180deg' }] },
  platformInline: { flexDirection: 'row', gap: 5 },
  platformMini: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  signalArea: { gap: 3, paddingTop: 1 },
  signalLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalText: { flex: 1, color: '#AAB4C3', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,17,21,0.78)',
    padding: 22
  },
  details: {
    width: '100%',
    maxWidth: 430,
    gap: 10,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#1D222B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  modalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  modalTitle: { flex: 1, color: '#F5F5F5', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141820',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)'
  },
  modalSummary: { color: '#B8BCC6', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  modalInsight: { color: '#D6FF3F', fontSize: 15, lineHeight: 21, fontWeight: '900' },
  modalCommunity: { color: '#AAB4C3', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { color: '#7D8491', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: '#F5F5F5', fontSize: 12, fontWeight: '900' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  tag: {
    color: '#D6FF3F',
    borderColor: '#2C3514',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    fontSize: 10,
    fontWeight: '900'
  },
  platformTitle: { color: '#7D8491', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', paddingTop: 4 },
  modalPlatforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 2 },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 9,
    paddingVertical: 4,
    backgroundColor: '#141820',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  platformText: { color: '#F5F5F5', fontSize: 11, fontWeight: '900' }
});

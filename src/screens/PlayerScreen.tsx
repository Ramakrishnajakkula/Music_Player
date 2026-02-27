import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../store/playerStore';
import { getBestImage, getArtistNames, getDurationSeconds } from '../api/saavn';
import { COLORS } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function PlayerScreen({ navigation }: any) {
  const {
    queue,
    currentIndex,
    standaloneSong,
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    repeatMode,
    isShuffle,
    quality,
    togglePlay,
    seekTo,
    skipNext,
    skipPrev,
    setRepeatMode,
    toggleShuffle,
    setQuality,
    addToQueue,
    removeFromQueue,
  } = usePlayerStore();

  // standaloneSong = song removed from queue but still playing
  const song = standaloneSong ?? (currentIndex >= 0 ? queue[currentIndex] : null);
  const albumArt = song ? getBestImage(song.image) : '';
  const artist = song ? getArtistNames(song) : '';
  // songQueueIdx is -1 when playing standalone (removed from queue)
  const songQueueIdx = song ? queue.findIndex((s) => s.id === song.id) : -1;
  const isInQueue = songQueueIdx >= 0;

  // Animated pulse on playing
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isPlaying]);

  const effectiveDuration =
    durationMs > 0
      ? durationMs
      : song
      ? getDurationSeconds(song.duration) * 1000
      : 1;

  const progress = Math.min(positionMs / effectiveDuration, 1);

  // ── Smooth seek bar using Animated.Value + PanResponder ─────────────────
  // No useState for drag — zero re-renders during drag movement
  const SEEK_BAR_W = SCREEN_W - 48;
  const seekAnim = useRef(new Animated.Value(0)).current;   // pixel offset 0..SEEK_BAR_W
  const isDragging = useRef(false);
  const dragPx = useRef(0);
  const durationRef = useRef(effectiveDuration);            // always-fresh ref for callbacks
  const [seekTimeMs, setSeekTimeMs] = useState(0); // only for time label during drag

  // Keep durationRef in sync
  durationRef.current = effectiveDuration;

  // Sync store position → animated value (only when not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      seekAnim.setValue(progress * SEEK_BAR_W);
    }
  }, [positionMs, effectiveDuration]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        isDragging.current = true;
        const px = Math.max(0, Math.min(e.nativeEvent.locationX, SEEK_BAR_W));
        dragPx.current = px;
        seekAnim.setValue(px);
        setSeekTimeMs((px / SEEK_BAR_W) * durationRef.current);
      },
      onPanResponderMove: (e) => {
        const px = Math.max(0, Math.min(e.nativeEvent.locationX, SEEK_BAR_W));
        dragPx.current = px;
        seekAnim.setValue(px);            // direct set — no re-render
        setSeekTimeMs((px / SEEK_BAR_W) * durationRef.current);
      },
      onPanResponderRelease: () => {
        const ratio = dragPx.current / SEEK_BAR_W;
        seekTo(ratio * durationRef.current);
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  const displayTimeMs = isDragging.current ? seekTimeMs : positionMs;

  const cycleRepeat = () => {
    const next: Record<string, 'off' | 'all' | 'one'> = { off: 'all', all: 'one', one: 'off' };
    setRepeatMode(next[repeatMode]);
  };

  if (!song) {
    return (
      <View style={styles.empty}>
        <Ionicons name="musical-notes-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No song playing</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#2A1A4E', '#1A1A2E', COLORS.bg]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={26} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Now Playing</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.push('Queue')}
            style={styles.iconBtn}
          >
            <Ionicons name="list" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Album Art */}
          <View style={styles.artContainer}>
            <Animated.View style={[styles.artShadow, { transform: [{ scale: pulse }] }]}>
              {albumArt ? (
                <Image source={{ uri: albumArt }} style={styles.art} />
              ) : (
                <View style={[styles.art, styles.artFallback]}>
                  <Ionicons name="musical-note" size={60} color={COLORS.primary} />
                </View>
              )}
            </Animated.View>
          </View>

          {/* Song Info */}
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {song.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {artist}
            </Text>
            <Text style={styles.songAlbum} numberOfLines={1}>
              {song.album?.name} {song.year ? `· ${song.year}` : ''}
            </Text>
            {/* Add to Queue / Remove from Queue toggle button */}
            <TouchableOpacity
              style={styles.addToQueueBtn}
              onPress={() => {
                if (!song) return;
                if (isInQueue) {
                  removeFromQueue(songQueueIdx);
                } else {
                  addToQueue(song);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isInQueue ? 'checkmark-circle' : 'add-circle-outline'}
                size={18}
                color={isInQueue ? COLORS.accent : COLORS.textSecondary}
              />
              <Text style={[styles.addToQueueText, isInQueue && { color: COLORS.accent }]}>
                {isInQueue ? 'In Queue' : 'Add to Queue'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seek Bar */}
          <View style={styles.seekSection}>
            <View style={[styles.seekBarBg, { width: SEEK_BAR_W }]} {...panResponder.panHandlers}>
              {/* Background rail */}
              <View style={[styles.seekBarRail, { width: SEEK_BAR_W }]} />
              {/* Fill track */}
              <Animated.View
                style={[
                  styles.seekBarFill,
                  { width: seekAnim },
                ]}
              />
              {/* Thumb */}
              <Animated.View
                style={[
                  styles.seekThumb,
                  { transform: [{ translateX: Animated.subtract(seekAnim, 7) }] },
                ]}
              />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(displayTimeMs)}</Text>
              <Text style={styles.timeText}>{formatTime(effectiveDuration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Shuffle */}
            <TouchableOpacity onPress={toggleShuffle} style={styles.sideBtn}>
              <Ionicons
                name="shuffle"
                size={24}
                color={isShuffle ? COLORS.accent : COLORS.textSecondary}
              />
            </TouchableOpacity>

            {/* Prev */}
            <TouchableOpacity onPress={skipPrev} style={styles.skipBtn}>
              <Ionicons name="play-skip-back" size={30} color={COLORS.text} />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                style={styles.playGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity onPress={skipNext} style={styles.skipBtn}>
              <Ionicons name="play-skip-forward" size={30} color={COLORS.text} />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity onPress={cycleRepeat} style={styles.sideBtn}>
              <Ionicons
                name={repeatMode === 'one' ? 'repeat-outline' : 'repeat'}
                size={24}
                color={repeatMode !== 'off' ? COLORS.accent : COLORS.textSecondary}
              />
              {repeatMode === 'one' && (
                <Text style={styles.repeatOne}>1</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quality Selector */}
          <View style={styles.qualityRow}>
            <Ionicons name="musical-notes" size={14} color={COLORS.textMuted} />
            <Text style={styles.qualityLabel}>Quality:</Text>
            {(['low', 'medium', 'high'] as const).map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => setQuality(q)}
                style={[styles.qualityBtn, quality === q && styles.qualityBtnActive]}
              >
                <Text style={[styles.qualityBtnText, quality === q && styles.qualityBtnTextActive]}>
                  {q === 'low' ? '96k' : q === 'medium' ? '160k' : '320k'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Queue peek */}
          {queue.length > 1 && (
            <View style={styles.queuePeek}>
              <Text style={styles.queuePeekLabel}>Up Next</Text>
              {queue.slice(currentIndex + 1, currentIndex + 3).map((s) => (
                <View key={s.id} style={styles.queuePeekItem}>
                  <Image
                    source={{ uri: getBestImage(s.image) }}
                    style={styles.queuePeekImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queuePeekTitle} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.queuePeekArtist} numberOfLines={1}>{getArtistNames(s)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ART_SIZE = SCREEN_W * 0.72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },
  empty: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  artContainer: { alignItems: 'center', marginVertical: 24 },
  artShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  art: { width: ART_SIZE, height: ART_SIZE, borderRadius: 24 },
  artFallback: { backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  songInfo: { alignItems: 'center', marginBottom: 24, gap: 4 },
  songTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  songArtist: { color: COLORS.primaryLight, fontSize: 15, marginTop: 2 },
  songAlbum: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  addToQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addToQueueText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  seekSection: { marginBottom: 24 },
  seekBarBg: {
    height: 28,                      // taller hit area
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  seekBarRail: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    position: 'absolute',
    top: 12,
    left: 0,
  },
  seekBarFill: {
    height: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 2,
    position: 'absolute',
    top: 12,
    left: 0,
  },
  seekThumb: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { color: COLORS.textMuted, fontSize: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  sideBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  playBtn: {},
  playGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  repeatOne: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  queuePeek: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  queuePeekLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  queuePeekItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  queuePeekImg: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  queuePeekTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  queuePeekArtist: { color: COLORS.textSecondary, fontSize: 11 },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  qualityLabel: { color: COLORS.textMuted, fontSize: 12, marginLeft: 4 },
  qualityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qualityBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qualityBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  qualityBtnTextActive: { color: '#fff' },
});
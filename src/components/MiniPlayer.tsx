import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/playerStore';
import { getBestImage, getArtistNames } from '../api/saavn';
import { COLORS } from '../theme/colors';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { queue, currentIndex, standaloneSong, isPlaying, isLoading, togglePlay } = usePlayerStore();

  const song = standaloneSong ?? (currentIndex >= 0 ? queue[currentIndex] : null);
  if (!song) return null;
  const imageUri = getBestImage(song.image);
  const artist = getArtistNames(song);

  return (
    <Pressable onPress={() => navigation.navigate('Player')} style={styles.wrapper}>
      <LinearGradient colors={['#1E1E35', '#16162A']} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {/* Progress bar at top */}
        <View style={styles.progressBarBg} />

        <View style={styles.inner}>
          {/* Album art */}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Ionicons name="musical-note" size={18} color={COLORS.primary} />
            </View>
          )}

          {/* Song info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {song.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={styles.playBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  container: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressBarBg: {
    height: 2,
    backgroundColor: COLORS.primary,
    width: '40%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  imageFallback: {
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

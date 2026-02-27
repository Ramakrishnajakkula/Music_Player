import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { getBestImage, getArtistNames } from '../api/saavn';
import { COLORS } from '../theme/colors';

interface Props {
  song: Song;
  isActive?: boolean;
  isPlaying?: boolean;
  isLoading?: boolean;
  isInQueue?: boolean;
  onPress: () => void;
  onAddToQueue?: () => void;
  onRemoveFromQueue?: () => void;
}

export function SongCard({ song, isActive, isPlaying, isLoading, isInQueue, onPress, onAddToQueue, onRemoveFromQueue }: Props) {
  const imageUri = getBestImage(song.image);
  const artist = getArtistNames(song);

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Album Art */}
      <View style={styles.imageWrapper}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-note" size={24} color={COLORS.primary} />
          </View>
        )}
        {isActive && (
          <View style={styles.playingOverlay}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color="#fff"
              />
            )}
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, isActive && styles.activeTitle]} numberOfLines={1}>
          {song.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
        <Text style={styles.album} numberOfLines={1}>
          {song.album?.name}
        </Text>
      </View>

      {/* Queue Button */}
      {(onAddToQueue || onRemoveFromQueue) && (
        <TouchableOpacity
          onPress={isInQueue ? onRemoveFromQueue : onAddToQueue}
          style={styles.queueBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          {isInQueue ? (
            <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
          ) : (
            <Ionicons name="add-circle-outline" size={22} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 3,
  },
  activeContainer: {
    backgroundColor: COLORS.bgCard,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activeTitle: {
    color: COLORS.primaryLight,
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  album: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  queueBtn: {
    paddingLeft: 8,
  },
});

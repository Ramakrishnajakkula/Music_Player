import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { getBestImage, getArtistNames } from '../api/saavn';
import { COLORS } from '../theme/colors';
import { Song } from '../types';

export function QueueScreen({ navigation }: any) {
  const { queue, currentIndex, isPlaying, removeFromQueue, clearQueue, playFromQueue, reorderQueue } =
    usePlayerStore();

  const handleClear = () => {
    Alert.alert('Clear Queue', 'Remove all songs from queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearQueue();
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: Song; index: number }) => {
    const isActive = index === currentIndex;
    const imageUri = getBestImage(item.image);
    const artist = getArtistNames(item);

    return (
      <View style={[styles.item, isActive && styles.activeItem]}>
        {/* Playing indicator or index */}
        <View style={styles.indexContainer}>
          {isActive ? (
            <Ionicons name={isPlaying ? 'volume-high' : 'pause'} size={16} color={COLORS.primaryLight} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>

        {/* Song info - tappable */}
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => {
            playFromQueue(index);
            navigation.navigate('Player');
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="musical-note" size={16} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, isActive && styles.activeTitleText]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemArtist} numberOfLines={1}>
              {artist}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Move up / Move down */}
        <View style={styles.reorderBtns}>
          {index > 0 && (
            <TouchableOpacity
              onPress={() => reorderQueue(index, index - 1)}
              style={styles.reorderBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="chevron-up" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {index < queue.length - 1 && (
            <TouchableOpacity
              onPress={() => reorderQueue(index, index + 1)}
              style={styles.reorderBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Remove */}
        <TouchableOpacity
          onPress={() => removeFromQueue(index)}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Queue</Text>
            <Text style={styles.headerSubtitle}>{queue.length} songs</Text>
          </View>
          {queue.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Song count info */}
        {queue.length > 0 && currentIndex >= 0 && (
          <View style={styles.nowPlayingBanner}>
            <Ionicons name="musical-note" size={14} color={COLORS.primaryLight} />
            <Text style={styles.nowPlayingText}>
              Playing {currentIndex + 1} of {queue.length}
            </Text>
          </View>
        )}

        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>Add songs from the Home screen</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              style={styles.goHomeBtn}
            >
              <Text style={styles.goHomeBtnText}>Browse Songs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 12 },
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  clearText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  nowPlayingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nowPlayingText: { color: COLORS.textSecondary, fontSize: 12 },
  listContent: { paddingVertical: 8, paddingBottom: 80 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  activeItem: { backgroundColor: COLORS.bgCard },
  indexContainer: {
    width: 30,
    alignItems: 'center',
  },
  indexText: { color: COLORS.textMuted, fontSize: 13 },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  thumb: { width: 46, height: 46, borderRadius: 8, marginRight: 10 },
  thumbFallback: {
    backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  activeTitleText: { color: COLORS.primaryLight },
  itemArtist: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  reorderBtns: { flexDirection: 'column', marginRight: 4 },
  reorderBtn: { padding: 2 },
  removeBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 13 },
  goHomeBtn: {
    marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  goHomeBtnText: { color: '#fff', fontWeight: '700' },
});

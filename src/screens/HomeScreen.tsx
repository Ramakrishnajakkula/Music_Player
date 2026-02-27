import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar } from '../components/SearchBar';
import { SongCard } from '../components/SongCard';
import { usePlayerStore } from '../store/playerStore';
import { searchSongs, getTopSongs } from '../api/saavn';
import { Song } from '../types';
import { COLORS } from '../theme/colors';

const FEATURED_QUERIES = ['Arijit Singh', 'Bollywood Hits', 'Party Songs', 'Romantic Hindi'];

export function HomeScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState(FEATURED_QUERIES[0]);
  const [searchMode, setSearchMode] = useState(false);

  const { loadAndPlay, addToQueue, removeFromQueue, currentIndex, standaloneSong, queue, isPlaying, isLoading: playerLoading } = usePlayerStore();
  const scrollY = useRef(new Animated.Value(0)).current;

  const currentSong = standaloneSong ?? (currentIndex >= 0 ? queue[currentIndex] : null);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fetchCategory = useCallback(async (cat: string, pg = 1, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await searchSongs(cat, pg, 20);
      setSongs((prev) => (append ? [...prev, ...result.results] : result.results));
      setTotal(result.total);
      setPage(pg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchSearch = useCallback(async (q: string, pg = 1, append = false) => {
    if (!q.trim()) return;
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await searchSongs(q, pg, 20);
      setSongs((prev) => (append ? [...prev, ...result.results] : result.results));
      setTotal(result.total);
      setPage(pg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!searchMode) {
      fetchCategory(activeCategory, 1);
    }
  }, [activeCategory, searchMode]);

  const handleSearch = () => {
    if (!query.trim()) {
      setSearchMode(false);
      fetchCategory(activeCategory, 1);
      return;
    }
    setSearchMode(true);
    fetchSearch(query, 1);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSearchMode(false);
      fetchCategory(activeCategory, 1);
    }
  };

  const handleEndReached = () => {
    const hasMore = songs.length < total;
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    if (searchMode) fetchSearch(query, nextPage, true);
    else fetchCategory(activeCategory, nextPage, true);
  };

  const handleSongPress = (song: Song, index: number) => {
    loadAndPlay(song, songs, index);
    navigation.navigate('Player');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Sticky blur header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderBg} />
        <Text style={styles.stickyTitle}>SoundWave</Text>
      </Animated.View>

      <Animated.FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <LinearGradient colors={['#2A1A4E', COLORS.bg]} style={styles.hero}>
              <SafeAreaView edges={['top']}>
                <View style={styles.heroContent}>
                  <View>
                    <Text style={styles.heroLabel}>Welcome Back</Text>
                    <Text style={styles.heroTitle}>SoundWave 🎵</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Queue')}
                    style={styles.queueHeaderBtn}
                  >
                    <Ionicons name="list" size={22} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </LinearGradient>

            {/* Search */}
            <SearchBar
              value={query}
              onChangeText={handleQueryChange}
              onSubmit={handleSearch}
            />

            {/* Category chips */}
            {!searchMode && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={FEATURED_QUERIES}
                keyExtractor={(c) => c}
                contentContainerStyle={styles.chipsContainer}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, activeCategory === item && styles.chipActive]}
                    onPress={() => {
                      setActiveCategory(item);
                    }}
                  >
                    <Text style={[styles.chipText, activeCategory === item && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {searchMode && (
              <Text style={styles.resultCount}>
                {total} results for "{query}"
              </Text>
            )}

            {loading && (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <SongCard
            song={item}
            isActive={currentSong?.id === item.id}
            isPlaying={currentSong?.id === item.id && isPlaying}
            isLoading={currentSong?.id === item.id && playerLoading}
            isInQueue={queue.some((s) => s.id === item.id)}
            onPress={() => handleSongPress(item, index)}
            onAddToQueue={() => addToQueue(item)}
            onRemoveFromQueue={() => {
              const qi = queue.findIndex((s) => s.id === item.id);
              if (qi >= 0) removeFromQueue(qi);
            }}
          />
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null
        }
        // Space for mini player
        ListFooterComponentStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  stickyHeaderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },
  stickyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 16,
  },
  hero: {
    paddingBottom: 20,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  heroLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  queueHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingCenter: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

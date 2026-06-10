// mobile/src/components/BienGalerie.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Pressable,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BienGalerieProps {
  photos: string[];
}

/**
 * Image gallery carousel component.
 * Features paging dots, full-screen overlay swiping, and native pinch-to-zoom.
 */
export const BienGalerie: React.FC<BienGalerieProps> = ({ photos }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const modalFlatListRef = useRef<FlatList>(null);

  // Fallback if no photo list is given
  const data = photos.length > 0 ? photos : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'
  ];

  // Update carousel active page
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleModalScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setModalActiveIndex(index);
  };

  // Triggers full screen modal opening
  const openGalleryModal = (index: number) => {
    setModalActiveIndex(index);
    setModalVisible(true);
    // Timeout gives the modal time to mount before scrolling it to position
    setTimeout(() => {
      modalFlatListRef.current?.scrollToIndex({ index, animated: false });
    }, 50);
  };

  const closeGalleryModal = () => {
    setModalVisible(false);
    // Align main list with the modal's state
    flatListRef.current?.scrollToIndex({ index: modalActiveIndex, animated: false });
    setActiveIndex(modalActiveIndex);
  };

  return (
    <View style={styles.container}>
      {/* Photo Carousel List */}
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => `img-${index}`}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => openGalleryModal(index)} style={styles.imageContainer}>
            <Image source={{ uri: item }} style={styles.carouselImage} />
          </Pressable>
        )}
      />

      {/* Index Counter overlay tag */}
      <View style={styles.counterTag}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {data.length}
        </Text>
      </View>

      {/* Pagination dots container */}
      {data.length > 1 && (
        <View style={styles.dotsContainer}>
          {data.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                activeIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}

      {/* FULL SCREEN MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGalleryModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header Controls */}
          <View style={styles.modalHeader}>
            <Pressable
              onPress={closeGalleryModal}
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={28} color={colors.palette.white} />
            </Pressable>
            <Text style={styles.modalCounterText}>
              {modalActiveIndex + 1} / {data.length}
            </Text>
            {/* spacer to center counter title */}
            <View style={{ width: 44 }} />
          </View>

          {/* Full Screen Swiper */}
          <FlatList
            ref={modalFlatListRef}
            data={data}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleModalScroll}
            scrollEventThrottle={16}
            keyExtractor={(_, index) => `modal-img-${index}`}
            renderItem={({ item }) => (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalImageWrapper}
              >
                <Image source={{ uri: item }} style={styles.modalImage} />
              </ScrollView>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 250,
    width: '100%',
    backgroundColor: colors.palette.gray[100],
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  counterTag: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: colors.palette.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    width: 14,
    backgroundColor: colors.palette.white,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // MODAL FULL SCREEN STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: colors.palette.black,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 50,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  modalCounterText: {
    color: colors.palette.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  modalImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75, // maintain landscape aspect ratio
    resizeMode: 'contain',
  },
});

// FICHIER SUIVANT : mobile/src/components/BienMap.tsx

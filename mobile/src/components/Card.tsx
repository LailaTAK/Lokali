// mobile/src/components/Card.tsx

import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, borderRadius, shadows } from '../constants/spacing';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  shadow?: boolean;
  padding?: keyof typeof spacing | number;
  radius?: keyof typeof borderRadius | number;
  style?: ViewStyle;
}

/**
 * Custom wrapper card component with custom padding, radius, shadow styles,
 * and optional click handling with premium tactile press ripple/opacity feedback.
 */
export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  shadow = true,
  padding = 'lg',
  radius = 'lg',
  style,
}) => {
  // Compute padding size
  const resolvedPadding = typeof padding === 'number' ? padding : spacing[padding];
  
  // Compute border radius size
  const resolvedRadius = typeof radius === 'number' ? radius : borderRadius[radius];

  const cardStyle: ViewStyle = {
    padding: resolvedPadding,
    borderRadius: resolvedRadius,
    ...(shadow ? shadows.md : shadows.none),
    backgroundColor: colors.light.card,
    borderColor: colors.light.border,
    borderWidth: shadow ? 0 : 1.5,
  };

  if (onPress) {
    return (
      <View style={[styles.outerContainer, { borderRadius: resolvedRadius }, style]}>
        <Pressable
          onPress={onPress}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
          style={({ pressed }) => [
            styles.cardBase,
            cardStyle,
            pressed && styles.pressedFeedback,
          ]}
        >
          {children}
        </Pressable>
      </View>
    );
  }

  return <View style={[styles.cardBase, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  outerContainer: {
    overflow: 'hidden',
  },
  cardBase: {
    alignSelf: 'stretch',
  },
  pressedFeedback: {
    opacity: 0.9,
  },
});

// FICHIER SUIVANT : mobile/src/components/Badge.tsx

// mobile/src/components/Button.tsx

import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Custom animated scale Button component with support for multiple visual variants,
 * sizes, loading spinner status, icons, and sizing constraints.
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Press animation triggers
  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Get colors depending on button variant
  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    const isDarkTheme = false; // defaults to light theme style palette
    const themeColors = colors.light;

    switch (variant) {
      case 'secondary':
        return {
          button: { backgroundColor: themeColors.secondary },
          text: { color: colors.palette.white },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: themeColors.primary,
          },
          text: { color: themeColors.primary },
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: themeColors.primary },
        };
      case 'danger':
        return {
          button: { backgroundColor: themeColors.error },
          text: { color: colors.palette.white },
        };
      case 'primary':
      default:
        return {
          button: { backgroundColor: themeColors.primary },
          text: { color: colors.palette.white },
        };
    }
  };

  // Get padding and sizing depending on size param
  const getSizeStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
          text: { fontSize: fontSize.xs },
        };
      case 'lg':
        return {
          button: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
          text: { fontSize: fontSize.lg },
        };
      case 'md':
      default:
        return {
          button: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
          text: { fontSize: fontSize.sm },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.15)' }}
        style={[
          styles.buttonBase,
          variantStyles.button,
          sizeStyles.button,
          disabled && styles.disabledButton,
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'outline' || variant === 'ghost'
                ? colors.light.primary
                : colors.palette.white
            }
            size="small"
          />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.textBase, variantStyles.text, sizeStyles.text, disabled && styles.disabledText]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  buttonBase: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  disabledButton: {
    backgroundColor: colors.palette.gray[200],
    borderColor: colors.palette.gray[300],
  },
  disabledText: {
    color: colors.palette.gray[400],
  },
});

// FICHIER SUIVANT : mobile/src/components/Input.tsx

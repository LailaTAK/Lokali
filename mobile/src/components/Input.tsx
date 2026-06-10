// mobile/src/components/Input.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/spacing';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Custom text input field component with labels, icons, error/helper text blocks,
 * stateful borders (focus/error/disabled), and integrated secure password visibility toggle.
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry,
  multiline,
  editable = true,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Determine borders and background styles depending on states
  const getContainerBorderColor = () => {
    if (error) return colors.light.error;
    if (isFocused) return colors.light.primary;
    return colors.light.border;
  };

  const getBackgroundColor = () => {
    if (!editable) return colors.palette.gray[100];
    return colors.light.surface;
  };

  const isPasswordInput = secureTextEntry;
  const isSecure = isPasswordInput && !passwordVisible;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getContainerBorderColor(),
            backgroundColor: getBackgroundColor(),
            alignItems: multiline ? 'flex-start' : 'center',
            height: multiline ? 100 : 52,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.textInput,
            !editable && styles.disabledText,
            multiline && styles.multilineInput,
            style,
          ]}
          placeholderTextColor={colors.light.placeholder}
          secureTextEntry={isSecure}
          multiline={multiline}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {isPasswordInput ? (
          <Pressable
            onPress={() => setPasswordVisible(!passwordVisible)}
            style={styles.rightIconWrapper}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.palette.gray[500]}
            />
          </Pressable>
        ) : (
          rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        helperText && <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: colors.light.text,
    fontSize: fontSize.md,
    padding: 0, // resets Android default pad
  },
  multilineInput: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    height: '100%',
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    height: '100%',
  },
  disabledText: {
    color: colors.palette.gray[400],
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.light.error,
    marginTop: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.light.textMuted,
    marginTop: spacing.xs,
  },
});

// FICHIER SUIVANT : mobile/src/components/Card.tsx

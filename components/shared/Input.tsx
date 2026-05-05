import React from 'react';
import { TextInput, Text, View, TextInputProps } from 'react-native';
import { theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...rest }: InputProps) {
  return (
    <View className="w-full gap-y-2.5">
      {label ? (
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        className={`rounded-[20px] border bg-hum-surface/80 px-4 py-3.5 text-[16px] text-hum-text ${error ? 'border-red-500/50' : 'border-hum-border/18'} ${className ?? ''}`}
        placeholderTextColor={theme.dim}
        autoCapitalize="none"
        maxFontSizeMultiplier={1.45}
        {...rest}
      />
      {error ? (
        <Text className="text-xs text-red-400/90" maxFontSizeMultiplier={1.35}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

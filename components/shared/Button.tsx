import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { theme } from '@/constants/theme';
import { primaryButtonShadow } from '@/constants/elevation';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  style,
  ...rest
}: ButtonProps) {
  const base = 'items-center justify-center rounded-full';

  const sizeClasses = {
    sm: 'px-6 py-3',
    md: 'px-8 py-3.5',
    lg: 'px-11 py-4',
  }[size];

  const variantClasses = {
    primary: 'bg-hum-primary',
    secondary: 'border border-hum-border/16 bg-hum-card/55',
    ghost: 'bg-transparent',
    danger: 'border border-red-900/35 bg-red-950/18',
  }[variant];

  const textClasses = {
    primary: 'font-semibold text-hum-ink',
    secondary: 'font-semibold text-hum-text',
    ghost: 'font-medium text-hum-muted',
    danger: 'font-semibold text-red-200',
  }[variant];

  const textSize = {
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-[16px]',
  }[size];

  const shadowStyle: StyleProp<ViewStyle> =
    variant === 'primary' && !disabled && !loading ? primaryButtonShadow : undefined;

  return (
    <TouchableOpacity
      className={`${base} ${sizeClasses} ${variantClasses} ${disabled || loading ? 'opacity-45' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      activeOpacity={0.88}
      style={[shadowStyle, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.ink : theme.primary}
        />
      ) : (
        <Text
          className={`${textClasses} ${textSize} text-center tracking-wide`}
          numberOfLines={2}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

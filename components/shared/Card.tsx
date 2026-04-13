import React from 'react';
import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { cardShadow } from '@/constants/elevation';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, style, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-[22px] border border-hum-border/18 bg-hum-card p-6 ${className ?? ''}`}
      style={[cardShadow as StyleProp<ViewStyle>, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

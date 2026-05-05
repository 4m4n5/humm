import React from 'react';
import { Text } from 'react-native';

type Props = {
  title: string;
};

export function SectionLabel({ title }: Props) {
  return (
    <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
      {title}
    </Text>
  );
}

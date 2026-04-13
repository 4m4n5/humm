import React from 'react';
import { Stack } from 'expo-router';

export default function DecideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
  );
}

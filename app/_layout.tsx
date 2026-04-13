import '../global.css';
import React, { Suspense, lazy } from 'react';
import { View } from 'react-native';
import { isFirebaseEnvComplete } from '@/lib/firebaseEnv';
import { FirebaseMissingScreen } from '@/components/FirebaseMissingScreen';
import { LoadingState } from '@/components/shared/LoadingState';

const AppRoot = lazy(() => import('@/components/AppRoot'));

export default function RootLayout() {
  if (!isFirebaseEnvComplete()) {
    return <FirebaseMissingScreen />;
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 justify-center bg-hum-bg">
          <LoadingState />
        </View>
      }
    >
      <AppRoot />
    </Suspense>
  );
}

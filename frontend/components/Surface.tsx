import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export function Surface({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#181C24'
  }
});

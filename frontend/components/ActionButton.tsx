import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export function ActionButton({
  children,
  label,
  onPress,
  variant = 'dark'
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'dark' | 'hot';
}) {
  return (
    <Pressable onPress={onPress} style={[styles.button, variant === 'hot' && styles.hot]}>
      {children}
      <Text style={[styles.label, variant === 'hot' && styles.hotLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 78,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(29,34,43,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 11
  },
  hot: {
    backgroundColor: '#D6FF3F',
    borderColor: '#D6FF3F'
  },
  label: {
    color: '#F5F5F5',
    fontSize: 11,
    fontWeight: '900'
  },
  hotLabel: {
    color: '#0F1115'
  }
});

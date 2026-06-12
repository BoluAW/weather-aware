import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Verdict } from '../types';

const CONFIG: Record<Verdict, { label: string; bg: string; text: string }> = {
  green: { label: 'All Clear', bg: '#dcfce7', text: '#15803d' },
  amber: { label: 'Heads Up', bg: '#fef9c3', text: '#a16207' },
  red: { label: 'At Risk', bg: '#fee2e2', text: '#b91c1c' },
};

interface Props {
  verdict: Verdict;
  size?: 'sm' | 'md';
}

export default function WeatherBadge({ verdict, size = 'md' }: Props) {
  const { label, bg, text } = CONFIG[verdict];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.small]}>
      <Text style={[styles.text, { color: text }, isSmall && styles.smallText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 11,
  },
});

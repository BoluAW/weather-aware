import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const NUM_DROPS = 35;

function Raindrop({ index }: { index: number }) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const x = (index / NUM_DROPS) * width + (Math.random() * (width / NUM_DROPS));
  const duration = 700 + Math.random() * 500;
  const delay = (index / NUM_DROPS) * 1200;
  const dropHeight = 10 + Math.random() * 10;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: height + 30,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.7, duration: duration - 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(translateY, { toValue: -30, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: x,
          height: dropHeight,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
}

export default function RainAnimation() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_DROPS }).map((_, i) => (
        <Raindrop key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    backgroundColor: 'rgba(147, 210, 255, 0.85)',
    borderRadius: 1,
  },
});

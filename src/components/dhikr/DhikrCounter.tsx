import { Text, View, Animated } from "react-native";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import Svg, { Circle } from "react-native-svg";

type DhikrCounterProps = {
  readonly count: number;
  readonly dhikrName: string;
  readonly target: number;
  readonly isDark: boolean;
};

export default function DhikrCounter({
  count,
  dhikrName,
  target,
  isDark,
}: DhikrCounterProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for background glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    // Scale animation on count change
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, scaleAnim]);

  const radius = 140;
  const strokeWidth = isDark ? 8 : 6;
  const size = radius * 2 + strokeWidth * 2;
  const center = size / 2;
  
  // Calculate progress based on increment steps
  // Ring circumference / target = how much of the ring each increment fills
  const circumference = 2 * Math.PI * radius;
  const incrementStep = circumference / target; // Each increment fills this much of the ring
  const currentProgressLength = Math.min(count * incrementStep, circumference); // Current filled length (capped at circumference)
  
  // Calculate stroke-dasharray and stroke-dashoffset for SVG
  // stroke-dasharray: [circumference, circumference] - total dash pattern
  // stroke-dashoffset: how much to offset (unfilled portion)
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - currentProgressLength;

  return (
    <View className="relative z-10 flex-col items-center justify-center">

      <View className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Background glow */}
        <Animated.View
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: isDark
              ? "rgba(31, 143, 95, 0.1)"
              : "rgba(31, 143, 95, 0.05)",
            transform: [{ scale: pulseAnim }],
          }}
        />

        {/* Progress Ring - SVG based on increment calculation */}
        <View className="absolute inset-0 items-center justify-center">
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={isDark ? "rgba(34, 56, 51, 0.3)" : "rgba(226, 236, 232, 0.3)"}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle - smooth progress based on increment calculation */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={isDark ? "#4CAF84" : "#1F8F5F"}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Content */}
        <View className="absolute inset-0 flex-col items-center justify-center text-center">
          <Text
            className={clsx(
              "text-xl font-light tracking-wide mb-1",
              isDark ? "text-text-primaryDark/70" : "text-text-primaryLight/70"
            )}
          >
            {dhikrName}
          </Text>
          <Animated.Text
            className={clsx(
              "text-7xl sm:text-8xl font-bold tracking-tighter tabular-nums leading-none",
              isDark ? "text-text-primaryDark" : "text-text-primaryLight"
            )}
            style={{ transform: [{ scale: scaleAnim }] }}
          >
            {count}
          </Animated.Text>
          <Text
            className={clsx(
              "text-xs font-medium mt-4 tracking-widest uppercase opacity-80 text-primary-500"
            )}
          >
            Target: {target}
          </Text>
        </View>
      </View>
      <Text
        className={clsx(
          "mt-10 text-sm font-light tracking-wide",
          isDark ? "text-text-secondaryDark/40" : "text-text-secondaryLight/40"
        )}
      >
        Tap anywhere to count
      </Text>
    </View>
  );
}


import { SectionHeader } from "@/components/SectionComponent";
import { StepsIcon, TimerIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { StepData } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import { Media } from "@/media/media";
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatTimerDisplay, getTotalSeconds } from "@/utils/time";
import { scheduleStepTimerNotification } from "@/notifications/pushNotification";

type StepsScreenProps = {
  dark?: boolean;
  steps: StepData[];
  dishName: string; 
};

const StepTimer: React.FC<{ 
    timer: StepData["timer"]; 
    stepNumber: number;     
    dishName: string;        
    colors: any; 
    textStyles: any 
}> = ({ timer, stepNumber, dishName, colors, textStyles }) => {

  const total = getTotalSeconds(timer);
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const isDone = remaining === 0;

  // Keep runningRef in sync
  useEffect(() => {
      runningRef.current = running;
  }, [running]);

  // Interval tick
  useEffect(() => {
      if (!running || isDone) return;

      intervalRef.current = setInterval(() => {
          if (!endTimeRef.current) return;
          const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
          setRemaining(left);

          if (left === 0) {
              clearInterval(intervalRef.current!);
              setRunning(false);
              runningRef.current = false;
              endTimeRef.current = null;
              scheduleStepTimerNotification(stepNumber, dishName);
          }
      }, 500);

      return () => clearInterval(intervalRef.current!);
  }, [running]);

  // Resume from background
  useEffect(() => {
      const sub = AppState.addEventListener("change", (state) => {
          if (state !== "active") return;
          if (!runningRef.current || !endTimeRef.current) return;

          const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
          setRemaining(left);

          if (left === 0) {
              setRunning(false);
              runningRef.current = false;
              endTimeRef.current = null;
              scheduleStepTimerNotification(stepNumber, dishName);
          }
      });

      return () => sub.remove();
  }, []); // mount once — uses refs, no stale closure

  const handlePress = () => {
      if (isDone) {
          setRemaining(total);
          setRunning(false);
          runningRef.current = false;
          endTimeRef.current = null;
          return;
      }

      if (!running) {
          endTimeRef.current = Date.now() + remaining * 1000;
      } else {
          endTimeRef.current = null;
      }

      setRunning((prev) => !prev);
  };

  if (total === 0) return null;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                alignSelf: "flex-start",
                backgroundColor: isDone
                    ? colors.button
                    : running
                    ? colors.secondaryCard
                    : colors.card,
                borderWidth: 1,
                borderColor: running ? colors.button : "transparent",
            }}
        >
            <TimerIcon color={isDone ? colors.background : colors.button} size={16} />
            <Text
                className={textStyles.small}
                style={{
                    color: isDone ? colors.background : colors.text,
                    fontWeight: "600",
                    fontVariant: ["tabular-nums"],
                }}
            >
                {isDone ? "Done!" : running ? formatTimerDisplay(remaining) : formatTimerDisplay(total)}
            </Text>
            <Text
                className={textStyles.small}
                style={{ color: isDone ? colors.background : colors.secondaryText }}
            >
                {isDone ? "Tap to reset" : running ? "tap to pause" : "tap to start"}
            </Text>
        </TouchableOpacity>
    );
};

export const StepsScreen: React.FC<StepsScreenProps> = ({ dark, steps, dishName }) => {

  const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const completedCount = steps.filter((step) => completedSteps[step.step_number]).length;

  const toggleComplete = (stepNumber: number) => {
    setCompletedSteps((current) => ({
      ...current,
      [stepNumber]: !current[stepNumber],
    }));
  };

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background }}>
      <SectionHeader
        title="Steps"
        subtitle={`${completedCount}/${steps.length} complete`}
        showBackground
        titleClassName={textStyles.bodyMedium}
        dark={dark}
        leftIcon={<StepsIcon color={colors.button} />}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 10, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {steps.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 }}>
            <Text className={textStyles.caption} style={{ color: colors.secondaryText }}>
              No steps added.
            </Text>
          </View>
        ) : (
          steps.map((step, index) => {
            const isDone = !!completedSteps[step.step_number];
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => toggleComplete(step.step_number)}
                style={{
                  flexDirection: "column",
                  gap: 10,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isDone ? colors.secondaryCard : colors.background,
                }}
              >

                {step.image_url ? (
                  <Media
                    uri={step.image_url}
                    mediaType="image"
                    style={{
                      width: 125,
                      height: 100,
                      borderRadius: 10,
                      opacity: isDone ? 0.4 : 1,
                    }}
                    imageContentFit="cover"
                  />
                ) : null}

                {step.timer && (
                    <StepTimer 
                        timer={step.timer} 
                        stepNumber={step.step_number}
                        dishName={dishName}           
                        colors={colors} 
                        textStyles={textStyles} 
                    />
                )}

                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: isDone ? colors.button : colors.secondaryCard,
                      backgroundColor: isDone ? colors.button : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Text
                      className={textStyles.caption}
                      style={{
                        color: isDone ? colors.background : colors.secondaryText,
                        fontWeight: "700",
                      }}
                    >
                      {isDone ? "✓" : step.step_number}
                    </Text>
                  </View>
                  <Text
                    className={textStyles.bodyMedium}
                    style={{
                      flex: 1,
                      color: isDone ? colors.secondaryText : colors.text,
                      textDecorationLine: isDone ? "line-through" : "none",
                    }}
                  >
                    {step.description}
                  </Text>
                </View>

              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default StepsScreen;
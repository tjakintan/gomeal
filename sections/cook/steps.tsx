import { SectionHeader } from "@/components/SectionComponent";
import { StepsIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { StepData } from "@/types";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type StepsScreenProps = {
  dark?: boolean;
  steps: StepData[];
};

export const StepsScreen: React.FC<StepsScreenProps> = ({ dark, steps }) => {
  const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const completedCount = steps.filter((step) => completedSteps[step.id]).length;

  const toggleComplete = (stepId: string) => {
    setCompletedSteps((current) => ({
      ...current,
      [stepId]: !current[stepId],
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
        style={{ flex: 1, backgroundColor: colors.card }}
        contentContainerStyle={{ padding: 10, gap: 8 }}
      >
        {steps.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 }}>
            <Text className={textStyles.caption} style={{ color: colors.secondaryText }}>
              No steps added.
            </Text>
          </View>
        ) : (
          steps.map((step, index) => {
            const isDone = !!completedSteps[step.id];

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => toggleComplete(step.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isDone ? colors.secondaryCard : colors.background,
                }}
              >
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
                  {step.description || "No instruction written for this step."}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default StepsScreen;
import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/provider/ThemeProvider";
import { SpinningLogoImage } from "@/utils/Logo";
import WobblyText from "@/hooks/WobblyText";

type BootScreenProps = {
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

const BootScreen: React.FC<BootScreenProps> = ({
  loading = true,
  error = null,
  onRefresh,
}) => {
  const { colors, textStyles } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <SpinningLogoImage size={50} />

      {error ? (
        <>
          <Text
            className={textStyles.h3}
            style={{
              color: colors.text,
              opacity: 0.75,
              fontSize: 16,
              marginTop: 18,
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            {error}
          </Text>

          <Pressable
            onPress={onRefresh}
            disabled={loading}
            style={({ pressed }) => ({
              minWidth: 140,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.text,
              opacity: pressed || loading ? 0.65 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text
                style={{
                  color: colors.background,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Refresh
              </Text>
            )}
          </Pressable>
        </>
      ) : (
        <WobblyText
          text="Warming Up"
          className={textStyles.h3}
          style={{
            color: colors.text,
            opacity: 0.65,
            fontSize: 16,
            marginTop: 18,
            marginBottom: 26,
            textAlign: "center",
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default BootScreen;

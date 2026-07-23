import { StyleSheet } from "react-native";


export const sectionHeaderText = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 25,
    justifyContent: "center"
  },
});

export const difficultyColors: Record<"Easy" | "Medium" | "Hard", string> = {
  Medium: "#ffca45",
  Hard: "#ff3e55",
  Easy: "#4ade80",
};
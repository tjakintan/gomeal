import { useEffect } from "react";
import { View, Text } from "react-native";
import { usePost } from "@/stores/usePost";
import { useTheme } from "@/provider/ThemeProvider";
import { Input } from "@/components/InputComponent";
import { DifficultyOptionButton } from "@/components/ButtonComponent";
import { CommentIcon, TagIcon } from "@/icons/Icon";
import { PostSectionInfoProps } from "@/types";
import { SectionHeader } from "@/components/SectionComponent";

const DishInfo: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onCompleteChange,
}: PostSectionInfoProps) => {

    const info = usePost((state) => state.info);
    const setInfo = usePost((state) => state.setInfo);

    const { colors, textStyles } = useTheme();

    const updateInfo = (field: keyof typeof info, value: string) => {
        setInfo({
        ...info,
        [field]: value,
        });
    };

    useEffect(() => {
        const isComplete =
        !!info.dish_name?.trim() &&
        !!info.dish_description?.trim() &&
        !!info.dish_difficulty?.trim();

        onCompleteChange?.(isComplete);
    }, [
        info.dish_name,
        info.dish_description,
        info.dish_difficulty,
        onCompleteChange,
    ]);

    return (
        <View className="flex-1 flex-col p-2 gap-3 justify-start">

            <SectionHeader
                title="Info"
                subtitle="Add a cool name, comment and difficulty."
                showDivider
            />

            <View
                style={{
                    flex: 1,
                    overflow: "hidden",
                    margin: 1,
                }}
                className="p-1 justify-start gap-2"
            >
                <View className="w-full">
                    <Text className={`font-inter-bold tracking-wider ${textStyles.bodyMedium}`}>
                        Name
                    </Text>

                    <Input
                        value={info.dish_name}
                        leftIcon={<TagIcon color={colors.text} />}
                        onChangeText={(value) => updateInfo("dish_name", value)}
                    />
                </View>

                <View className="w-full">
                    <Text className={`font-inter-bold tracking-wider ${textStyles.bodyMedium}`}>
                        Comments
                    </Text>

                    <Input
                        value={info.dish_description}
                        leftIcon={<CommentIcon color={colors.text} />}
                        onChangeText={(value) => updateInfo("dish_description", value)}
                        multiline
                    />
                </View>

                <View className="w-full">
                    <Text className={`font-inter-bold tracking-wider ${textStyles.bodyMedium}`}>
                        Difficulty
                    </Text>

                    <View className="w-full p-2 flex-row gap-5 items-center justify-center">
                        {(["Hard", "Medium", "Easy"] as const).map((level) => (
                            <DifficultyOptionButton
                                key={level}
                                value={level}
                                selected={info.dish_difficulty}
                                onChange={() => updateInfo("dish_difficulty", level)}
                            />
                        ))}
                    </View>
                </View>
                
            </View>
        </View>
    );
};

export default DishInfo;

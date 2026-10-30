import { Dimensions, Pressable, Text, View } from "react-native";
import { create_bug_report_api } from "@/api/profile.api";
import { useTheme } from "@/provider/ThemeProvider";
import { Input } from "@/components/InputComponent";
import { Button } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { XIcon, BugIcon, CheckIcon, DropdownIcon } from "@/icons/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { BugReportScreenProps } from "@/app/bug";
import { useState } from "react";
import { SectionHeader } from "./SectionComponent";
import { capitalize } from "@/utils/text";
import { ACCENT_COLORS, SECTION_INDEX, Sections } from "@/types";
import { useKeyboardHeight } from "./keyboardComponent";
import { useBanner } from "@/stores/useBanner";


const Bug: React.FC<BugReportScreenProps> = ({
    section,
    dark,
    onClose,
}) => {

    const banner = useBanner();
    const insets = useSafeAreaInsets();
    const { width } = Dimensions.get("window");
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight(
        (_height, visible) => {
            if (visible) {
                setDropdownOpen(false);
            }
        }
    );

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState<Sections>(
        (section as Sections) || "feed"
    );

    const closeBugReport = () => {
        if (sending) return;

        setMessage("");
        onClose();
    };

    const submitBugReport = async () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage || sending) return;

        try {
            setSending(true);

            const res = await create_bug_report_api(
                selectedSection,
                trimmedMessage
            );

            if (!res.ok) {
                throw new Error("bug_report_failed");
            }

            banner.success("Bug has been successfully submitted")

            setMessage("");
            onClose();
        } catch (err) {
            console.log("[bug_report_error]", err);
        } finally {
            setSending(false);
        }
    };

    const canSubmit = message.trim().length > 0 && !sending;

    return (
        <View
            style={{
                width: "100%",
                paddingTop: 8,
                paddingBottom: isKeyboardVisible
                    ? keyboardHeight + Math.max(insets.bottom, 12)
                    : Math.max(insets.bottom, 12),
                gap: 10,
            }}
        >

            {/* Header */}
            <View
                style={{
                    width: "100%",
                    height: 50,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                }}
            >
                {/* Cancel */}
                <Button
                    onPress={closeBugReport}
                    disabled={sending}
                    hitSlop={6}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.danger,
                        opacity: sending ? 0.5 : 1,
                    }}
                >
                    <XIcon size={24} color={colors.text} />
                </Button>

                {/* Centered title */}
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 70,
                        right: 70,
                        height: 50,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                    }}
                >
                    <BugIcon color={colors.text} size={24} />

                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            flexShrink: 1,
                        }}
                        numberOfLines={1}
                    >
                        Bug Report
                    </Text>
                </View>

                {/* Submit */}
                <Button
                    onPress={submitBugReport}
                    disabled={!canSubmit}
                    hitSlop={6}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: sending
                            ? "transparent"
                            : ACCENT_COLORS.teal,
                        opacity: !canSubmit ? 0.4 : 1,
                    }}
                >
                    {sending ? (
                        <SpinningLogoImage size={26} />
                    ) : (
                        <CheckIcon size={24} color="#FFFFFF" />
                    )}
                </Button>
            </View>

            {/* Subtitle */}
            <Text
                className={textStyles.body}
                style={{
                    color: colors.secondaryText,
                    paddingHorizontal: 10,
                }}
            >
                Help us improve GoMeal by telling us what went wrong.
            </Text>

            {/* Divider */}
            <View
                style={{
                    height: 1,
                    backgroundColor: colors.secondaryCard,
                    marginHorizontal: 10,
                    marginBottom: 4,
                }}
            />

            {/* Support Category */}
            <View
                style={{
                    width: "100%",
                    gap: 8,
                    paddingHorizontal: 10
                }}
            >
                <Text
                    className={textStyles.body}
                    style={{
                        color: colors.text,
                    }}
                >
                    Support Category
                </Text>

                <Pressable
                    onPress={() => {
                        if (isKeyboardVisible) return;

                        setDropdownOpen((prev) => !prev);
                    }}
                    style={{
                        borderRadius: 14,
                        backgroundColor: colors.secondaryCard,
                        overflow: "hidden",
                    }}
                >
                    {/* Selected section */}
                    <View
                        style={{
                            minHeight: 48,
                            paddingHorizontal: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Text
                            className={textStyles.body}
                            style={{
                                color: colors.text,
                            }}
                        >
                            {capitalize(selectedSection)}
                        </Text>

                        <DropdownIcon
                            size={20}
                            color={colors.secondaryText}
                            rotate={dropdownOpen ? 180 : 0}
                        />
                    </View>

                    {/* Dropdown options */}
                    {dropdownOpen && (
                        <View
                            style={{
                                paddingHorizontal: 8,
                                paddingBottom: 8,
                                gap: 2,
                            }}
                        >
                            {(Object.keys(SECTION_INDEX) as Sections[]).map(
                                (option) => (
                                    <Pressable
                                        key={option}
                                        onPress={() => {
                                            setSelectedSection(option);
                                            setDropdownOpen(false);
                                        }}
                                        style={{
                                            minHeight: 42,
                                            paddingHorizontal: 10,
                                            justifyContent: "center",
                                            borderRadius: 10,
                                            backgroundColor:
                                                option === selectedSection
                                                    ? colors.background
                                                    : "transparent",
                                        }}
                                    >
                                        <Text
                                            className={textStyles.body}
                                            style={{
                                                color: colors.text,
                                            }}
                                        >
                                            {capitalize(option)}
                                        </Text>
                                    </Pressable>
                                )
                            )}
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Description */}
            <View
                style={{
                    width: "100%",
                    gap: 8,
                    paddingHorizontal: 10
                }}
            >
                <Text
                    className={textStyles.body}
                    style={{
                        color: colors.text,
                    }}
                >
                    Bug Description
                </Text>

                <View
                    style={{
                    }}
                >
                    <Input
                        multiline
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Describe what happened..."
                        placeholderTextColor={colors.secondaryText}
                        style={{
                            minHeight: 120,
                            textAlignVertical: "top",
                            backgroundColor: colors.secondaryCard,
                            color: colors.text,
                            paddingTop: 12,
                        }}
                        containerStyle={{
                            height: 120,
                        }}
                    />
                </View>
            </View>

        </View>
    );
};

export default Bug
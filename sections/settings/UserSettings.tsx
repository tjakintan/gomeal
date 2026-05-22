import { useUser } from "@/stores/useUser";
import { resetSocket } from "@/api/socket";
import { View, Text} from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { LogOutIcon, NextIcon, DeleteIcon } from "@/icons/Icon";
import { SectionHeader } from "@/components/SectionComponent";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserSettings: React.FC = () => {

    const { colors, textStyles } = useTheme();
    const { clearUser } = useUser();

    const handleLogout = async () => {
        await AsyncStorage.multiRemove([
            "accessToken",
            "refreshToken",
        ]);
        clearUser();
        resetSocket();
    }

    const handleDelete = () => {

    }

    return (
        <View style={{height: 175,}} className="flex-1 gap-5 items-center justify-center">
            <Button
                onPress={handleLogout}
                style={{
                    width: 300,
                    height: 60,
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: colors.card
                }}
                background={true}
            >
                <Text className={textStyles.h3}>Logout</Text>
                <LogOutIcon color={colors.buttonSecondary} />
            </Button>
            <Button
                onPress={handleDelete}
                style={{
                    width: 300,
                    height: 60,
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: colors.card
                }}
                background={true}
            >
                <Text className={textStyles.h3} style={{color: colors.danger}}>Delete Account</Text>
                <DeleteIcon color={colors.danger} />
            </Button>
        </View>
    )
}

export default UserSettings;
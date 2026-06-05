import { View } from "react-native";
import WelcomeScreen from "./Authenticate";

const OnBoardScreen: React.FC = () => {
    return (
        <View className="w-full h-full">
            <WelcomeScreen />
        </View>
    );
};

export default OnBoardScreen;
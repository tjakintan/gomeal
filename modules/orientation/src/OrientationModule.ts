
import { requireNativeModule } from "expo-modules-core";

type OrientationModuleType = {
    setActive(active: boolean): void;
    rotate(landscape: boolean): void
};

export default requireNativeModule<OrientationModuleType>("Orientation");

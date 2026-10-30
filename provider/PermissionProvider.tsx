import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
} from "react";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";

import PermissionContent from "@/components/PermissionComponent";
import { useOverlay } from "@/stores/useOverlay";

export type PermissionType =
    | "camera"
    | "microphone"
    | "mediaLibrary"
    | "notifications";

type PermissionState = {
    granted: boolean;
    canAskAgain: boolean;
};

type RequestPermissionsOptions = {
    permissions: PermissionType[];

    onGranted?: () => void | Promise<void>;

    title?: string;
    description?: string;
    deniedDescription?: string;
};

type PermissionContextType = {
    requestPermissions: (
        options: RequestPermissionsOptions
    ) => Promise<boolean>;
};

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const openOverlay = useOverlay((state) => state.openOverlay);
    const closeOverlay = useOverlay((state) => state.closeOverlay);

    // --------------------------------------------------
    // GET PERMISSION STATE
    // --------------------------------------------------

    const getPermission = useCallback(
        async (
            permission: PermissionType
        ): Promise<PermissionState> => {
            switch (permission) {
                case "camera": {
                    const result =
                        await ImagePicker.getCameraPermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "microphone": {
                    const result =
                        await Camera.getMicrophonePermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "mediaLibrary": {
                    const result =
                        await ImagePicker.getMediaLibraryPermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "notifications": {
                    const result =
                        await Notifications.getPermissionsAsync();

                    const granted =
                        result.granted ||
                        result.ios?.status ===
                            Notifications.IosAuthorizationStatus.PROVISIONAL;

                    return {
                        granted,
                        canAskAgain: result.canAskAgain,
                    };
                }
            }
        },
        []
    );

    // --------------------------------------------------
    // REQUEST PERMISSION
    // --------------------------------------------------

    const requestPermission = useCallback(
        async (
            permission: PermissionType
        ): Promise<PermissionState> => {
            switch (permission) {
                case "camera": {
                    const result =
                        await ImagePicker.requestCameraPermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "microphone": {
                    const result =
                        await Camera.requestMicrophonePermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "mediaLibrary": {
                    const result =
                        await ImagePicker.requestMediaLibraryPermissionsAsync();

                    return {
                        granted: result.granted,
                        canAskAgain: result.canAskAgain,
                    };
                }

                case "notifications": {
                    const result =
                        await Notifications.requestPermissionsAsync();

                    const granted =
                        result.granted ||
                        result.ios?.status ===
                            Notifications.IosAuthorizationStatus.PROVISIONAL;

                    return {
                        granted,
                        canAskAgain: result.canAskAgain,
                    };
                }
            }
        },
        []
    );

    // --------------------------------------------------
    // REQUEST MULTIPLE PERMISSIONS
    // --------------------------------------------------

    const requestPermissions = useCallback(
        async ({
            permissions,
            onGranted,
            title,
            description,
            deniedDescription,
        }: RequestPermissionsOptions): Promise<boolean> => {
            const uniquePermissions = [...new Set(permissions)];

            const currentPermissions = await Promise.all(
                uniquePermissions.map((permission) =>
                    getPermission(permission)
                )
            );

            // Everything already granted.
            if (currentPermissions.every((status) => status.granted)) {
                try {
                    await onGranted?.();
                    return true;
                } catch {
                    return false;
                }
            }

            const missingPermissions = uniquePermissions.filter(
                (_, index) => !currentPermissions[index].granted
            );

            const canAskAgain = missingPermissions.every((permission) => {
                const index = uniquePermissions.indexOf(permission);
                return currentPermissions[index].canAskAgain;
            });

            return new Promise<boolean>((resolve) => {
                openOverlay({
                    custom: (
                        <PermissionContent
                            title={
                                title ??
                                "Allow GoMeal to access this feature"
                            }
                            description={
                                canAskAgain
                                    ? description ??
                                      "This permission is needed to continue."
                                    : deniedDescription ??
                                      "This permission has been disabled. Please enable it in Settings."
                            }
                            continueText={
                                canAskAgain
                                    ? "Continue"
                                    : "Open Settings"
                            }
                            onContinue={async () => {
                                closeOverlay();

                                // Permission can no longer be requested.
                                if (!canAskAgain) {
                                    try {
                                        await Linking.openSettings();
                                    } catch {
                                        // Ignore settings failure.
                                    }

                                    resolve(false);
                                    return;
                                }

                                try {
                                    const results = await Promise.all(
                                        missingPermissions.map(
                                            (permission) =>
                                                requestPermission(permission)
                                        )
                                    );

                                    const allGranted = results.every(
                                        (result) => result.granted
                                    );

                                    if (!allGranted) {
                                        resolve(false);
                                        return;
                                    }

                                    try {
                                        await onGranted?.();
                                        resolve(true);
                                    } catch {
                                        resolve(false);
                                    }
                                } catch {
                                    resolve(false);
                                }
                            }}
                        />
                    ),
                });
            });
        },
        [
            getPermission,
            requestPermission,
            openOverlay,
            closeOverlay,
        ]
    );

    const value = useMemo<PermissionContextType>(
        () => ({
            requestPermissions,
        }),
        [requestPermissions]
    );

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionContext);

    if (!context) {
        throw new Error(
            "usePermissions must be used inside PermissionProvider"
        );
    }

    return context;
}
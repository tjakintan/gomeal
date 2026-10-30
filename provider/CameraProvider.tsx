import React, {
    createContext,
    useContext,
} from "react";

import {
    CameraDevice,
    useCameraDevice,
} from "react-native-vision-camera";


interface CameraContextValue {
    backDevice: CameraDevice | undefined;
    frontDevice: CameraDevice | undefined;
}


const CameraContext =
    createContext<CameraContextValue>({
        backDevice: undefined,
        frontDevice: undefined,
    });


export const CameraProvider: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) => {

    /*
     * Start discovering BOTH camera devices as soon
     * as the app mounts.
     *
     * Permissions are intentionally NOT handled here.
     * PermissionProvider owns that responsibility.
     */
    const backDevice =
        useCameraDevice("back");

    const frontDevice =
        useCameraDevice("front");


    return (
        <CameraContext.Provider
            value={{
                backDevice,
                frontDevice,
            }}
        >
            {children}
        </CameraContext.Provider>
    );
};


export const useCamera = () =>
    useContext(CameraContext);
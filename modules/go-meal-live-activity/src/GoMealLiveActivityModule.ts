// Loads the Expo helper used to access a native module by its registered name.
import { requireNativeModule } from 'expo-modules-core';
// Imports the TypeScript type that describes the methods exposed by the native module.
// This keeps the module API strongly typed when it is used elsewhere in the app.
import { GoMealLiveActivityModuleType } from './GoMealLiveActivity.types';

// Loads the native iOS module registered as "GoMealLiveActivity" and exports it.
//
// The generic <GoMealLiveActivityModuleType> tells TypeScript what methods this
// native module supports, such as checking availability, starting a Live Activity,
// and stopping an existing Live Activity.
export default requireNativeModule<GoMealLiveActivityModuleType>('GoMealLiveActivity');

// Reexport the native module. On web, it will be resolved to GoMealLiveActivityModule.web.ts
// and on native platforms to GoMealLiveActivityModule.ts
export { default } from './src/GoMealLiveActivityModule';
export * from  './src/GoMealLiveActivity.types';

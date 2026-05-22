import { requireNativeComponent } from 'react-native';
import { GoMealGlassViewProps } from '@/types/components';

// The string here must match the **@objc name of the manager**, not the class name itself.
const GoMealGlassViewProvider = requireNativeComponent<GoMealGlassViewProps>('GoMealGlassView');
export default GoMealGlassViewProvider;

export type GoMealLiveActivityModuleType = {

    // Checks whether Live Activities can be used on the current device.
    // On iOS, this depends on the iOS version and whether the user has Live Activities enabled.
    isAvailable(): boolean;

    // Starts a new Live Activity for a cooking post.
    //
    // dishName: The name of the dish shown in the Live Activity.
    // postId: A unique ID used to identify this cooking post/activity later.
    // stepTotal: The total number of cooking steps for the recipe.
    // stepCurrent: The step the user is currently on.
    // stepDesc: A short description of the current cooking step.
    //
    // Returns a Promise because the native start operation runs asynchronously.
    start(
        dishName: string,
        postId: string,
        stepTotal: number,
        stepCurrent: number,
        stepDesc: string,
        timerEndsAt?: number,
        timerLabel?: string,
    ): Promise<void>;

    // Updates an existing Live Activity.
    //
    // postId: The unique ID of the cooking post.
    // stepCurrent: The new step the user is on.
    // stepDesc: A short description of the current cooking step.
    //
    // Returns a Promise because the native update operation runs asynchronously.
    update(
        postId: string,
        stepCurrent: number,
        stepDesc: string,
        timerEndsAt?: number,
        timerLabel?: string,
    ): Promise<void>;

    // Stops an existing Live Activity.
    //
    // postId: The unique cooking post ID used to find the matching Live Activity.
    //
    // Returns a Promise because ending the native Live Activity happens asynchronously.
    stop(postId: string): Promise<void>; 
};
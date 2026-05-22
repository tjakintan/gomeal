//
//  AppIntent.swift
//  GoMealLiveActivityExtension
//
//  Created by TJ Akintan on 5/4/26.
//

import WidgetKit
import AppIntents
import ActivityKit

// Defines the App Intent that stops a GoMeal Live Activity from the Lock Screen widget.
// LiveActivityIntent allows this to run in the background without opening the app.
@available(iOS 16.2, *)
struct StopCookingIntent: LiveActivityIntent {

    static var title: LocalizedStringResource = "Stop Cooking"

    // The post_id attribute used to identify which Live Activity to stop.
    @Parameter(title: "Activity ID")
    var activityId: String

    // Called when the user taps the stop button on the Lock Screen widget.
    func perform() async throws -> some IntentResult {

        // activity.end() requires iOS 16.2 or newer.
        if #available(iOS 16.2, *) {

            // Loop through all active GoMeal Live Activities.
            for activity in Activity<GoMealLiveActivityAttributes>.activities {

                // Match by post_id attribute, not ActivityKit's internal activity.id.
                if activity.attributes.post_id == activityId {

                    // End the activity and remove it from the Lock Screen immediately.
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }

        return .result()
    }
}

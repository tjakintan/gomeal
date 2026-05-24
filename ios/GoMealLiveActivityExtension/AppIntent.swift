import WidgetKit
import AppIntents
import ActivityKit

@available(iOS 16.2, *)
struct StopCookingIntent: LiveActivityIntent {

    static var title: LocalizedStringResource = "Stop Cooking"

    @Parameter(title: "Activity ID")
    var activityId: String

    init() {}

    init(activityId: String) {
        self.$activityId.wrappedValue = activityId
    }

    func perform() async throws -> some IntentResult {
          for activity in Activity<GoMealLiveActivityAttributes>.activities {
              if activity.attributes.post_id == activityId {
                  await activity.end(nil, dismissalPolicy: .immediate)
              }
          }
        return .result()
    }
}

@available(iOS 16.2, *)
struct NextStepIntent: LiveActivityIntent {
    
    static var title: LocalizedStringResource = "Next Step"
    
    @Parameter(title: "Activity ID")
    var activityId: String
    
    @Parameter(title: "Current Step")
    var currentStep: Int
    
    @Parameter(title: "Steps JSON")
    var stepsJson: String
    
    init() {}

    init(activityId: String, currentStep: Int, stepsJson: String) {
        self.$activityId.wrappedValue = activityId
        self.$currentStep.wrappedValue = currentStep
        self.$stepsJson.wrappedValue = stepsJson
    }
    
    func perform() async throws -> some IntentResult {
          for activity in Activity<GoMealLiveActivityAttributes>.activities {
              if activity.attributes.post_id == activityId {
                  let nextStep = currentStep + 1
                  let total = activity.attributes.step_total
                  guard nextStep <= total else { break }
                  let steps = (try? JSONDecoder().decode(
                      [String].self,
                      from: Data(stepsJson.utf8)
                  )) ?? []
                  let nextDesc = steps.indices.contains(nextStep - 1)
                      ? steps[nextStep - 1]
                      : ""
                  let updatedState = GoMealLiveActivityAttributes.ContentState(
                      step_current: nextStep,
                      step_desc: nextDesc
                  )
                  await activity.update(
                      ActivityContent(state: updatedState, staleDate: nil)
                  )
                  break
              }
          }
        return .result()
    }
}

@available(iOS 16.2, *)
struct PrevStepIntent: LiveActivityIntent {
    
    static var title: LocalizedStringResource = "Previous Step"
    
    @Parameter(title: "Activity ID")
    var activityId: String
    
    @Parameter(title: "Current Step")
    var currentStep: Int
    
    @Parameter(title: "Steps JSON")
    var stepsJson: String
    
    init() {}

    init(activityId: String, currentStep: Int, stepsJson: String) {
        self.$activityId.wrappedValue = activityId
        self.$currentStep.wrappedValue = currentStep
        self.$stepsJson.wrappedValue = stepsJson
    }
    
    func perform() async throws -> some IntentResult {
          for activity in Activity<GoMealLiveActivityAttributes>.activities {
              if activity.attributes.post_id == activityId {
                  let prevStep = currentStep - 1
                  guard prevStep >= 1 else { break }
                  let steps = (try? JSONDecoder().decode(
                      [String].self,
                      from: Data(stepsJson.utf8)
                  )) ?? []
                  let prevDesc = steps.indices.contains(prevStep - 1)
                      ? steps[prevStep - 1]
                      : ""
                  let updatedState = GoMealLiveActivityAttributes.ContentState(
                      step_current: prevStep,
                      step_desc: prevDesc
                  )
                  await activity.update(
                      ActivityContent(state: updatedState, staleDate: nil)
                  )
                  break
              }
          }
        return .result()
    }
}

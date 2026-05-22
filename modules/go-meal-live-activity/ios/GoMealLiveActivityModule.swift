import ExpoModulesCore
import ActivityKit

public class GoMealLiveActivityModule: Module {

  public func definition() -> ModuleDefinition {
    Name("GoMealLiveActivity")

    Function("isAvailable") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (
      dishName: String,
      postId: String,
      stepTotal: Int,
      stepCurrent: Int,
      stepDesc: String,
      timerEndsAt: Double?,
      timerLabel: String?
    ) in
      guard #available(iOS 16.2, *) else { return }

      let timerDate: Date? = timerEndsAt.map { Date(timeIntervalSince1970: $0) }

      let attributes = GoMealLiveActivityAttributes(
        dish_name: dishName,
        step_total: stepTotal,
        post_id: postId
      )

      let contentState = GoMealLiveActivityAttributes.ContentState(
        step_current: stepCurrent,
        step_desc: stepDesc,
        timer_ends_at: timerDate,
        timer_label: timerLabel
      )

      let content = ActivityContent(state: contentState, staleDate: nil)

      do {
        let _ = try Activity<GoMealLiveActivityAttributes>.request(
          attributes: attributes,
          content: content
        )
      } catch {
        throw error
      }
    }

    AsyncFunction("update") { (
      postId: String,
      stepCurrent: Int,
      stepDesc: String,
      timerEndsAt: Double?,
      timerLabel: String?
    ) in
      guard #available(iOS 16.2, *) else { return }

      let timerDate: Date? = timerEndsAt.map { Date(timeIntervalSince1970: $0) }

      let contentState = GoMealLiveActivityAttributes.ContentState(
        step_current: stepCurrent,
        step_desc: stepDesc,
        timer_ends_at: timerDate,
        timer_label: timerLabel
      )

      let content = ActivityContent(state: contentState, staleDate: nil)

      for activity in Activity<GoMealLiveActivityAttributes>.activities
        where activity.attributes.post_id == postId {
        await activity.update(content)
      }
    }

    AsyncFunction("stop") { (postId: String) in
      guard #available(iOS 16.2, *) else { return }

      for activity in Activity<GoMealLiveActivityAttributes>.activities
        where activity.attributes.post_id == postId {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}

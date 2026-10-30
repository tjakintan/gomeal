import ExpoModulesCore
import ActivityKit
import Foundation
import UIKit

private func cacheProfileImage(urlString: String?, postId: String) async {
    guard let urlString,
          let url = URL(string: urlString),
          let (data, response) = try? await URLSession.shared.data(from: url),
          (response as? HTTPURLResponse)?.statusCode == 200,
          let image = UIImage(data: data),
          let container = FileManager.default.containerURL(
              forSecurityApplicationGroupIdentifier: "group.com.gomeal.shared"
          )
    else {
        return
    }

    let size = CGSize(width: 50, height: 50)

    let renderer = UIGraphicsImageRenderer(size: size)
    let resizedImage = renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: size))
    }

    guard let resizedData = resizedImage.jpegData(compressionQuality: 0.85) else {
        return
    }

    let destination = container.appendingPathComponent("profile_\(postId).jpg")
    try? resizedData.write(to: destination, options: .atomic)
}

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
        stepsJson: String,
        profileName: String,
        profileImgUrl: String?,
        timerEndsAt: Double?,
        timerLabel: String?
    ) in
      
      guard #available(iOS 16.2, *) else { return }

      await cacheProfileImage(
          urlString: profileImgUrl,
          postId: postId
      )

      let timerDate: Date? = timerEndsAt.map { Date(timeIntervalSince1970: $0) }

      let attributes = GoMealLiveActivityAttributes(
          dish_name: dishName,
          step_total: stepTotal,
          post_id: postId,
          steps_json: stepsJson,
          profile_name: profileName,
          profile_img_url: profileImgUrl
      )

      let contentState = GoMealLiveActivityAttributes.ContentState(
        step_current: stepCurrent,
        step_desc: stepDesc,
        timer_ends_at: timerDate,
        timer_label: timerLabel
      )

      let content = ActivityContent(
          state: contentState,
          staleDate: Calendar.current.date(byAdding: .hour, value: 3, to: Date()) 
      )

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
            let finalState = activity.content.state
            await activity.end(
                ActivityContent(
                    state: finalState,
                    staleDate: Date() 
                ),
                dismissalPolicy: .immediate
            )
        }
    }
  }
}

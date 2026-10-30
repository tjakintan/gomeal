import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents
import UIKit

extension Color {
  static let goMealTeal = Color(red: 0.0, green: 0.5, blue: 0.75) 
}

func cacheProfileImage(urlString: String, postId: String) async {
    guard let url = URL(string: urlString),
          let (data, _) = try? await URLSession.shared.data(from: url),
          let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: "group.com.gomeal.shared")
    else { return }
    try? data.write(to: container.appendingPathComponent("profile_\(postId).jpg"))
}

enum SharedImage {
    static func profile(postId: String) -> UIImage? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: "group.com.gomeal.shared")
        else { return nil }
        return UIImage(contentsOfFile:
            container.appendingPathComponent("profile_\(postId).jpg").path)
    }
}

struct ProfileAvatar: View {
    let postId: String
    let name: String

    var body: some View {
        HStack(spacing: 8) {
            Group {
                if let img = SharedImage.profile(postId: postId) {
                    Image(uiImage: img).resizable().scaledToFill()
                } else {
                    Color.white.opacity(0.3)
                        .overlay(Text(String(name.prefix(1)))
                            .font(.caption.bold()).foregroundStyle(.white))
                }
            }
            .frame(width: 30, height: 30)
            .clipShape(Circle())

            Text(name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
        }
    }
}

struct StepTrack: View {
    let current: Int
    let total: Int
    let activityId: String
    let stepsJson: String

    private let teal = Color.goMealTeal
    private let off = Color(red: 0.25, green: 0.66, blue: 0.78)

    private var count: Int { total + 2 }
    private var size: CGFloat { count > 9 ? 22 : 26 }

    private func reached(_ i: Int) -> Bool {
        i == count - 1 ? current >= total : i <= current
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { i in
                Group {
                    if i > 0 && i < count - 1 {
                        Button(intent: SelectStepIntent(
                            activityId: activityId,
                            targetStep: i,
                            stepsJson: stepsJson
                        )) {
                            node(i)
                        }
                        .buttonStyle(.plain)
                    } else {
                        node(i)
                    }
                }
                .zIndex(1)

                if i < count - 1 {
                    Rectangle()
                        .fill(reached(i + 1) ? .white : off)
                        .frame(height: 5)
                        .padding(.horizontal, -4)
                }
            }
        }
        .animation(
            .spring(response: 0.35, dampingFraction: 0.75),
            value: current
        )
    }

    @ViewBuilder
    private func node(_ i: Int) -> some View {
        let on = reached(i)
        let isCurrent = i == current && i > 0 && i < count - 1

        ZStack {
            Circle()
                .fill(on ? .white : off)

            if i == 0 {
                Image("GoMealLogoBlank")
                    .resizable()
                    .scaledToFit()
                    .padding(size * 0.2)
            } else if i == count - 1 {
                Image(systemName: "fork.knife")
                    .font(.system(size: size * 0.45, weight: .bold))
                    .foregroundStyle(on ? teal : .white.opacity(0.7))
            } else {
                Text("\(i)")
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundStyle(on ? teal : .white.opacity(0.8))
            }
        }
        .frame(width: size, height: size)
        .scaleEffect(isCurrent ? 1.15 : 1)
        .contentShape(Circle())
    }
}


@ViewBuilder
func navIcon(_ name: String) -> some View {
  Image(systemName: name)
    .font(.system(size: 18, weight: .bold))
    .foregroundStyle(.white)
    .frame(width: 34, height: 34)
    .contentShape(Rectangle())
}

struct GoMealLiveActivityExtensionLiveActivity: Widget {
  
  var body: some WidgetConfiguration {
    
      ActivityConfiguration(for: GoMealLiveActivityAttributes.self) { context in
          
        let isLastStep = context.state.step_current >= context.attributes.step_total
          
          let desc = context.state.step_desc
          let isTwoLines = desc.count > 45

          VStack(alignment: .leading, spacing: isTwoLines ? 8 : 10) {

            HStack {
              Text(context.attributes.dish_name)
                .font(.custom("LuckiestGuy-Regular", size: 18))
                .foregroundStyle(.white)
                .lineLimit(1)
              Spacer()
              Text("Step \(context.state.step_current) of \(context.attributes.step_total)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.75))
            }

            Text(context.state.step_desc.trimmingCharacters(in: .whitespacesAndNewlines))
                .font(.footnote.weight(.medium))
                .foregroundStyle(.white)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)

              StepTrack(
                  current: context.state.step_current,
                  total: context.attributes.step_total,
                  activityId: context.attributes.post_id,
                  stepsJson: context.attributes.steps_json
              )

            HStack(spacing: 8) {
              ProfileAvatar(postId: context.attributes.post_id,
                            name: context.attributes.profile_name)
              Spacer()

              if !isLastStep && context.state.step_current > 1 {
                Button(intent: PrevStepIntent(
                  activityId: context.attributes.post_id,
                  currentStep: context.state.step_current,
                  stepsJson: context.attributes.steps_json)) {
                  navIcon("chevron.left")
                }.buttonStyle(.plain)
              }

              Button(intent: NextStepIntent(
                activityId: context.attributes.post_id,
                currentStep: context.state.step_current,
                stepsJson: context.attributes.steps_json)) {
                navIcon(isLastStep ? "checkmark" : "chevron.right")
              }
              .buttonStyle(.plain)
              .disabled(isLastStep)
            }
          }
        .padding(.horizontal, 12) 
        .padding(.vertical, isTwoLines ? 10 : 12)
          .frame(minHeight: isTwoLines ? 160 : nil, alignment: .center)
          .background(Color.goMealTeal)
          .activityBackgroundTint(Color(red: 0.0, green: 0.7, blue: 0.85))
          .activitySystemActionForegroundColor(.white)

      } dynamicIsland: { context in
      
          DynamicIsland {

              
              DynamicIslandExpandedRegion(.bottom) {
                
                  VStack(alignment: .leading, spacing: 6) {

                      Text(context.state.step_desc.trimmingCharacters(in: .whitespacesAndNewlines))
                          .font(.system(size: 15, weight: .medium))
                          .foregroundStyle(.white)
                          .lineLimit(3)
                          .fixedSize(horizontal: false, vertical: true)
                          .frame(maxWidth: .infinity, alignment: .leading)
                          .contentTransition(.opacity)

                      StepTrack(
                          current: context.state.step_current,
                          total: context.attributes.step_total,
                          activityId: context.attributes.post_id,
                          stepsJson: context.attributes.steps_json
                      )
                      .frame(maxWidth: .infinity)
                      .padding(.bottom, 4)
                      .animation(
                          .spring(response: 0.4, dampingFraction: 0.75),
                          value: context.state.step_current
                      )
                  }
                  .padding(.horizontal, 2)
              }


          }
        compactLeading: {
            Image("GoMealLogo")
              .resizable()
              .scaledToFit()
              .frame(width: 18, height: 18)
      } compactTrailing: {
          Text("\(context.state.step_current)")
              .font(.system(size: 15, weight: .bold))
              .monospacedDigit()
              .foregroundStyle(.white)
              .contentTransition(.numericText())
      } minimal: {
        Image("GoMealLogo")
          .resizable()
          .scaledToFit()
          .frame(width: 14, height: 14)
      }
    }
  }
}

@main
struct GoMealLiveActivityExtensionBundle: WidgetBundle {
  var body: some Widget {
    GoMealLiveActivityExtensionLiveActivity()
  }
}

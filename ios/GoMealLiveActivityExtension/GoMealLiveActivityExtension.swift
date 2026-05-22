import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

struct GoMealLiveActivityExtensionLiveActivity: Widget {
  
  var body: some WidgetConfiguration {
    
    ActivityConfiguration(for: GoMealLiveActivityAttributes.self) { context in
      
      VStack(alignment: .leading, spacing: 14) {
        
        HStack(alignment: .center, spacing: 12) {
          
          
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.dish_name)
              .font(.custom("LuckiestGuy-Regular", size: 18))
              .foregroundStyle(.white)
              .lineLimit(1)
              .shadow(color: .black.opacity(0.2), radius: 1)
            
            Text("Step \(context.state.step_current) of \(context.attributes.step_total)")
              .font(.caption)
              .fontWeight(.semibold)
              .foregroundStyle(.white.opacity(0.75))
          }
          
          Spacer()
        }
        
        ProgressView(
          value: Double(max(0, min(context.state.step_current, context.attributes.step_total))),
          total: Double(max(context.attributes.step_total, 1))
        )
        .tint(.white)
        .background(.white.opacity(0.25), in: Capsule())
        
        VStack(alignment: .leading, spacing: 5) {
          
          Text("INSTRUCTION")
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(.white.opacity(0.6))
            .tracking(1.5)
          
          Text(context.state.step_desc)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.white)
            .lineLimit(3)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
        
        .overlay(
          RoundedRectangle(cornerRadius: 12)
            .strokeBorder(.white.opacity(0.2), lineWidth: 1)
        )
      }
      
      .padding(16)
      .activityBackgroundTint(Color(red: 0.0, green: 0.7, blue: 0.85))
      .activitySystemActionForegroundColor(.white)
      
    } dynamicIsland: { context in

        DynamicIsland {

            DynamicIslandExpandedRegion(.leading) {

                Image("GoMealLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            DynamicIslandExpandedRegion(.trailing) {

                Text("\(context.state.step_current)/\(context.attributes.step_total)")
                    .font(.headline)
                    .foregroundStyle(.white)
            }

            DynamicIslandExpandedRegion(.center) {

                Text(context.attributes.dish_name)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }

            DynamicIslandExpandedRegion(.bottom) {

                VStack(alignment: .leading, spacing: 4) {

                    Text(context.state.step_desc)
                        .font(.subheadline)
                        .foregroundStyle(.white)
                        .lineLimit(2)

                    if let timerEndsAt = context.state.timer_ends_at {

                        HStack {

                            if let label = context.state.timer_label {
                                Text(label)
                            }

                            Text(timerEndsAt, style: .timer)
                                .fontWeight(.bold)
                        }
                        .foregroundStyle(.white)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

        } compactLeading: {

            Image("GoMealLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 20, height: 20)

        } compactTrailing: {

            Text("\(context.state.step_current)")

        } minimal: {

            Image("GoMealLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 18, height: 18)
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


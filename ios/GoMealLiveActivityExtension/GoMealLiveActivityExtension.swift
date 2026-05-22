import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

struct GoMealLiveActivityExtensionLiveActivity: Widget {
  
    var body: some WidgetConfiguration {
      
        ActivityConfiguration(for: GoMealLiveActivityAttributes.self) { context in
          
            VStack(alignment: .leading, spacing: 14) {
              
                // Header row — stop button + dish name + step count
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

                // Progress bar
                ProgressView(
                    value: Double(max(0, min(context.state.step_current, context.attributes.step_total))),
                    total: Double(max(context.attributes.step_total, 1))
                )
                .tint(.white)
                .background(.white.opacity(0.25), in: Capsule())

                // Instruction box
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
                DynamicIslandExpandedRegion(.center) {
                    EmptyView()
                }
            } compactLeading: {
                EmptyView()
            } compactTrailing: {
                EmptyView()
            } minimal: {
                EmptyView()
            }
        }
    }
}

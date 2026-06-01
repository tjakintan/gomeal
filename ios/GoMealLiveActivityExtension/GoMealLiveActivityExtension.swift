import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

struct GoMealLiveActivityExtensionLiveActivity: Widget {
  
  var body: some WidgetConfiguration {
    
    ActivityConfiguration(for: GoMealLiveActivityAttributes.self) { context in
      
      let isLastStep = context.state.step_current >= context.attributes.step_total
      
      VStack(alignment: .leading, spacing: 14) {
        
        HStack(alignment: .center, spacing: 8) {
          
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

          if !isLastStep && context.state.step_current > 1 {
            Button(
              intent: PrevStepIntent(
                activityId: context.attributes.post_id,
                currentStep: context.state.step_current,
                stepsJson: context.attributes.steps_json
              )
            ) {
              Image(systemName: "chevron.left")
                .foregroundStyle(Color(red: 0.0, green: 0.7, blue: 0.85))
                .padding(.horizontal, 10)
                .padding(.vertical, 2)
                .background(.white)
                .clipShape(Capsule())
            }
          }
          
          Button(
            intent: NextStepIntent(
              activityId: context.attributes.post_id,
              currentStep: context.state.step_current,
              stepsJson: context.attributes.steps_json
            )
          ) {
            HStack(spacing: 4){
              if isLastStep {
                Image(systemName: "checkmark")
              } else {
                Image(systemName: "chevron.right")
              }
            }
            .foregroundStyle(Color(red: 0.0, green: 0.7, blue: 0.85))
            .padding(.horizontal, 10)
            .padding(.vertical, 2)
            .background(.white)
            .clipShape(Capsule())
          }
          .disabled(isLastStep)
        }
        
        ProgressView(
          value: Double(max(0, min(context.state.step_current, context.attributes.step_total))),
          total: Double(max(context.attributes.step_total, 1))
        )
        .tint(.white)
        .background(.white.opacity(0.25), in: Capsule())
        
        VStack(alignment: .leading, spacing: 8) {
          
          Text("INSTRUCTION")
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(.white.opacity(0.6))
            .tracking(1.5)
          
          Text(context.state.step_desc)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.white)
            .lineLimit(2)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .topLeading)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading) 
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
          
          HStack(spacing: 8) {
            
            Image("GoMealLogo")
              .resizable()
              .scaledToFit()
              .frame(width: 22, height: 22)
            
            Text(context.attributes.dish_name)
              .font(.custom("LuckiestGuy-Regular", size: 16))
              .foregroundStyle(.white)
              .lineLimit(1)
          }
          .padding(.horizontal)
        }
        
      } compactLeading: {
        Image("GoMealLogo")
          .resizable()
          .scaledToFit()
          .frame(width: 18, height: 18)
          
      } compactTrailing: {
        EmptyView()
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

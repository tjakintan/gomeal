//
//  GoMealLiveActivityAttributes.swift
//  GoMeal
//
import ActivityKit
import Foundation

struct GoMealLiveActivityAttributes: ActivityAttributes {

    public struct ContentState: Codable, Hashable {
        var step_current: Int
        var step_desc: String
        var timer_ends_at: Date?
        var timer_label: String?

        public init(
            step_current: Int,
            step_desc: String,
            timer_ends_at: Date? = nil,
            timer_label: String? = nil
        ) {
            self.step_current = step_current
            self.step_desc = step_desc
            self.timer_ends_at = timer_ends_at
            self.timer_label = timer_label
        }
    }

    var post_id: String
    var dish_name: String
    var step_total: Int

    public init(dish_name: String, step_total: Int, post_id: String) {
        self.dish_name = dish_name
        self.step_total = step_total
        self.post_id = post_id
    }
}
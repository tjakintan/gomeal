import ExpoModulesCore
import UIKit

public class NativeTabBarModule: Module {
    public func definition() -> ModuleDefinition {
        Name("NativeTabBar")

        View(NativeTabBarView.self) {
            Events("onTabPress")

            Prop("selectedIndex") { (view: NativeTabBarView, index: Int) in
                view.updateSelection(index)
            }

            Prop("activeColor") { (view: NativeTabBarView, color: String?) in
                view.setActiveColor(color)
            }

            Prop("badgeColor") { (view: NativeTabBarView, color: String?) in
                view.setBadgeColor(color)
            }

            Prop("badgeTextColor") { (view: NativeTabBarView, color: String?) in
                view.setBadgeTextColor(color)
            }

            Prop("badgeBorderColor") { (view: NativeTabBarView, color: String?) in
                view.setBadgeBorderColor(color)
            }

            Prop("items") { (view: NativeTabBarView, items: [[String: String]]) in
                view.setItems(items)
            }
        }
    }
}
import ExpoModulesCore

public class NativeTabBarModule: Module {
    public func definition() -> ModuleDefinition {
        Name("NativeTabBar")

        View(NativeTabBarView.self) {
            Events("onTabPress")

            Prop("selectedIndex") { (view: NativeTabBarView, index: Int) in
                guard let items = view.tabBar.items,
                      index >= 0,
                      index < items.count else {
                    return
                }

                view.tabBar.selectedItem = items[index]
            }

            Prop("items") { (view: NativeTabBarView, items: [[String: String]]) in
                let tabItems = items.enumerated().map { index, item in
                    UITabBarItem(
                        title: item["title"] ?? "",
                        image: nil,
                        tag: index
                    )
                }

                view.tabBar.setItems(tabItems, animated: false)

                if !tabItems.isEmpty {
                    view.tabBar.selectedItem = tabItems[0]
                }
            }
        }
    }
}
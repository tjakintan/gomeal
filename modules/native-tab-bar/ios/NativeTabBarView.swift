import ExpoModulesCore
import UIKit

final class NativeTabBarView: ExpoView, UITabBarDelegate {

    let tabBar = UITabBar()

    let onTabPress = EventDispatcher()

    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)

        tabBar.delegate = self

        addSubview(tabBar)

        tabBar.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            tabBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            tabBar.topAnchor.constraint(equalTo: topAnchor),
            tabBar.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }

    func tabBar(
        _ tabBar: UITabBar,
        didSelect item: UITabBarItem
    ) {
        guard let items = tabBar.items,
              let index = items.firstIndex(of: item) else {
            return
        }

        onTabPress([
            "index": index
        ])
    }
}
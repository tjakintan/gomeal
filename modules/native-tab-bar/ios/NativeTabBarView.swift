import ExpoModulesCore
import Lottie
import UIKit

extension UIColor {
    convenience init(hexString hex: String) {
        let hex = hex
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)

        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

public final class NativeTabBarView: ExpoView, UITabBarDelegate {

    public let tabBar = UITabBar()
    public let onTabPress = EventDispatcher()

    private var activeColor: UIColor?
    private var currentItems: [[String: String]] = []

    private let iconSize: CGFloat = 22
    private var lottieView: LottieAnimationView?


    // MARK: - Bundle
    private static let bundle: Bundle = {
        let moduleBundle = Bundle(for: NativeTabBarView.self)

        if let url = moduleBundle.url(
            forResource: "NativeTabBar",
            withExtension: "bundle"
        ),
        let bundle = Bundle(url: url) {
            return bundle
        }

        return moduleBundle
    }()


    // MARK: - Init
    public required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)

        tabBar.delegate = self
        tabBar.translatesAutoresizingMaskIntoConstraints = false

        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.selectionIndicatorTintColor = .clear

        tabBar.standardAppearance = appearance

        if #available(iOS 15.0, *) {
            tabBar.scrollEdgeAppearance = appearance
        }

        addSubview(tabBar)

        NSLayoutConstraint.activate([
            tabBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            tabBar.topAnchor.constraint(equalTo: topAnchor),
            tabBar.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        layoutLottie()
        updateBadges()
    }

    // MARK: - Public
    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            setNeedsLayout()
            layoutIfNeeded()
        }
    }

    func setActiveColor(_ color: String?) {
        activeColor = color.flatMap {
            $0.isEmpty ? nil : UIColor(hexString: $0)
        }

        tabBar.tintColor = activeColor

        // Recreate ChefNex using the new color.
        lottieView?.removeFromSuperview()
        lottieView = nil

        rebuildItems()
    }

    func setItems(_ items: [[String: String]]) {
        currentItems = items
        rebuildItems()
    }

    func updateSelection(_ index: Int) {
        guard
            let items = tabBar.items,
            items.indices.contains(index)
        else {
            return
        }

        tabBar.selectedItem = items[index]
    }


    // MARK: - Badge state
    private var badgeColor = UIColor(hexString: "#f65353")
    private var badgeTextColor = UIColor.white
    private var badgeBorderColor = UIColor.black

    private let badgeHeight: CGFloat = 15
    private let badgeDotSize: CGFloat = 7
    private let badgeBorderWidth: CGFloat = 2

    private let badgeOffsetX: CGFloat = -2
    private let badgeOffsetY: CGFloat = 3

    private var badgeViews: [Int: UIView] = [:]
    private var badgeLabels: [Int: UILabel] = [:]
    private var badgeIsDot: [Int: Bool] = [:]
    private var lastCounts: [Int: Int] = [:]
    private var collapsedBadges: Set<Int> = []

    func setBadgeColor(_ color: String?) {
        if let color, !color.isEmpty { badgeColor = UIColor(hexString: color) }
        updateBadges()
    }

    func setBadgeTextColor(_ color: String?) {
        badgeTextColor = .white
        updateBadges()
    }

    func setBadgeBorderColor(_ color: String?) {
        if let color, !color.isEmpty { badgeBorderColor = UIColor(hexString: color) }
        updateBadges()
    }

    /// The real on-screen frame of a tab's icon, in tabBar coordinates.
    private func iconFrame(for index: Int) -> CGRect? {
        tabBar.layoutIfNeeded()

        let buttons = tabBar.subviews
            .filter { String(describing: type(of: $0)).contains("TabBarButton") }
            .sorted { $0.frame.minX < $1.frame.minX }

        guard buttons.indices.contains(index) else { return nil }
        let button = buttons[index]

        // Normal case: the button holds a UIImageView with the icon.
        if let imageView = button.subviews.first(where: { $0 is UIImageView }) {
            return imageView.convert(imageView.bounds, to: tabBar)
        }

        // No image (e.g. the ChefNex Lottie tab): use the button's center.
        let c = CGPoint(x: button.frame.midX, y: button.frame.midY)
        return CGRect(x: c.x - iconSize / 2, y: c.y - iconSize / 2,
                    width: iconSize, height: iconSize)
    }

    private func removeBadge(at index: Int, animated: Bool) {
        guard let badge = badgeViews.removeValue(forKey: index) else { return }
        badgeLabels.removeValue(forKey: index)
        badgeIsDot.removeValue(forKey: index)

        guard animated, window != nil else {
            badge.removeFromSuperview()
            return
        }

        UIView.animate(
            withDuration: 0.15,
            delay: 0,
            options: [.beginFromCurrentState, .curveEaseIn],
            animations: {
                badge.alpha = 0
                badge.transform = CGAffineTransform(scaleX: 0.3, y: 0.3)
            },
            completion: { _ in
                badge.removeFromSuperview()
            }
        )
    }

    private func updateBadges() {
        guard let items = tabBar.items, !items.isEmpty else {
            badgeViews.values.forEach { $0.removeFromSuperview() }
            badgeViews.removeAll()
            badgeLabels.removeAll()
            badgeIsDot.removeAll()
            return
        }

        // Wait until we're on screen and laid out, otherwise the pop-in plays invisibly.
        guard window != nil, !tabBar.bounds.isEmpty else { return }

        for index in Array(badgeViews.keys) where index >= currentItems.count {
            removeBadge(at: index, animated: false)
        }

        let tabWidth = tabBar.bounds.width / CGFloat(items.count)

        for (index, item) in currentItems.enumerated() {
            let count = Int(item["badgeCount"] ?? "") ?? 0
            let previous = lastCounts[index] ?? 0
            lastCounts[index] = count

            // Fully read, or new unread arrived -> show the number again.
            if count == 0 || count > previous {
                collapsedBadges.remove(index)
            }

            guard count > 0, index < items.count else {
                removeBadge(at: index, animated: true)
                continue
            }

            let badge: UIView
            let label: UILabel
            var isNew = false

            if let existing = badgeViews[index], let existingLabel = badgeLabels[index] {
                badge = existing
                label = existingLabel
            } else {
                isNew = true

                badge = UIView()
                badge.isUserInteractionEnabled = false
                badge.accessibilityTraits = .updatesFrequently
                badge.layer.borderWidth = badgeBorderWidth

                label = UILabel()
                label.font = .systemFont(ofSize: 10, weight: .heavy)
                label.textAlignment = .center
                label.numberOfLines = 1
                badge.addSubview(label)

                badgeViews[index] = badge
                badgeLabels[index] = label
                tabBar.addSubview(badge)
            }

            // Theme
            badge.backgroundColor = badgeColor
            badge.layer.borderColor = badgeBorderColor.cgColor
            label.textColor = .white
            label.tintColor = .white
            badge.accessibilityLabel = "\(count) unread"

            // Content
            let wantsDot = collapsedBadges.contains(index)
            let text = count > 99 ? "99+" : "\(count)"
            label.text = text
            label.sizeToFit()

            // 1 digit = perfect circle, 2+ digits = pill growing to the right
            let size: CGSize = wantsDot
                ? CGSize(width: badgeDotSize, height: badgeDotSize)
                : CGSize(
                    width: text.count == 1 ? badgeHeight : max(badgeHeight, label.bounds.width + 10),
                    height: badgeHeight
                )

            // Anchor = bottom-right of the icon
            let anchor: CGPoint

            if let frame = iconFrame(for: index) {
                anchor = CGPoint(
                    x: frame.maxX + badgeOffsetX,
                    y: frame.maxY + badgeOffsetY
                )
            } else {
                let iconCenterX = tabWidth * (CGFloat(index) + 0.5)
                let fallbackOffsetX: CGFloat = wantsDot ? 18 : 15

                anchor = CGPoint(
                    x: iconCenterX + iconSize / 2 + badgeOffsetX + fallbackOffsetX,
                    y: tabBar.bounds.midY + iconSize / 2 - badgeOffsetY - 10
                )
            }

            let center: CGPoint = (wantsDot || text.count == 1)
                ? anchor
                : CGPoint(x: anchor.x - badgeHeight / 2 + size.width / 2, y: anchor.y)

            // bounds + center (not frame) so layout stays valid under a scale transform
            let applyLayout = {
                badge.bounds = CGRect(origin: .zero, size: size)
                badge.center = center
                badge.layer.cornerRadius = size.height / 2
                label.frame = badge.bounds
                label.alpha = wantsDot ? 0 : 1
            }

            let wasDot = badgeIsDot[index]
            badgeIsDot[index] = wantsDot

            if isNew {
                // Position first, then start from scaled-down + transparent and spring in.
                applyLayout()
                badge.alpha = 0
                badge.transform = CGAffineTransform(scaleX: 0.01, y: 0.01)

                UIView.animate(
                    withDuration: 0.4,
                    delay: 0.15, // lets the app's first frame settle so the pop is noticed
                    usingSpringWithDamping: 0.55,
                    initialSpringVelocity: 0.8,
                    options: [],
                    animations: {
                        badge.alpha = 1
                        badge.transform = .identity
                    }
                )
            } else if let wasDot, wasDot != wantsDot {
                UIView.animate(
                    withDuration: 0.3,
                    delay: 0,
                    usingSpringWithDamping: 0.7,
                    initialSpringVelocity: 0.5,
                    options: [.beginFromCurrentState],
                    animations: applyLayout
                )
            } else {
                applyLayout()
            }
        }

        for badge in badgeViews.values {
            tabBar.bringSubviewToFront(badge)
        }
    }

    // MARK: - Items
    private func rebuildItems() {
        let selectedIndex = tabBar.items?.firstIndex(
            of: tabBar.selectedItem ?? UITabBarItem()
        )

        let items = currentItems.map { item in
            let active = item["activeIcon"]
            let inactive = item["inactiveIcon"]

            let tabItem = UITabBarItem(
                title: nil,
                image: active == "ChefNex"
                    ? nil
                    : resolveIcon(inactive),
                selectedImage: active == "ChefNex"
                    ? nil
                    : resolveIcon(active)
            )

            tabItem.accessibilityLabel = item["title"]

            // Disable UIKit's numbered badge.
            tabItem.badgeValue = nil
            tabItem.badgeColor = nil

            return tabItem
        }

        tabBar.setItems(items, animated: false)

        if !items.isEmpty {
            updateSelection(
                min(selectedIndex ?? 0, items.count - 1)
            )
        }

        layoutLottie()
        updateBadges()
    }


    // MARK: - Lottie
    private func createChefNexAnimation() -> LottieAnimation? {
        guard let url = Self.bundle.url(
            forResource: "ChefNex",
            withExtension: "json"
        ) else {
            print("❌ ChefNex.json not found")
            return nil
        }

        do {
            let data = try Data(contentsOf: url)

            guard var json = try JSONSerialization.jsonObject(
                with: data,
                options: []
            ) as? [String: Any] else {
                print("❌ ChefNex.json has invalid JSON")
                return nil
            }

            // If no active color was provided, use the original animation.
            guard let color = activeColor else {
                return try LottieAnimation.from(data: data)
            }

            var red: CGFloat = 0
            var green: CGFloat = 0
            var blue: CGFloat = 0
            var alpha: CGFloat = 1

            guard color.getRed(
                &red,
                green: &green,
                blue: &blue,
                alpha: &alpha
            ) else {
                print("❌ Could not extract RGB from active color")
                return try LottieAnimation.from(data: data)
            }

            let replacementColor: [String: Any] = [
                "a": 0,
                "k": [
                    Double(red),
                    Double(green),
                    Double(blue),
                    Double(alpha)
                ],
                "ix": 4
            ]

            func recolor(_ value: Any) -> Any {
                guard var dictionary = value as? [String: Any] else {
                    return value
                }

                // Lottie shape fill.
                if let type = dictionary["ty"] as? String,
                   type == "fl" {
                    dictionary["c"] = replacementColor
                }

                // Nested layers.
                if let layers = dictionary["layers"] as? [[String: Any]] {
                    dictionary["layers"] = layers.map {
                        recolor($0) as! [String: Any]
                    }
                }

                // Nested shapes.
                if let shapes = dictionary["shapes"] as? [[String: Any]] {
                    dictionary["shapes"] = shapes.map {
                        recolor($0) as! [String: Any]
                    }
                }

                // Nested shape-group items.
                if let items = dictionary["it"] as? [[String: Any]] {
                    dictionary["it"] = items.map {
                        recolor($0) as! [String: Any]
                    }
                }

                return dictionary
            }

            if let layers = json["layers"] as? [[String: Any]] {
                json["layers"] = layers.map {
                    recolor($0) as! [String: Any]
                }
            }

            let modifiedData = try JSONSerialization.data(
                withJSONObject: json,
                options: []
            )

            return try LottieAnimation.from(
                data: modifiedData
            )

        } catch {
            print("❌ Failed to create recolored ChefNex animation:")
            print(error)
            return nil
        }
    }

    private func layoutLottie() {
        guard
            let index = currentItems.firstIndex(where: {
                $0["activeIcon"] == "ChefNex" ||
                $0["inactiveIcon"] == "ChefNex"
            }),
            !tabBar.bounds.isEmpty
        else {
            lottieView?.removeFromSuperview()
            lottieView = nil
            return
        }

        // Create Lottie once.
        if lottieView == nil {
            guard let animation = createChefNexAnimation() else {
                return
            }

            let view = LottieAnimationView(
                animation: animation
            )

            view.contentMode = .scaleAspectFit
            view.loopMode = .loop
            view.isUserInteractionEnabled = false

            tabBar.addSubview(view)

            lottieView = view

            view.play()
        }

        guard let view = lottieView else {
            return
        }

        let count = CGFloat(
            max(currentItems.count, 1)
        )

        let width = tabBar.bounds.width / count
        let size: CGFloat = 32

        view.frame = CGRect(
            x: CGFloat(index) * width + (width - size) / 2,
            y: (tabBar.bounds.height - size) / 2 - 10,
            width: size,
            height: size
        )

        tabBar.bringSubviewToFront(view)
        updateBadges()
    }

    // MARK: - Icons

    private func resolveIcon(_ name: String?) -> UIImage? {
        guard
            let name,
            !name.isEmpty
        else {
            return nil
        }

        guard let image = UIImage(
            named: name,
            in: Self.bundle,
            compatibleWith: nil
        ) else {
            return nil
        }

        let renderer = UIGraphicsImageRenderer(
            size: CGSize(
                width: iconSize,
                height: iconSize
            )
        )

        let resized = renderer.image { _ in
            image.draw(
                in: CGRect(
                    x: 0,
                    y: 0,
                    width: iconSize,
                    height: iconSize
                )
            )
        }

        return resized.withRenderingMode(
            .alwaysTemplate
        )
    }

    // MARK: - Delegate
    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard let items = tabBar.items, let index = items.firstIndex(of: item) else { return }

        // Instagram-style: after a tap, the number collapses to a dot.
        if index < currentItems.count,
        (Int(currentItems[index]["badgeCount"] ?? "") ?? 0) > 0,
        !collapsedBadges.contains(index) {
            collapsedBadges.insert(index)
            updateBadges()
        }

        onTabPress(["index": index])
    }
}
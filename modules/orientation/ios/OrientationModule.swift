import ExpoModulesCore
import UIKit

private func activeScene() -> UIWindowScene? {
    UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .first(where: { $0.activationState == .foregroundActive })
}

private func topViewController() -> UIViewController? {
    var top = activeScene()?.keyWindow?.rootViewController
    while let presented = top?.presentedViewController {
        top = presented
    }
    return top
}

private func refreshSupportedOrientations() {
    if #available(iOS 16.0, *) {
        topViewController()?.setNeedsUpdateOfSupportedInterfaceOrientations()
    } else {
        topViewController()?.setNeedsStatusBarAppearanceUpdate()
    }
    UIViewController.attemptRotationToDeviceOrientation()
}

private func syncToDeviceOrientation() {
    guard let scene = activeScene() else { return }

    let device = UIDevice.current.orientation
    guard device == .landscapeLeft || device == .landscapeRight else { return }

    // device and interface landscape are mirrored
    let target: UIInterfaceOrientationMask =
        device == .landscapeLeft ? .landscapeRight : .landscapeLeft

    if #available(iOS 16.0, *) {
        topViewController()?.setNeedsUpdateOfSupportedInterfaceOrientations()
        scene.requestGeometryUpdate(.iOS(interfaceOrientations: target)) { error in
            print("[Orientation] sync failed: \(error)")
        }
    } else {
        UIViewController.attemptRotationToDeviceOrientation()
    }
}

public class OrientationModule: Module {
    private let activeKey = "GoMealOrientationEnabled"

    public func definition() -> ModuleDefinition {
        Name("Orientation")

        Function("setActive") { (active: Bool) in
            UserDefaults.standard.set(active, forKey: self.activeKey)

            DispatchQueue.main.async {
                UIDevice.current.beginGeneratingDeviceOrientationNotifications()
                refreshSupportedOrientations()
            }

            if active {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    syncToDeviceOrientation()
                }
            }
        }

        Function("rotate") { (landscape: Bool) in
            DispatchQueue.main.async {
                guard let scene = activeScene() else { return }

                if #available(iOS 16.0, *) {
                    topViewController()?.setNeedsUpdateOfSupportedInterfaceOrientations()

                    scene.requestGeometryUpdate(
                        .iOS(interfaceOrientations: landscape ? .landscape : .portrait)
                    ) { error in
                        print("[Orientation] rotate failed: \(error)")
                    }
                } else {
                    let value = landscape
                        ? UIInterfaceOrientation.landscapeRight.rawValue
                        : UIInterfaceOrientation.portrait.rawValue
                    UIDevice.current.setValue(value, forKey: "orientation")
                    UIViewController.attemptRotationToDeviceOrientation()
                }
            }
        }
    }
}
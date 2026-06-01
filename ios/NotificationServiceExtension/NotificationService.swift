import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {

        self.contentHandler = contentHandler
        bestAttemptContent =
            request.content.mutableCopy() as? UNMutableNotificationContent

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        guard let imageUrlString = bestAttemptContent.userInfo["image"] as? String,
              let imageUrl = URL(string: imageUrlString) else {
            contentHandler(bestAttemptContent)
            return
        }

        URLSession.shared.downloadTask(with: imageUrl) { location, _, error in

            guard let location = location, error == nil else {
                contentHandler(bestAttemptContent)
                return
            }

            let tempDir = URL(fileURLWithPath: NSTemporaryDirectory())

            let localUrl = tempDir.appendingPathComponent(
                imageUrl.lastPathComponent
            )

            do {
                try? FileManager.default.removeItem(at: localUrl)

                try FileManager.default.moveItem(
                    at: location,
                    to: localUrl
                )

                let attachment = try UNNotificationAttachment(
                    identifier: "image",
                    url: localUrl
                )

                bestAttemptContent.attachments = [attachment]
            } catch {
                print("Attachment error:", error)
            }

            contentHandler(bestAttemptContent)

        }.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler,
           let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}

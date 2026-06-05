import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {

        self.contentHandler = contentHandler

        guard let bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }

        self.bestAttemptContent = bestAttemptContent

        guard let imageUrlString = bestAttemptContent.userInfo["image"] as? String,
              let imageUrl = URL(string: imageUrlString) else {
            contentHandler(bestAttemptContent)
            return
        }

        let task = URLSession.shared.dataTask(with: imageUrl) { data, _, _ in

            guard let data = data else {
                contentHandler(bestAttemptContent)
                return
            }

            let tempDir = URL(fileURLWithPath: NSTemporaryDirectory())
            let fileURL = tempDir.appendingPathComponent("image.jpg")

            do {
                try? FileManager.default.removeItem(at: fileURL)
                try data.write(to: fileURL)

                let attachment = try UNNotificationAttachment(
                    identifier: "image",
                    url: fileURL,
                    options: [
                        UNNotificationAttachmentOptionsTypeHintKey: "public.jpeg"
                    ]
                )

                bestAttemptContent.attachments = [attachment]

            } catch {
                // silently fail → still show notification
            }

            contentHandler(bestAttemptContent)
        }

        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler,
           let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}

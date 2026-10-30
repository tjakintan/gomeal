
import Intents
import UserNotifications
import UniformTypeIdentifiers

final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?
    private var finished = false

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler

        guard let content = request.content.mutableCopy()
            as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }

        bestAttemptContent = content

        let userInfo = content.userInfo
        let data = userInfo["data"] as? [String: Any] ?? [:]
        let payload = data.isEmpty
            ? userInfo.reduce(into: [String: Any]()) { result, item in
                if let key = item.key as? String {
                    result[key] = item.value
                }
            }
            : data

        let notificationType = payload["type"] as? String

        if ["trending_post", "recommend_post"].contains(notificationType ?? "") {
            let imageURLString =
                (payload["image_url"] as? String) ??
                (userInfo["image_url"] as? String)

            Task {
                if let attachment = await makeAttachment(from: imageURLString) {
                    content.attachments = [attachment]
                }

                finish(content)
            }

            return
        }

        // Preserve the existing chat notification behavior.
        guard notificationType == "message" else {
            finish(content)
            return
        }

        let profileURLString = payload["profile_image_url"] as? String
        let senderID = payload["sender_id"] as? String ?? "unknown-sender"
        let senderName = content.title.isEmpty
            ? "Someone"
            : content.title

        let conversationID =
            payload["conversation_id"] as? String ?? senderID

        let messageImageURLString =
            (payload["image_url"] as? String) ??
            (userInfo["image_url"] as? String)

        Task {
            // Download the sender avatar separately from message media.
            let avatarURL = await downloadImage(
                from: profileURLString
            )

            // Preserve the existing image attachment preview when available.
            if let attachment = await makeAttachment(
                from: messageImageURLString
            ) {
                content.attachments = [attachment]
            }

            guard let avatarURL else {
                // No avatar? Deliver the notification normally.
                finish(content)
                return
            }

            let handle = INPersonHandle(
                value: senderID,
                type: .unknown
            )

            let sender = INPerson(
                personHandle: handle,
                nameComponents: nil,
                displayName: senderName,
                image: INImage(url: avatarURL),
                contactIdentifier: nil,
                customIdentifier: senderID
            )

            let intent = INSendMessageIntent(
                recipients: nil,
                outgoingMessageType: .outgoingMessageText,
                content: content.body,
                speakableGroupName: nil,
                conversationIdentifier: conversationID,
                serviceName: "GoMeal",
                sender: sender,
                attachments: nil
            )

            let interaction = INInteraction(
                intent: intent,
                response: nil
            )
            interaction.direction = .incoming

            do {
                try await interaction.donate()

                let updatedContent = try content.updating(
                    from: intent
                )

                finish(updatedContent)
            } catch {
                // Fall back to a standard notification if the intent fails.
                finish(content)
            }
        }
    }

    private func downloadImage(from string: String?) async -> URL? {
        guard
            let string,
            let url = URL(string: string),
            ["https", "http"].contains(
                url.scheme?.lowercased() ?? ""
            )
        else {
            return nil
        }

        do {
            let (temporaryURL, response) =
                try await URLSession.shared.download(from: url)

            guard
                let response = response as? HTTPURLResponse,
                (200...299).contains(response.statusCode)
            else {
                return nil
            }

            let mimeType = response.mimeType?.lowercased() ?? ""
            let ext: String

            switch mimeType {
            case "image/jpeg":
                ext = "jpg"
            case "image/png":
                ext = "png"
            case "image/gif":
                ext = "gif"
            case "image/heic":
                ext = "heic"
            case "image/webp":
                ext = "webp"
            default:
                return nil
            }

            let destination = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(ext)

            try FileManager.default.copyItem(
                at: temporaryURL,
                to: destination
            )

            return destination
        } catch {
            return nil
        }
    }

    private func makeAttachment(
        from string: String?
    ) async -> UNNotificationAttachment? {
        guard let url = await downloadImage(from: string) else {
            return nil
        }

        do {
            return try UNNotificationAttachment(
                identifier: "message-image",
                url: url,
                options: nil
            )
        } catch {
            try? FileManager.default.removeItem(at: url)
            return nil
        }
    }

    private func finish(_ content: UNNotificationContent) {
        guard !finished else { return }
        finished = true
        contentHandler?(content)
    }

    override func serviceExtensionTimeWillExpire() {
        if let bestAttemptContent {
            finish(bestAttemptContent)
        }
    }
}

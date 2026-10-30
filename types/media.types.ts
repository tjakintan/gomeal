import { MessageType } from "./messages.types";

export const POST_MAX_RECORDING_S = 15 * 60;

export const POST_MAX_RECORDING_MS = POST_MAX_RECORDING_S * 1000;

export const MESSAGE_MAX_RECORDING_S = 3 * 60;

export const MESSAGE_MAX_RECORDING_MS = MESSAGE_MAX_RECORDING_S * 1000;

export type MediaContext = "post" | "message" | "profile";

export const MAX_RECORDING_S: Record<MediaContext, number> = {
    post: POST_MAX_RECORDING_S,
    message: MESSAGE_MAX_RECORDING_S,
    profile: 0, 
};

export type DownloadMediaType =
    | "gif"
    | "image"
    | "video";

export type DownloadedMedia = {
    uri: string;
    mediaType: "image" | "video";
    contentType:
        | "image/gif"
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "video/mp4";
};

export const MEDIA_UPLOAD_TYPES = [
    "profile_image",

    "post_image",
    "post_video",
    "post_step",

    "message_image",
    "message_video",
    "message_gif",
    "message_voice",
    "message_file",
] as const;

export type MediaUploadType =
    (typeof MEDIA_UPLOAD_TYPES)[number];


export type ImageMediaType = 
    | "image"
    | "video";

export type MediaType =
    | "image"
    | "video"
    | "gif"
    | "audio"
    | "file";


export const CONTENT_TYPES: Record<
    MediaType,
    string
> = {
    image: "image/jpeg",
    video: "video/mp4",
    gif: "image/gif",
    audio: "audio/m4a",
    file: "application/octet-stream",
};


export const getMessageUploadType = (
    messageType: MessageType
): MediaUploadType | null => {

    switch (messageType) {

        case "image":
            return "message_image";

        case "video":
            return "message_video";

        case "gif":
            return "message_gif";

        case "voice":
            return "message_voice";

        case "file":
            return "message_file";

        default:
            return null;
    }
};


export const getMessageTypeFromUploadType = (
    uploadType: MediaUploadType
): MessageType | null => {

    switch (uploadType) {

        case "message_image":
            return "image";

        case "message_video":
            return "video";

        case "message_gif":
            return "gif";

        case "message_voice":
            return "voice";

        case "message_file":
            return "file";

        default:
            return null;
    }
};


export const getMediaTypeFromContentType = (
    contentType: string
): "image" | "video" => {

    return contentType.startsWith("video/")
        ? "video"
        : "image";
};


export const getContentTypeFromExtension = (
    extension: string
): DownloadedMedia["contentType"] | null => {

    switch (
        extension.toLowerCase()
    ) {

        case "gif":
            return "image/gif";

        case "jpg":
        case "jpeg":
            return "image/jpeg";

        case "png":
            return "image/png";

        case "webp":
            return "image/webp";

        case "mp4":
            return "video/mp4";

        default:
            return null;
    }
};
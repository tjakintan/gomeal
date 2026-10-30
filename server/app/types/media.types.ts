export const POST_MAX_RECORDING_S = 15 * 60;

export const MESSAGE_MAX_RECORDING_S = 3 * 60;

export const isValidDuration = (v: unknown, max: number) =>
    v == null || (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max);

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


export type MediaType =
    | "image"
    | "video"
    | "audio"
    | "file";


export const MEDIA_FOLDERS: Record<
    MediaUploadType,
    string
> = {
    profile_image:
        "profile_images",

    post_image:
        "posts/images",

    post_video:
        "posts/videos",

    post_step:
        "posts/steps",

    message_image:
        "messages/images",

    message_video:
        "messages/videos",

    message_gif:
        "messages/gifs",

    message_voice:
        "messages/voice",

    message_file:
        "messages/files",
};


export const MEDIA_TYPES: Record<
    MediaUploadType,
    MediaType
> = {
    profile_image: "image",

    post_image: "image",

    post_video: "video",

    post_step: "image",

    message_image: "image",

    message_video: "video",

    message_gif: "image",

    message_voice: "audio",

    message_file: "file",
};


export type S3ContentType =
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "video/mp4"
    | "audio/m4a"
    | "audio/mpeg"
    | "application/pdf";


export const CONTENT_EXTENSIONS: Record<
    S3ContentType,
    string
> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",

    "video/mp4": "mp4",

    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",

    "application/pdf": "pdf",
};


export const CONTENT_TYPES: Record<
    MediaType,
    S3ContentType
> = {
    image: "image/jpeg",
    video: "video/mp4",
    audio: "audio/m4a",
    file: "application/pdf",
};


export const isMediaUploadType = (
    value: unknown
): value is MediaUploadType => {

    return (
        typeof value === "string" &&
        MEDIA_UPLOAD_TYPES.includes(
            value as MediaUploadType
        )
    );
};
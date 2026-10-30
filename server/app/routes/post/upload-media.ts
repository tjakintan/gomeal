import {
    CONTENT_TYPES,
    MEDIA_FOLDERS,
    MEDIA_TYPES,
    isMediaUploadType,
    MediaType,
    MediaUploadType,
} from "@/types/media.types";

import s3 from "@/services/s3";

export interface UploadMediaResult {
    presignedUrl: string;
    s3Url: string;
}

export const uploadMedia = async (
    user_sub: string,
    mediaType: MediaType,
    uploadType: MediaUploadType
): Promise<UploadMediaResult> => {

    if (
        !user_sub ||
        !mediaType ||
        !uploadType
    ) {
        throw new Error(
            "request_failed_missing_body"
        );
    }

    if (!isMediaUploadType(uploadType)) {
        throw new Error(
            "invalid_upload_type"
        );
    }

    const expectedMediaType =
        MEDIA_TYPES[uploadType];

    if (
        mediaType !== expectedMediaType
    ) {
        throw new Error(
            "invalid_media_type_for_upload_type"
        );
    }

    const folder =
        MEDIA_FOLDERS[uploadType];

    const s3Folder =
        `${user_sub}/${folder}`;

    const contentType =
        CONTENT_TYPES[mediaType];

    return s3(
        s3Folder,
        contentType
    );
};
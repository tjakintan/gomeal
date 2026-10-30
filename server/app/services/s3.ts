import { CONTENT_EXTENSIONS, S3ContentType } from "@/types/media.types";
import {
    S3Client,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

import {
    getSignedUrl,
} from "@aws-sdk/s3-request-presigner";


const S3_BUCKET =
    process.env.S3_BUCKET_NAME;


const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    requestChecksumCalculation:
        "WHEN_REQUIRED",
    responseChecksumValidation:
        "WHEN_REQUIRED",
});


const s3 = async (
    folder: string,
    contentType: S3ContentType =
        "image/jpeg"
): Promise<{
    presignedUrl: string;
    s3Url: string;
}> => {

    if (!S3_BUCKET) {
        throw new Error(
            "S3_BUCKET_NAME is not configured"
        );
    }


    const extension =
        CONTENT_EXTENSIONS[contentType];


    const key =
        `${folder}/${Date.now()}.${extension}`;


    const command =
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            ContentType: contentType,
        });


    const presignedUrl =
        await getSignedUrl(
            s3Client,
            command,
            {
                expiresIn: 300,
            }
        );


    return {
        presignedUrl,
        s3Url:
            `https://${S3_BUCKET}.s3.amazonaws.com/${key}`,
    };
};


export default s3;
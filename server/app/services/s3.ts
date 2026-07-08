import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_FOLDER_STRUCT } from "../types/services.types";

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const s3 = async (
    folder: S3_FOLDER_STRUCT, 
    contentType: "image/jpeg" | "image/png" | "video/mp4" = "image/jpeg"
): Promise<{ presignedUrl: string; s3Url: string }> => {

    const extension = contentType.split("/")[1];
    const key = `${folder}/${Date.now()}.${extension}`;

    const presignedUrl = await getSignedUrl(s3Client, new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
    }), { expiresIn: 300 });

    return { presignedUrl, s3Url: `https://${S3_BUCKET}.s3.amazonaws.com/${key}` };
};



export default s3;
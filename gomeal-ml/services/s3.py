import os
import time
import boto3
from typing import Tuple, Optional

from dotenv import load_dotenv

load_dotenv()
S3_ML_BUCKET_NAME=os.getenv("S3_ML_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

def s3(
    folder: str,
    content_type: str = "image/jpeg",
    filename: Optional[str] = None,
) -> Tuple[str, str]:
    """
        Generate presigned S3 upload URL + public S3 URL
    """

    extension = content_type.split("/")[-1]

    if filename:
        if not filename.endswith(f".{extension}"):
            filename = f"{filename}.{extension}"
        key = f"{folder}/{filename}"
    else:
        key = f"{folder}/{int(time.time() * 1000)}.{extension}"

    presigned_url = s3_client.generate_presigned_url(

        ClientMethod="put_object",

        Params={
            "Bucket": S3_ML_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=300 

    )

    s3_url = f"https://{S3_ML_BUCKET_NAME}.s3.amazonaws.com/{key}"

    return presigned_url, s3_url
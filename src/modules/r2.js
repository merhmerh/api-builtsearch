import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

export const s3 = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
});

export async function getUploadUrls(paths, bucket) {
	const availableBuckets = ["builtsearch-private", "builtsearch-public"];

	const Bucket = bucket && availableBuckets.includes(bucket) ? bucket : null;
	if (!Bucket) {
		throw new Error("Invalid bucket name");
	}

	if (typeof paths === "string") {
		paths = [paths];
	} else {
		paths = paths.map((path) => path.replace(/^\//g, ""));
	}

	return Promise.all(
		paths.map(async (file_path) => {
			const Key = file_path;
			const command = new PutObjectCommand({ Bucket, Key });
			const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

			let uploaded_url = null;
			if (bucket === "builtsearch-public") {
				uploaded_url = `https://cdn.builtsearch.com/${Key}`;
			}
			return {
				key: Key,
				url: url,
				uploaded_url: uploaded_url,
			};
		}),
	);
}

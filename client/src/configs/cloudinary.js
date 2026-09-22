/**
 * src/configs/cloudinary.js
 * ----------------------------
 * Helper for uploading files (driver photos, vehicle documents) directly
 * from the browser to Cloudinary using an unsigned upload preset.
 *
 * Setup required in your Cloudinary dashboard:
 *   Settings -> Upload -> Add an "unsigned" upload preset,
 *   then put its name + your cloud name into the frontend .env file.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file to Cloudinary.
 * @param {File} file - the raw file object from an <input type="file" />
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = await response.json();
  return { url: data.secure_url, publicId: data.public_id };
}

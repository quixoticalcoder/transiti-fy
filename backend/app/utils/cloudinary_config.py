"""
app/utils/cloudinary_config.py
---------------------------------
Configures the Cloudinary SDK using credentials from environment
variables. Import `configure_cloudinary()` and call it once inside
create_app(), then use `upload_file()` anywhere you need to push an
image/document (driver photo, vehicle document, etc.) to Cloudinary.
"""

import cloudinary
import cloudinary.uploader
from flask import current_app


def configure_cloudinary():
    """Bind Cloudinary SDK to the credentials defined in app config."""
    cloudinary.config(
        cloud_name=current_app.config.get("CLOUDINARY_CLOUD_NAME"),
        api_key=current_app.config.get("CLOUDINARY_API_KEY"),
        api_secret=current_app.config.get("CLOUDINARY_API_SECRET"),
        secure=True,
    )


def upload_file(file_stream, folder="transiti_fy"):
    """
    Upload a file-like object to Cloudinary and return its secure URL.

    Args:
        file_stream: the file object received from a Flask request (request.files['file'])
        folder: Cloudinary folder to organize uploads (e.g. 'drivers', 'vehicles')

    Returns:
        dict with 'url' and 'public_id' on success.
    """
    configure_cloudinary()
    result = cloudinary.uploader.upload(file_stream, folder=folder)
    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
    }

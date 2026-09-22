"""
run.py
--------
Entry point for running the Flask development server.
Usage: python run.py
"""

import os
import sys
from dotenv import load_dotenv

# Ensure the project root is on the path so `from app import create_app` works
# regardless of the current working directory.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env BEFORE create_app() reads config
load_dotenv()

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)

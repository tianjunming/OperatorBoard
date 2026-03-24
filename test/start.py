"""Auto-run script - Start the web client"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Telecom Agent - Web Client")
print("=" * 60)
print("\nStarting Web Server...")
print("Open http://127.0.0.1:5000 in your browser")
print("Press Ctrl+C to stop the server\n")

try:
    from app.web_client import app
    app.run(host="127.0.0.1", port=5000, debug=True)
except ImportError as e:
    print(f"Import error: {e}")
    print("\nPlease install dependencies first:")
    print("pip install -r requirements.txt")
except Exception as e:
    print(f"Error: {e}")

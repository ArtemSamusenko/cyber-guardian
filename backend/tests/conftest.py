import os

# Settings are read when `app` is imported, so tests need a valid secret first.
# This key only exists for the test run.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-0123456789-abcdefghijklmnop")

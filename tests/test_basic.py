"""Basic tests for the feeder application."""
import pytest


def test_import_app():
    """Test that the app can be imported."""
    from app import __version__
    assert __version__ is not None


def test_import_storage():
    """Test that storage module can be imported."""
    from app.core.storage import storage
    assert storage is not None


def test_import_config():
    """Test that config module can be imported."""
    from app.core.config import settings
    assert settings is not None


"""
Theme management and CSS generation.
Convert JSON design tokens to CSS variables.
"""

import json

from app.core.storage import storage

DEFAULT_THEME = {
    "bg": "#ffffff",
    "fg": "#1a1a1a",
    "accent": "#0066cc",
    "border": "#e0e0e0",
    "radius": "8",
    "fontSize": "16"
}


def generate_css_from_tokens(tokens: dict[str, str]) -> str:
    """Convert JSON tokens to CSS variables."""
    css_vars = "\n".join([f"  --{key}: {value};" for key, value in tokens.items()])
    return f":root {{\n{css_vars}\n}}"


def get_user_theme_css(user_id: int) -> str:
    """Get user's theme CSS, fallback to default."""
    theme = storage.get_user_theme(user_id)
    if not theme:
        tokens = DEFAULT_THEME
    else:
        try:
            tokens = json.loads(theme.css_vars)
        except json.JSONDecodeError:
            tokens = DEFAULT_THEME

    return generate_css_from_tokens(tokens)


def validate_tokens(tokens: dict[str, str]) -> bool:
    """Validate theme tokens."""
    required_keys = ["bg", "fg", "accent"]
    return all(key in tokens for key in required_keys)




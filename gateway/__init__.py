"""HumanAuth verification gateway: one API over the face, document and voice modules."""
from .app import create_app

__all__ = ["create_app"]

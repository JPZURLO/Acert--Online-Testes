"""Wrapper estável usado pelo Passenger/CloudLinux."""

from app_wsgi import application

__all__ = ["application"]

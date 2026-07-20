"""Entrypoint WSGI para cPanel/Passenger na TurboCloud."""

import os
import sys
from pathlib import Path

from werkzeug.middleware.proxy_fix import ProxyFix

APPLICATION_ROOT = Path(__file__).resolve().parent
if str(APPLICATION_ROOT) not in sys.path:
    sys.path.insert(0, str(APPLICATION_ROOT))
os.chdir(APPLICATION_ROOT)

from server import app  # noqa: E402

# A TurboCloud termina o HTTPS no proxy reverso antes de encaminhar ao Flask.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
application = app
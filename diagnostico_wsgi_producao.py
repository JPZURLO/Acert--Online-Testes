"""Diagnóstico temporário: valida uma requisição WSGI sem abrir o servidor."""

from app_wsgi import application

with application.test_client() as client:
    response = client.get(
        "/",
        headers={"Host": "onlineteste.com.br", "X-Forwarded-Proto": "https"},
    )
    print(f"WSGI_STATUS={response.status_code}")
    print(f"WSGI_BYTES={len(response.data)}")
    print(f"WSGI_CONTENT_TYPE={response.content_type}")
    if response.status_code != 200:
        raise SystemExit(f"A aplicação respondeu HTTP {response.status_code} no teste interno.")

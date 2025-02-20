from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import mysql.connector
from datetime import datetime, timedelta
import os

app = Flask(__name__, static_folder='front-end')
CORS(app)

secretKey = 'suaChaveSecretaAqui'  # Substitua por uma chave secreta forte

# Configuração do banco de dados
db = mysql.connector.connect(
    host='localhost',
    user='root',
    password='De182246@',  # Substitua pela sua senha
    database='acert'
)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')

    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users WHERE email = %s AND senha = %s', (email, senha))
    user = cursor.fetchone()

    if user:
        token = jwt.encode({'id': user['id'], 'exp': datetime.utcnow() + timedelta(hours=1)}, secretKey, algorithm='HS256')
        # Não precisa armazenar o token no banco de dados, a menos que seja absolutamente necessário.
        # Isso adiciona complexidade e pode ser um risco de segurança.
        # cursor.execute('UPDATE users SET token = %s WHERE id = %s', (token, user['id']))  # Remova esta linha
        # db.commit() # Remova esta linha
        return jsonify({'success': True, 'message': 'Login realizado com sucesso!', 'token': token, 'NomeCompleto': user['NomeCompleto']})
    else:
        return jsonify({'success': False, 'message': 'Credenciais inválidas.'}), 401

@app.route('/api/obterNomeCompleto', methods=['GET'])
def obter_nome_completo():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'success': False, 'message': 'Token não fornecido.'}), 400

    token = auth_header.split(' ')[1]
    try:
        decoded = jwt.decode(token, secretKey, algorithms=['HS256'])
        user_id = decoded['id']
        cursor = db.cursor(dictionary=True)
        cursor.execute('SELECT NomeCompleto FROM users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        if user:
            return jsonify({'NomeCompleto': user['NomeCompleto']})
        else:
            return jsonify({'success': False, 'message': 'Usuário não encontrado.'}), 404
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'message': 'Token expirado.'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'message': 'Token inválido.'}), 401
    except Exception as e: # Captura outros erros de decodificação
        print(f"Erro ao decodificar o token: {e}")
        return jsonify({'success': False, 'message': 'Token inválido.'}), 401



@app.route('/login_empresa', methods=['POST'])
def login_empresa():
    data = request.get_json()
    print("📥 Dados recebidos:", data)  # Depuração

    CNPJ = data.get('CNPJ')
    senha = data.get('senha')

    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM empresas WHERE CNPJ = %s AND senha = %s', (CNPJ, senha))
    user = cursor.fetchone()

    if user:
        token = jwt.encode({'id': user['id'], 'exp': datetime.utcnow() + timedelta(hours=1)}, secretKey, algorithm='HS256')
        return jsonify({'success': True, 'message': 'Login realizado com sucesso!', 'token': token, 'RazaoSocial': user['RazaoSocial']})
    else:
        return jsonify({'success': False, 'message': 'Credenciais inválidas.'}), 401

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_file(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Rodando o servidor Flask na porta 5500
if __name__ == '__main__':
    app.run(port=5500, debug=True)
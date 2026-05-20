from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
import uuid
from datetime import timedelta

api = Flask(__name__)
CORS(api, origins="*")

# Config
api.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///media_platform.db'
api.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
api.config['JWT_SECRET_KEY'] = 'super-secret-key-change-in-production'
api.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
api.config['MEDIA_FOLDER'] = 'media_files'
api.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

os.makedirs(api.config['MEDIA_FOLDER'], exist_ok=True)

db = SQLAlchemy(api)
jwt = JWTManager(api)

# --- Models -------------------------------------------------------------------

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    chat_name = db.Column(db.String(80))
    is_admin = db.Column(db.Boolean, default=False)

class Media(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text)
    upload_date = db.Column(db.DateTime, server_default=db.func.now())

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    media_id = db.Column(db.Integer, db.ForeignKey('media.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    account = db.relationship('Account', backref='messages')

class MessageReaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('message_id', 'account_id'),)

@api.route('/')
def home():
    return jsonify({'status': 'ok', 'message': 'Media server running'})

# --- Auth Routes --------------------------------------------------------------

@api.route('/api/register', methods=['POST'])
def sign_up():
    data = request.get_json()
    if not data or not all(k in data for k in ['email', 'password', 'first_name', 'last_name']):
        return jsonify({'error': 'Missing required fields'}), 400

    if Account.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    new_account = Account(
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        first_name=data['first_name'],
        last_name=data['last_name'],
        chat_name=data.get('chat_name', data['first_name'])
    )
    db.session.add(new_account)
    db.session.commit()

    access_token = create_access_token(identity=str(new_account.id))
    return jsonify({
        'token': access_token,
        'user': {
            'id': new_account.id,
            'email': new_account.email,
            'first_name': new_account.first_name,
            'last_name': new_account.last_name,
            'chat_name': new_account.chat_name,
            'is_admin': new_account.is_admin
        }
    }), 201

@api.route('/api/authenticate', methods=['POST'])
def sign_in():
    data = request.get_json()
    account = Account.query.filter_by(email=data.get('email')).first()
    if not account or not check_password_hash(account.password_hash, data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=str(account.id))
    return jsonify({
        'token': access_token,
        'user': {
            'id': account.id,
            'email': account.email,
            'first_name': account.first_name,
            'last_name': account.last_name,
            'chat_name': account.chat_name,
            'is_admin': account.is_admin
        }
    })

@api.route('/api/user/me', methods=['GET'])
@jwt_required()
def get_current_user():
    account = db.session.get(Account, int(get_jwt_identity()))
    if not account:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id': account.id,
        'email': account.email,
        'first_name': account.first_name,
        'last_name': account.last_name,
        'chat_name': account.chat_name,
        'is_admin': account.is_admin
    })

# --- Media Routes -------------------------------------------------------------

@api.route('/api/media/list', methods=['GET'])
def get_all_media():
    media_list = Media.query.order_by(Media.upload_date.desc()).all()
    return jsonify([{
        'id': m.id,
        'name': m.title,
        'title': m.title,
        'description': m.description,
        'path': m.file_path,
        'upload_date': m.upload_date.isoformat() if m.upload_date else None
    } for m in media_list])

@api.route('/api/media/<int:media_id>', methods=['GET'])
def get_single_media(media_id):
    media = db.session.get(Media, media_id)
    if not media:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'id': media.id,
        'title': media.title,
        'description': media.description,
        'upload_date': media.upload_date.isoformat() if media.upload_date else None
    })

@api.route('/api/media/stream/<filename>', methods=['GET'])
def stream_media(filename):
    file_path = os.path.join(api.config['MEDIA_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get('Range', None)

    if not range_header:
        response = Response(
            open(file_path, 'rb').read(),
            200,
            mimetype='video/mp4'
        )
        response.headers['Content-Length'] = str(file_size)
        response.headers['Accept-Ranges'] = 'bytes'
        return response

    byte_range = range_header.replace('bytes=', '').split('-')
    start = int(byte_range[0])
    end = int(byte_range[1]) if byte_range[1].strip() else file_size - 1
    end = min(end, file_size - 1)
    chunk_size = end - start + 1

    with open(file_path, 'rb') as f:
        f.seek(start)
        data = f.read(chunk_size)

    response = Response(data, 206, mimetype='video/mp4', direct_passthrough=False)
    response.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
    response.headers['Accept-Ranges'] = 'bytes'
    response.headers['Content-Length'] = str(chunk_size)
    return response

@api.route('/api/media/upload', methods=['POST'])
@jwt_required()
def upload_media():
    account = db.session.get(Account, int(get_jwt_identity()))
    if not account or not account.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    if 'video' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    media_file = request.files['video']
    media_title = request.form.get('title', 'Untitled')
    media_description = request.form.get('description', '')

    file_ext = os.path.splitext(media_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    media_file.save(os.path.join(api.config['MEDIA_FOLDER'], unique_filename))

    new_media = Media(
        title=media_title,
        file_path=unique_filename,
        description=media_description
    )
    db.session.add(new_media)
    db.session.commit()

    return jsonify({'id': new_media.id, 'title': new_media.title}), 201

@api.route('/api/media/<int:media_id>', methods=['DELETE'])
@jwt_required()
def delete_media(media_id):
    account = db.session.get(Account, int(get_jwt_identity()))
    if not account or not account.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    media = db.session.get(Media, media_id)
    if not media:
        return jsonify({'error': 'Not found'}), 404

    file_path = os.path.join(api.config['MEDIA_FOLDER'], media.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    Message.query.filter_by(media_id=media_id).delete()
    db.session.delete(media)
    db.session.commit()
    return jsonify({'message': 'Media deleted successfully'})

# --- Message Routes -----------------------------------------------------------

@api.route('/api/media/<int:media_id>/comments', methods=['GET'])
@jwt_required(optional=True)
def get_messages(media_id):
    account_id = get_jwt_identity()
    account_id = int(account_id) if account_id else None

    messages = Message.query.filter_by(media_id=media_id).order_by(Message.created_at.asc()).all()

    liked_ids = set()
    if account_id:
        liked_messages = MessageReaction.query.filter(
            MessageReaction.account_id == account_id,
            MessageReaction.message_id.in_([m.id for m in messages])
        ).all()
        liked_ids = {l.message_id for l in liked_messages}

    return jsonify([{
        'id': m.id,
        'text': m.text,
        'likes': m.likes_count,
        'user_name': m.account.chat_name or m.account.first_name,
        'userName': m.account.chat_name or m.account.first_name,
        'liked_by_me': m.id in liked_ids,
        'created_at': m.created_at.isoformat() if m.created_at else None
    } for m in messages])

@api.route('/api/media/<int:media_id>/comments', methods=['POST'])
@jwt_required()
def post_message(media_id):
    account_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({'error': 'Text required'}), 400

    new_message = Message(
        media_id=media_id,
        account_id=account_id,
        text=data['text']
    )
    db.session.add(new_message)
    db.session.commit()

    account = db.session.get(Account, account_id)
    return jsonify({
        'id': new_message.id,
        'text': new_message.text,
        'likes': 0,
        'user_name': account.chat_name or account.first_name,
        'userName': account.chat_name or account.first_name,
        'created_at': new_message.created_at.isoformat() if new_message.created_at else None
    }), 201

@api.route('/api/comments/<int:message_id>/like', methods=['POST'])
@jwt_required()
def like_message(message_id):
    account_id = int(get_jwt_identity())
    message = db.session.get(Message, message_id)
    if not message:
        return jsonify({'error': 'Not found'}), 404

    existing_reaction = MessageReaction.query.filter_by(
        message_id=message_id,
        account_id=account_id
    ).first()

    if existing_reaction:
        db.session.delete(existing_reaction)
        message.likes_count = max(0, message.likes_count - 1)
        is_liked = False
    else:
        new_reaction = MessageReaction(message_id=message_id, account_id=account_id)
        db.session.add(new_reaction)
        message.likes_count += 1
        is_liked = True

    db.session.commit()
    return jsonify({'likes': message.likes_count, 'liked': is_liked})

# --- Init ---------------------------------------------------------------------

def setup_admin():
    with api.app_context():
        db.create_all()
        if not Account.query.filter_by(email='admin@admin.com').first():
            admin_account = Account(
                email='admin@admin.com',
                password_hash=generate_password_hash('admin123'),
                first_name='Admin',
                last_name='',
                chat_name='Admin',
                is_admin=True
            )
            db.session.add(admin_account)
            db.session.commit()
            print("Admin created: admin@admin.com / admin123")

if __name__ == '__main__':
    setup_admin()
    api.run(host='0.0.0.0', port=5000, debug=True)

# Add these lines at the VERY TOP
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Message, Group, Notification
from forms import LoginForm, RegistrationForm
from config import Config
import os
from datetime import datetime, UTC
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Create upload directories if they don't exist
os.makedirs(os.path.join(app.root_path, 'static/uploads/images'), exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'static/uploads/documents'), exist_ok=True)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
   
    form = LoginForm()
    
    if form.validate_on_submit():
        # Check if user exists with username or email
        user = User.query.filter((User.username == form.username.data) | (User.email == form.username.data)).first()
        
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password', 'error')
            return redirect(url_for('login'))
        
        login_user(user, remember=form.remember_me.data)
        next_page = request.args.get('next')
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('index')
        return redirect(next_page)
    
    return render_template('auth/login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = RegistrationForm()
    
    if form.validate_on_submit():
        try:
            # Handle profile picture upload
            profile_picture = 'default-avatar.png'
            if form.profile_picture.data:
                file = form.profile_picture.data
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(app.root_path, 'static/uploads/images', unique_filename)
                file.save(file_path)
                profile_picture = unique_filename
            
            # Create new user
            user = User(
                username=form.username.data,
                email=form.email.data,
                profile_picture=profile_picture
            )
            user.set_password(form.password.data)
            
            db.session.add(user)
            db.session.commit()
            
            flash('Congratulations, you are now a registered user!', 'success')
            return redirect(url_for('login'))
        
        except Exception as e:
            db.session.rollback()
            flash('An error occurred during registration. Please try again.', 'error')
            app.logger.error(f'Registration error: {str(e)}')
    
    return render_template('auth/register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# API endpoints
@app.route('/api/users')
@login_required
def get_users():
    users = User.query.filter(User.id != current_user.id).all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/groups')
@login_required
def get_groups():
    groups = Group.query.filter(Group.members.any(id=current_user.id)).all()
    return jsonify([group.to_dict() for group in groups])

@app.route('/api/messages/<int:recipient_id>')
@login_required
def get_messages(recipient_id):
    messages = Message.query.filter(
        ((Message.sender_id == current_user.id) & (Message.recipient_id == recipient_id)) |
        ((Message.sender_id == recipient_id) & (Message.recipient_id == current_user.id))
    ).order_by(Message.timestamp.asc()).all()
    
    return jsonify([message.to_dict() for message in messages])

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # Determine file type and save to appropriate directory
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            file_path = os.path.join(app.root_path, 'static/uploads/images', unique_filename)
            file_type = 'image'
        else:
            file_path = os.path.join(app.root_path, 'static/uploads/documents', unique_filename)
            file_type = 'document'
        
        file.save(file_path)
        return jsonify({
            'success': True,
            'file_url': f'/static/uploads/{file_type}s/{unique_filename}',
            'file_type': file_type
        })
    
    return jsonify({'error': 'File upload failed'}), 500

# SocketIO events
@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        join_room(current_user.id)
        current_user.is_online = True
        db.session.commit()
        emit('user_status', {
            'user_id': current_user.id,
            'is_online': True
        }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        current_user.is_online = False
        current_user.last_seen = datetime.utcnow()
        db.session.commit()
        emit('user_status', {
            'user_id': current_user.id,
            'is_online': False,
            'last_seen': current_user.last_seen.isoformat()
        }, broadcast=True)

@socketio.on('send_message')
def handle_send_message(data):
    message = Message(
        content=data['content'],
        sender_id=current_user.id,
        recipient_id=data['recipient_id'],
        message_type=data.get('type', 'text'),
        file_url=data.get('file_url')
    )
    db.session.add(message)
    db.session.commit()
    
    # Send to recipient
    emit('receive_message', message.to_dict(), room=str(data['recipient_id']))
    
    # Send back to sender for confirmation
    emit('message_sent', message.to_dict())

@socketio.on('typing_start')
def handle_typing_start(data):
    emit('user_typing', {
        'user_id': current_user.id,
        'user_name': current_user.username
    }, room=str(data['recipient_id']))

@socketio.on('typing_stop')
def handle_typing_stop(data):
    emit('user_stopped_typing', {
        'user_id': current_user.id
    }, room=str(data['recipient_id']))

@socketio.on('initiate_call')
def handle_initiate_call(data):
    emit('incoming_call', {
        'caller_id': current_user.id,
        'caller_name': current_user.username,
        'call_type': data['call_type'],
        'room_id': data['room_id']
    }, room=str(data['recipient_id']))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
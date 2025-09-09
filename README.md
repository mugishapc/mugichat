# MugiChat

A WhatsApp-like web application built with Flask and Socket.IO.

## Features

- User authentication (register/login/logout)
- User profiles with profile pictures and status
- Direct messaging between users
- Group chats with admin controls
- Message reactions with emoji support
- Message replies
- Typing indicators
- File uploads (images, documents)
- Push notifications
- Voice and video calls using WebRTC
- Progressive Web App (PWA) support
- Health check and monitoring

## Tech Stack

- **Backend**: Flask + Flask-SocketIO + SQLAlchemy
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: Flask-Login + Bcrypt
- **Forms**: Flask-WTF + WTForms
- **Real-time communication**: SocketIO + Eventlet
- **File handling**: Werkzeug + Pillow
- **Push notifications**: pywebpush (VAPID keys)
- **Frontend**: HTML/CSS + JavaScript
- **PWA**: Service worker + manifest.json

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mugichat
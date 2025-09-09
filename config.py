import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or '68aea204d68715184d31c057776e360ecbf099ccb178151347b45d456b51a769'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'mugichat.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt']
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # PWA settings
    PWA_NAME = 'MugiChat'
    PWA_DESCRIPTION = 'WhatsApp-like messaging application'
    PWA_THEME_COLOR = '#128C7E'
    PWA_BACKGROUND_COLOR = '#ffffff'
    
    # WebPush settings (for notifications)
    VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY') or 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgz7CQIbAcpScpANRPlQ090XZjm8md57DjaeqpZPwpW8ahRANCAARztal1-D5NBNRvm8c-viRY8bLyz1bU0pFYfUGCPS_JtspRVSkggobKP3iwJINtQtqMhfZND_Tw0hpq2b0lP8zQ'
    VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY') or 'BHO1qXX4Pk0E1G-bxz6-JFjxsvLPVtTSkVh9QYI9L8m2ylFVKSCChso_eLAkg21C2oyF9k0P9PDSGmrZvSU_zNA'
    VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL') or 'mupc0679@gmail.com'
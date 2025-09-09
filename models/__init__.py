from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User
from .message import Message
from .group import Group, GroupMember
from .notification import Notification
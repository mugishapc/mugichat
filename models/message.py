from . import db
from datetime import datetime
import json

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'))
    message_type = db.Column(db.String(20), default='text')  # text, image, document, etc.
    file_url = db.Column(db.String(200))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    
    # For message replies
    reply_to_id = db.Column(db.Integer, db.ForeignKey('messages.id'))
    reply_to = db.relationship('Message', remote_side=[id], backref='replies')
    
    # For message reactions
    reactions = db.Column(db.Text)  # JSON string of {user_id: emoji}
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'group_id': self.group_id,
            'message_type': self.message_type,
            'file_url': self.file_url,
            'timestamp': self.timestamp.isoformat(),
            'is_read': self.is_read,
            'reply_to_id': self.reply_to_id,
            'reactions': json.loads(self.reactions) if self.reactions else {}
        }
    
    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id} to {self.recipient_id}>'
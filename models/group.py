from . import db
from datetime import datetime

class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    avatar = db.Column(db.String(200), default='default-group-avatar.png')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_public = db.Column(db.Boolean, default=False)
    
    # Relationships
    messages = db.relationship('Message', backref='group', lazy='dynamic')
    members = db.relationship('GroupMember', backref='group', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'avatar': self.avatar,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'is_public': self.is_public,
            'member_count': self.members.count()
        }
    
    def __repr__(self):
        return f'<Group {self.name}>'

class GroupMember(db.Model):
    __tablename__ = 'group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    role = db.Column(db.String(20), default='member')  # member, admin, creator
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'joined_at': self.joined_at.isoformat(),
            'role': self.role
        }
    
    def __repr__(self):
        return f'<GroupMember user:{self.user_id} group:{self.group_id}>'
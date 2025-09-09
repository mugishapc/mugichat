from app import app, db
from models import User

def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create a default admin user if none exists
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@mugichat.com',
                profile_picture='default-avatar.png'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created: admin / admin123")
        
        print("Database initialized successfully!")

if __name__ == '__main__':
    init_db()
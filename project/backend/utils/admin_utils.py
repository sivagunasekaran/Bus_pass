# utils/admin_utils.py

from flask_jwt_extended import get_jwt_identity
from models import User

def get_current_admin():
    user_id = get_jwt_identity()
    if not user_id:
        return None

    admin = User.query.get(int(user_id))
    if not admin or admin.role != "ADMIN":
        return None

    return admin

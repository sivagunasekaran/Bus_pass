from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import User
from extensions import db
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    print("REGISTER DATA:", data)

    if not data:
        return {"message": "Invalid JSON"}, 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return {"message": "All fields required"}, 400

    if User.query.filter_by(email=email).first():
        return {"message": "Email already registered"}, 409

    user = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        role="USER"
    )

    db.session.add(user)
    db.session.commit()

    print("USER INSERTED:", user.id)

    return {"message": "Registration successful"}, 201


# ================= LOGIN =================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    # ✅ identity MUST be string
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "role": user.role
    }), 200

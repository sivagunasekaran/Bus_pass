from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import BusPass
from extensions import db
from werkzeug.utils import secure_filename
import os

pass_bp = Blueprint("pass", __name__, url_prefix="/api/pass")

UPLOAD_FOLDER = "uploads/id_proofs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@pass_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_pass():
    user_id = get_jwt_identity()

    route = request.form.get("route")
    fare = request.form.get("fare")
    file = request.files.get("id_proof")

    print("FORM:", request.form)
    print("FILES:", request.files)

    if not route or not fare:
        return {"message": "Route and fare required"}, 400

    filename = None
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, filename))

    bus_pass = BusPass(
        user_id=user_id,
        route=route,
        fare=fare,
        status="PENDING",
        id_proof=filename
    )

    db.session.add(bus_pass)
    db.session.commit()

    print("REQUEST RECEIVED:", request.path)

    return {"message": "Pass applied"}, 201

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import BusPass
from extensions import db
from werkzeug.utils import secure_filename

pass_bp = Blueprint("pass", __name__, url_prefix="/api/pass")
@pass_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_pass():
    user_id = get_jwt_identity()
    route = request.form.get("route")
    fare = request.form.get("fare")
    file = request.files.get("id_proof")

    filename = None
    if file:
        filename = secure_filename(file.filename)
        file.save(f"uploads/id_proofs/{filename}")

    bus_pass = BusPass(
        user_id=user_id,
        route=route,
        fare=fare,
        status="PENDING",
        id_proof=filename
    )

    db.session.add(bus_pass)
    db.session.commit()

    return {"message": "Pass applied"}


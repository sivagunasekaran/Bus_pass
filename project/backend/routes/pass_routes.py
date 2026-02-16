from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import BusPass
from extensions import db
from werkzeug.utils import secure_filename
import os
from utils.pass_utils import is_pass_active
from datetime import date
from dateutil.relativedelta import relativedelta

pass_bp = Blueprint("pass", __name__, url_prefix="/api/pass")

@pass_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_pass():

    user_id = get_jwt_identity()

    # 🔒 Block duplicate active pass
    existing_passes = BusPass.query.filter_by(user_id=user_id).all()
    for p in existing_passes:
        if is_pass_active(p):
            return jsonify({"message": "You already have an active bus pass"}), 400

    # 📥 Read form data
    applicant_name = request.form.get("applicant_name")
    route = request.form.get("route")
    distance_km = float(request.form.get("distance"))
    fare = int(request.form.get("fare"))
    duration_months = int(request.form.get("pass_duration"))  # 🔥 REQUIRED

    # 📅 VALIDITY CALCULATION (🔥 THIS WAS MISSING)
    valid_from = date.today()
    valid_to = valid_from + relativedelta(months=duration_months)

    # 📎 File handling
    file = request.files.get("id_proof")
    if not file:
        return jsonify({"message": "ID proof required"}), 400

    raw_filename = secure_filename(file.filename)
    filename = raw_filename.replace(" ", "_").lower()

    upload_dir = "uploads/id_proofs"
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    # 💾 SAVE TO DB (🔥 ADD THESE FIELDS)
    bus_pass = BusPass(
        user_id=user_id,
        applicant_name=applicant_name,
        route=route,
        distance_km=distance_km,
        pass_duration_months=duration_months,
        valid_from=valid_from,
        valid_to=valid_to,
        fare=fare,
        status="PENDING",
        is_active=0, 
        id_proof=filename
    )

    db.session.add(bus_pass)
    db.session.commit()

    return jsonify({"message": "Pass applied successfully"}), 201

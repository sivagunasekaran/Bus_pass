from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import BusPass, PassRenewal

status_bp = Blueprint("status", __name__, url_prefix="/api")
@status_bp.route("/status", methods=["GET"])
@jwt_required()
def get_status():
    user_id = int(get_jwt_identity())
    today = date.today()

    # ==================================================
    # 1️⃣ CHECK RENEWAL FIRST (IGNORE REJECTED)
    # ==================================================
    renewal = (
        PassRenewal.query
        .filter(
            PassRenewal.user_id == user_id,
            PassRenewal.status != "REJECTED"
        )
        .order_by(PassRenewal.id.desc())   # 🔥 FIX
        .first()
    )

    if renewal:
        bus_pass = BusPass.query.get(renewal.bus_pass_id)

        is_active = renewal.status == "PAID"
        days_left = (
            (renewal.new_expiry_date - today).days
            if is_active and renewal.new_expiry_date >= today
            else 0
        )

        return jsonify({
            "applicant_name": bus_pass.applicant_name,
            "pass_type": "RENEWAL",
            "route": renewal.requested_route,
            "expiry_date": renewal.new_expiry_date.strftime("%Y-%m-%d"),
            "fare": renewal.renewal_fare,
            "approval_status": renewal.status,
            "pass_status": "ACTIVE" if is_active else "INACTIVE",
            "days_left": days_left,
            "can_pay": renewal.status == "APPROVED"
        }), 200

    # ==================================================
    # 2️⃣ FALLBACK TO NEW PASS (IGNORE REJECTED)
    # ==================================================
    bus_pass = (
        BusPass.query
        .filter(
            BusPass.user_id == user_id,
            BusPass.status != "REJECTED"
        )
        .order_by(BusPass.id.desc())   # 🔥 FIX
        .first()
    )

    if not bus_pass:
        return jsonify({"has_pass": False}), 200

    is_active = bus_pass.status == "PAID" and bus_pass.is_active == 1
    days_left = (
        (bus_pass.valid_to - today).days
        if is_active and bus_pass.valid_to >= today
        else 0
    )

    return jsonify({
        "applicant_name": bus_pass.applicant_name,
        "pass_type": "NEW",
        "route": bus_pass.route,
        "expiry_date": bus_pass.valid_to.strftime("%Y-%m-%d"),
        "fare": bus_pass.fare,
        "approval_status": bus_pass.status,
        "pass_status": "ACTIVE" if is_active else "INACTIVE",
        "days_left": days_left,
        "can_pay": bus_pass.status == "APPROVED"
    }), 200

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import BusPass, PassRenewal, User
from sqlalchemy import text
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# ======================================================
# HELPER → CHECK ADMIN
# ======================================================
def get_current_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "ADMIN":
        return None
    return user


# ======================================================
# GET PENDING NEW PASSES
# ======================================================
@admin_bp.route("/passes/pending", methods=["GET"])
@jwt_required()
def get_pending_passes():
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    passes = BusPass.query.filter_by(status="PENDING").all()

    result = []
    for p in passes:
        result.append({
            "id": p.id,
            "applicant_name": p.applicant_name,
            "route": p.route,
            "distance_km": float(p.distance_km),
            "fare": p.fare,
            "status": p.status,
            "id_proof": p.id_proof
        })

    return jsonify(result), 200


# ======================================================
# APPROVE NEW PASS
# ======================================================
@admin_bp.route("/pass/<int:pass_id>/approve", methods=["PUT"])
@jwt_required()
def approve_pass(pass_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    bus_pass = BusPass.query.get(pass_id)
    if not bus_pass or bus_pass.status != "PENDING":
        return jsonify({"message": "Invalid pass"}), 400

    # 🔥 APPROVE but DO NOT ACTIVATE
    bus_pass.status = "APPROVED"
    bus_pass.is_active = 0

    db.session.commit()

    return jsonify({"message": "Pass approved"}), 200


# ======================================================
# REJECT NEW PASS
# ======================================================
@admin_bp.route("/pass/<int:pass_id>/reject", methods=["PUT"])
@jwt_required()
def reject_pass(pass_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    bus_pass = BusPass.query.get(pass_id)
    if not bus_pass or bus_pass.status != "PENDING":
        return jsonify({"message": "Invalid pass"}), 400

    bus_pass.status = "REJECTED"
    bus_pass.is_active = 0

    db.session.commit()

    return jsonify({"message": "Pass rejected"}), 200


# ======================================================
# GET PENDING RENEWALS
# ======================================================
@admin_bp.route("/renewals", methods=["GET"])
@jwt_required()
def get_renewals():
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewals = (
        db.session.query(
            PassRenewal,
            BusPass.applicant_name,
            BusPass.route.label("old_route")
        )
        .join(BusPass, BusPass.id == PassRenewal.bus_pass_id)
        .filter(PassRenewal.status == "PENDING")
        .all()
    )
    print("renewals : ",renewals)

    result = []
    for r, applicant_name, old_route in renewals:
        result.append({
            "id": r.id,
            "bus_pass_id": r.bus_pass_id,
            "user_name": applicant_name,
            "old_route": old_route,
            "requested_route": r.requested_route,
            "route_changed": bool(r.route_changed),
            "fare": r.renewal_fare,
            "status": r.status
        })

    return jsonify(result), 200


# ======================================================
# APPROVE RENEWAL
# ======================================================
@admin_bp.route("/renewals/<int:renewal_id>/approve", methods=["POST"])
@jwt_required()
def approve_renewal(renewal_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewal = PassRenewal.query.get(renewal_id)
    if not renewal or renewal.status != "PENDING":
        return jsonify({"message": "Invalid renewal"}), 400

    # renewal.status = "APPROVED"
    # renewal.patch({"status":"APPROVED"})
    # # 🔥 DEACTIVATE CURRENT PASS UNTIL PAYMENT
    # bus_pass = BusPass.query.get(renewal.bus_pass_id)
    # bus_pass.is_active = 0
    db.session.execute(
        text("UPDATE pass_renewal SET status = 'APPROVED' WHERE id = :id"),
        {"id": renewal_id}
    )
    db.session.commit()

    return jsonify({"message": "Renewal approved"}), 200


# ======================================================
# REJECT RENEWAL
# ======================================================
@admin_bp.route("/renewals/<int:renewal_id>/reject", methods=["POST"])
@jwt_required()
def reject_renewal(renewal_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewal = PassRenewal.query.get(renewal_id)
    if not renewal or renewal.status != "PENDING":
        return jsonify({"message": "Invalid renewal"}), 400

    db.session.execute(
        text("UPDATE pass_renewal SET status = 'REJECTED' WHERE id = :id"),
        {"id": renewal_id}
    )

    db.session.commit()

    return jsonify({"message": "Renewal rejected"}), 200

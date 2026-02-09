from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, BusPass, PassRenewal
from extensions import db

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# ================= COMMON AUTH =================
def get_current_admin():
    identity = get_jwt_identity()

    try:
        admin_id = int(identity)
    except (ValueError, TypeError):
        return None

    admin = User.query.get(admin_id)
    if not admin or admin.role != "ADMIN":
        return None

    return admin


# ================= GET NEW PASSES =================
@admin_bp.route("/passes/pending", methods=["GET"])
@jwt_required()
def get_pending_passes():
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    passes = BusPass.query.filter_by(status="PENDING").all()

    return jsonify([{
        "id": p.id,
        "user_id": p.user_id,
        "route": p.route,
        "fare": p.fare,
        "id_proof": p.id_proof,
        "status": p.status
    } for p in passes]), 200


# ================= APPROVE PASS =================
@admin_bp.route("/pass/<int:pass_id>/approve", methods=["PUT"])
@jwt_required()
def approve_pass(pass_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    bus_pass = BusPass.query.get(pass_id)
    if not bus_pass:
        return jsonify({"message": "Pass not found"}), 404

    bus_pass.status = "APPROVED"
    db.session.commit()

    return jsonify({"message": "Pass approved"}), 200


# ================= REJECT PASS =================
@admin_bp.route("/pass/<int:pass_id>/reject", methods=["PUT"])
@jwt_required()
def reject_pass(pass_id):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    bus_pass = BusPass.query.get(pass_id)
    if not bus_pass:
        return jsonify({"message": "Pass not found"}), 404

    bus_pass.status = "REJECTED"
    db.session.commit()

    return jsonify({"message": "Pass rejected"}), 200


# ================= GET RENEWALS =================
@admin_bp.route("/renewals", methods=["GET"])
@jwt_required()
def get_all_renewals():
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewals = PassRenewal.query.order_by(PassRenewal.id.desc()).all()

    return jsonify([{
        "id": r.id,
        "user_id": r.user_id,
        "bus_pass_id": r.bus_pass_id,
        "renewal_fare": r.renewal_fare,
        "status": r.status
    } for r in renewals]), 200


# ================= APPROVE RENEW =================
@admin_bp.route("/renewal/<int:rid>/approve", methods=["PUT"])
@jwt_required()
def approve_renewal(rid):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewal = PassRenewal.query.get(rid)
    if not renewal:
        return jsonify({"message": "Renewal not found"}), 404

    renewal.status = "APPROVED"
    db.session.commit()

    return jsonify({"message": "Renewal approved"}), 200


# ================= REJECT RENEW =================
@admin_bp.route("/renewal/<int:rid>/reject", methods=["PUT"])
@jwt_required()
def reject_renewal(rid):
    admin = get_current_admin()
    if not admin:
        return jsonify({"message": "Unauthorized"}), 403

    renewal = PassRenewal.query.get(rid)
    if not renewal:
        return jsonify({"message": "Renewal not found"}), 404

    renewal.status = "REJECTED"
    db.session.commit()

    return jsonify({"message": "Renewal rejected"}), 200

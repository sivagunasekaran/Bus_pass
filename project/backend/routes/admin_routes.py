from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import BusPass, PassRenewal, User
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from utils.email_utils import send_email

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

    # 📧 SEND APPROVAL EMAIL
    try:
        user = User.query.get(bus_pass.user_id)
        if user:
            send_email(
                to=user.email,
                subject="Bus Pass Application Approved",
                body=(
                    f"Hello {bus_pass.applicant_name},\n\n"
                    f"Your bus pass application has been APPROVED!\n"
                    f"Route: {bus_pass.route}\n"
                    f"Distance: {bus_pass.distance_km} km\n"
                    f"Fare: ₹{bus_pass.fare}\n\n"
                    "Please proceed to payment to activate your pass.\n\n"
                    "Thank you."
                )
            )
            print(f"✅ Approval email sent to {user.email}")
    except Exception as e:
        print(f"⚠️  Failed to send approval email: {str(e)}")

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

    # 📧 SEND REJECTION EMAIL
    try:
        user = User.query.get(bus_pass.user_id)
        if user:
            send_email(
                to=user.email,
                subject="Bus Pass Application Rejected",
                body=(
                    f"Hello {bus_pass.applicant_name},\n\n"
                    f"Unfortunately, your bus pass application has been REJECTED.\n"
                    f"Route: {bus_pass.route}\n\n"
                    "Please contact support for more information.\n\n"
                    "Thank you."
                )
            )
            print(f"✅ Rejection email sent to {user.email}")
    except Exception as e:
        print(f"⚠️  Failed to send rejection email: {str(e)}")

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
        return jsonify({"message": "Invalid or non-pending renewal"}), 400

    bus_pass = BusPass.query.get(renewal.bus_pass_id)
    if not bus_pass:
        return jsonify({"message": "Bus pass not found"}), 404

    try:
        # 1️⃣ Approve renewal
        renewal.status = "APPROVED"
        renewal.is_active = 0

        # 2️⃣ Update bus pass validity
        bus_pass.valid_from = renewal.old_expiry_date
        bus_pass.valid_to = renewal.new_expiry_date
        bus_pass.is_active = 0

        # 3️⃣ Update route only if changed
        if renewal.route_changed:
            bus_pass.route = renewal.requested_route
            bus_pass.distance_km = renewal.requested_distance_km

        db.session.commit()

        # 📧 SEND RENEWAL APPROVAL EMAIL
        try:
            user = User.query.get(bus_pass.user_id)
            if user:
                send_email(
                    to=user.email,
                    subject="Bus Pass Renewal Approved",
                    body=(
                        f"Hello {bus_pass.applicant_name},\n\n"
                        f"Your bus pass renewal has been APPROVED!\n"
                        f"Route: {bus_pass.route}\n"
                        f"New Expiry Date: {renewal.new_expiry_date.strftime('%Y-%m-%d')}\n"
                        f"Renewal Fare: ₹{renewal.renewal_fare}\n\n"
                        "Please proceed to payment to activate your renewed pass.\n\n"
                        "Thank you."
                    )
                )
                print(f"✅ Renewal approval email sent to {user.email}")
        except Exception as e:
            print(f"⚠️  Failed to send renewal approval email: {str(e)}")

        return jsonify({"message": "Renewal approved successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "message": "Renewal approval failed",
            "error": str(e)
        }), 500


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
        return jsonify({"message": "Invalid or non-pending renewal"}), 400

    try:
        renewal.status = "REJECTED"
        renewal.is_active = 0

        db.session.commit()

        # 📧 SEND RENEWAL REJECTION EMAIL
        try:
            bus_pass = BusPass.query.get(renewal.bus_pass_id)
            user = User.query.get(renewal.user_id)
            if user and bus_pass:
                send_email(
                    to=user.email,
                    subject="Bus Pass Renewal Rejected",
                    body=(
                        f"Hello {bus_pass.applicant_name},\n\n"
                        f"Unfortunately, your bus pass renewal has been REJECTED.\n"
                        f"Route: {renewal.requested_route}\n\n"
                        "Please contact support for more information.\n\n"
                        "Thank you."
                    )
                )
                print(f"✅ Renewal rejection email sent to {user.email}")
        except Exception as email_err:
            print(f"⚠️  Failed to send renewal rejection email: {str(email_err)}")

        return jsonify({"message": "Renewal rejected successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({
            "message": "Renewal rejection failed",
            "error": str(e)
        }), 500

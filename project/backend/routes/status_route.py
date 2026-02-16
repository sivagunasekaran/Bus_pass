from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models import BusPass, PassRenewal, User
from utils.expire import enforce_expiry
from extensions import db

status_bp = Blueprint("status", __name__, url_prefix="/api")


@status_bp.route("/status", methods=["GET"])
@jwt_required()
def get_status():
    user_id = int(get_jwt_identity())
    today = date.today()

    # ==================================================
    # Enforce expiry before retrieving status
    # ==================================================
    bus_pass = (
        BusPass.query
        .filter(
            BusPass.user_id == user_id,
            BusPass.status != "REJECTED"
        )
        .order_by(BusPass.id.desc())
        .first()
    )

    if bus_pass:
        enforce_expiry(bus_pass)
    else:
        pass

    # ==================================================
    # Check renewal first (ignore rejected)
    # ==================================================
    renewal = (
        PassRenewal.query
        .filter(
            PassRenewal.user_id == user_id,
            PassRenewal.status != "REJECTED"
        )
        .order_by(PassRenewal.id.desc())
        .first()
    )

    if renewal:
        is_paid = renewal.status == "PAID"
        is_expired = is_paid and renewal.new_expiry_date < today
        active = is_paid and not is_expired

        if is_expired:
            pass_status = "EXPIRED"
        elif active:
            pass_status = "ACTIVE"
        else:
            pass_status = "INACTIVE"

        days_left = (
            (renewal.new_expiry_date - today).days
            if active else 0
        )

        return jsonify({
            "applicant_name": bus_pass.applicant_name,
            "pass_type": "RENEWAL",
            "route": renewal.requested_route,
            "expiry_date": renewal.new_expiry_date.strftime("%Y-%m-%d"),
            "fare": renewal.renewal_fare,
            "approval_status": renewal.status,
            "pass_status": pass_status,
            "days_left": days_left,
            "can_pay": renewal.status == "APPROVED"
        }), 200

    # ==================================================
    # Fallback to new pass
    # ==================================================
    if not bus_pass:
        return jsonify({"has_pass": False}), 200

    is_paid = bus_pass.status == "PAID"
    is_expired = is_paid and bus_pass.valid_to < today
    active = is_paid and bus_pass.is_active == 1 and not is_expired

    if is_expired:
        pass_status = "EXPIRED"
    elif active:
        pass_status = "ACTIVE"
    else:
        pass_status = "INACTIVE"

    days_left = (
        (bus_pass.valid_to - today).days
        if active else 0
    )

    return jsonify({
        "applicant_name": bus_pass.applicant_name,
        "pass_type": "NEW",
        "route": bus_pass.route,
        "expiry_date": bus_pass.valid_to.strftime("%Y-%m-%d"),
        "fare": bus_pass.fare,
        "approval_status": bus_pass.status,
        "pass_status": pass_status,
        "days_left": days_left,
        "can_pay": bus_pass.status == "APPROVED"
    }), 200


# ==================================================
# MANUAL EXPIRY CHECK TRIGGER (FOR TESTING)
# ==================================================
@status_bp.route("/check-expiry", methods=["GET"])
@jwt_required()
def check_expiry():
    """
    Manually check and expire all expired passes.
    Sends expiry emails to users with expired passes.
    """
    try:
        today = date.today()
        user_id = int(get_jwt_identity())
        
        # Check user's own passes
        bus_passes = BusPass.query.filter(
            BusPass.user_id == user_id,
            BusPass.status == "PAID",
            BusPass.valid_to < today,
            BusPass.is_active == 1
        ).all()
        
        expired_count = 0
        for bus_pass in bus_passes:
            result = enforce_expiry(bus_pass)
            if not result:  # enforce_expiry returns False if expired and deactivated
                expired_count += 1
        
        return jsonify({
            "message": f"Expiry check completed",
            "expired_passes_processed": expired_count,
            "count": expired_count
        }), 200
        
    except Exception as e:
        print(f"❌ Expiry check error: {str(e)}")
        return jsonify({"message": "Error checking expiry", "error": str(e)}), 500


# ==================================================
# ADMIN: CHECK ALL EXPIRED PASSES (BULK EXPIRY)
# ==================================================
@status_bp.route("/admin/check-all-expiry", methods=["GET"])
@jwt_required()
def check_all_expiry():
    """
    Admin endpoint to check and expire ALL expired passes in system.
    Sends expiry emails to all users with expired passes.
    """
    try:
        # Verify admin
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != "ADMIN":
            return jsonify({"message": "Unauthorized"}), 403
        
        today = date.today()
        
        # Get all expired active passes
        expired_passes = BusPass.query.filter(
            BusPass.status == "PAID",
            BusPass.valid_to < today,
            BusPass.is_active == 1
        ).all()
        
        expired_count = 0
        email_sent = 0
        
        for bus_pass in expired_passes:
            result = enforce_expiry(bus_pass)
            if not result:  # False = was expired and deactivated
                expired_count += 1
                email_sent += 1
        
        print(f"✅ Admin expiry check: {expired_count} passes expired, {email_sent} emails sent")
        
        return jsonify({
            "message": "Expiry check completed for all users",
            "expired_passes_found": expired_count,
            "emails_sent": email_sent
        }), 200
        
    except Exception as e:
        print(f"❌ Admin expiry check error: {str(e)}")
        return jsonify({"message": "Error checking expiry", "error": str(e)}), 500

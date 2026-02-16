from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
from models import BusPass, PassRenewal, User
from extensions import db
from dateutil.relativedelta import relativedelta
from utils.email_utils import send_email


renewal_bp = Blueprint("renewal", __name__, url_prefix="/api/renewal")


# =========================================================
# GET ELIGIBLE PASS
# =========================================================
@renewal_bp.route("/eligible", methods=["GET"])
@jwt_required()
def get_eligible_pass():
    try:
        user_id = int(get_jwt_identity())

        bus_pass = (
            BusPass.query
            .filter(
                BusPass.user_id == user_id,
                BusPass.status == "PAID"   # ✅ ONLY THIS
            )
            .order_by(BusPass.valid_to.desc())
            .first()
        )

        if not bus_pass:
            return jsonify({"message": "No paid pass found for renewal"}), 404

        if not bus_pass.pass_duration_months or bus_pass.pass_duration_months <= 0:
            return jsonify({"message": "Invalid pass duration"}), 400

        base_fare = bus_pass.fare // bus_pass.pass_duration_months

        return jsonify({
            "bus_pass_id": bus_pass.id,
            "user_name": bus_pass.applicant_name,
            "route": bus_pass.route,
            "valid_to": bus_pass.valid_to.strftime("%Y-%m-%d"),
            "base_fare": base_fare,
            "is_active": bus_pass.is_active   # optional, for UI
        }), 200

    except Exception as e:
        print("🔥 ELIGIBLE ERROR:", e)
        return jsonify({
            "message": "Server error",
            "error": str(e)
        }), 500

# =========================================================
# APPLY RENEWAL
# =========================================================

@renewal_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_renewal():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        print("📦 RENEWAL PAYLOAD:", data)
        print("📆 duration_months raw:", data.get("duration_months"))

        bus_pass = BusPass.query.get(data["bus_pass_id"])
        if not bus_pass or bus_pass.user_id != user_id:
            return jsonify({"message": "Invalid bus pass"}), 400

        existing = PassRenewal.query.filter_by(
            bus_pass_id=bus_pass.id,
            status="PENDING"
        ).first()

        if existing:
            return jsonify({"message": "Renewal already pending"}), 400

        base_date = (
            bus_pass.valid_to
            if bus_pass.valid_to and bus_pass.valid_to >= date.today()
            else date.today()
        )

        # ✅ Duration in months
        months = int(data.get("duration_months", 1))
        if months not in (1, 3):
            return jsonify({"message": "Invalid duration"}), 400

        change_route = data.get("route_changed") is True

        renewal = PassRenewal(
            bus_pass_id=bus_pass.id,
            user_id=user_id,

            old_expiry_date=bus_pass.valid_to,
            new_expiry_date=base_date + relativedelta(months=months),

            renewal_fare=data["renewal_fare"],

            requested_route=(
                data.get("requested_route") if change_route else bus_pass.route
            ),
            requested_distance_km=(
                data.get("requested_distance_km") if change_route else bus_pass.distance_km
            ),

            route_changed=1 if change_route else 0,
            status="PENDING",
            is_active=0
        )
       

        db.session.add(renewal)
        db.session.commit()

        # 📧 SEND RENEWAL APPLICATION EMAIL
        try:
            user = User.query.get(user_id)
            if user:
                send_email(
                    to=user.email,
                    subject="Bus Pass Renewal Application Received",
                    body=(
                        f"Hello {bus_pass.applicant_name},\n\n"
                        f"Your bus pass renewal application has been received!\n"
                        f"Current Route: {bus_pass.route}\n"
                        f"New Expiry Date: {renewal.new_expiry_date.strftime('%Y-%m-%d')}\n"
                        f"Renewal Fare: ₹{renewal.renewal_fare}\n\n"
                        "The admin will review and approve your renewal shortly.\n"
                        "You will receive another email once it is approved.\n\n"
                        "Thank you."
                    )
                )
                print(f"✅ Renewal application email sent to {user.email}")
        except Exception as email_err:
            print(f"⚠️  Failed to send renewal application email: {str(email_err)}")

        return jsonify({
            "message": "Renewal applied. Await admin approval",
            "new_expiry_date": renewal.new_expiry_date.isoformat()
        }), 201

    except Exception as e:
        print("🔥 APPLY RENEWAL ERROR:", e)
        return jsonify({
            "message": "Server error",
            "error": str(e)
        }), 500

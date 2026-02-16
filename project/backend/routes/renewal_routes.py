from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
from models import BusPass, PassRenewal
from extensions import db

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
            BusPass.status == "PAID",      # 🔥 FIXED
            BusPass.is_active == 1,
            BusPass.valid_to >= date.today()
        )
        .order_by(BusPass.valid_to.desc())
        .first()
    )


        if not bus_pass:
            return jsonify({"message": "No active paid pass found for renewal"}), 404


        if not bus_pass.pass_duration_months or bus_pass.pass_duration_months <= 0:
            return jsonify({"message": "Invalid pass duration"}), 400

        # ✅ OPTION-2 BASE FARE LOGIC
        base_fare = bus_pass.fare // bus_pass.pass_duration_months

        return jsonify({
            "bus_pass_id": bus_pass.id,
            "user_name": bus_pass.applicant_name,
            "route": bus_pass.route,
            "valid_to": bus_pass.valid_to.strftime("%Y-%m-%d"),
            "base_fare": base_fare
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

        bus_pass = BusPass.query.get(data["bus_pass_id"])
        if not bus_pass or bus_pass.user_id != user_id:
            return jsonify({"message": "Invalid bus pass"}), 400

        # ❌ Prevent multiple pending renewals
        existing = PassRenewal.query.filter_by(
            bus_pass_id=bus_pass.id,
            status="PENDING"
        ).first()

        if existing:
            return jsonify({"message": "Renewal already pending"}), 400

        # ✅ Base date logic
        base_date = bus_pass.valid_to if bus_pass.valid_to >= date.today() else date.today()

        # ✅ Duration in months (1 or 3)
        months = int(data.get("duration_months", 1))
        if months not in (1, 3):
            return jsonify({"message": "Invalid duration"}), 400

        change_route = data.get("route_changed") is True

        renewal = PassRenewal(
        bus_pass_id=bus_pass.id,
        user_id=user_id,

        old_expiry_date=bus_pass.valid_to,
        new_expiry_date=base_date + timedelta(days=30 * months),

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

        PassRenewal.status = "PENDING"
        db.session.add(renewal)
        db.session.commit()

        return jsonify({
            "message": "Renewal applied. Await admin approval"
        }), 201

    except Exception as e:
        print("🔥 APPLY RENEWAL ERROR:", e)
        return jsonify({
            "message": "Server error",
            "error": str(e)
        }), 500

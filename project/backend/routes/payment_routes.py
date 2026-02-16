# routes/payment_routes.py
import razorpay
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import Config
from extensions import db
import hmac
import hashlib
from models import BusPass, PassRenewal



payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")

client = razorpay.Client(
    auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET)
)
@payment_bp.route("/create-order", methods=["POST"])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    amount = int(data["amount"]) * 100

   
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "payment_capture": 1
    })

    order_id = order["id"]


    renewal = (
        PassRenewal.query
        .filter_by(user_id=user_id, status="APPROVED")
        .order_by(PassRenewal.created_at.desc())
        .first()
    )

    if renewal:
        renewal.razorpay_order_id = order_id
        db.session.commit()

    else:
        # 2️⃣ FALLBACK TO NEW BUS PASS
        bus_pass = (
            BusPass.query
            .filter_by(user_id=user_id, status="APPROVED")
            .order_by(BusPass.valid_to.desc())
            .first()
        )

        if not bus_pass:
            return jsonify({"message": "No payable pass found"}), 404

        bus_pass.razorpay_order_id = order_id
        db.session.commit()

    # ===============================
    return jsonify({
        "order_id": order_id,
        "amount": amount,
        "key": Config.RAZORPAY_KEY_ID
    }), 200



@payment_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify_payment():
    try:
        data = request.get_json()

        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_payment_id = data.get("razorpay_payment_id")
        razorpay_signature = data.get("razorpay_signature")

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return jsonify({"message": "Missing payment details"}), 400

        # ✅ USE RAZORPAY HELPER
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        })

        # ====================================================
        # 1️⃣ CHECK RENEWAL PAYMENT
        # ====================================================
        renewal = PassRenewal.query.filter_by(
            razorpay_order_id=razorpay_order_id
        ).first()

        if renewal:
            renewal.razorpay_payment_id = razorpay_payment_id
            renewal.status = "PAID"
            renewal.is_active = 1

            bus_pass = BusPass.query.get(renewal.bus_pass_id)

            if not bus_pass:
                return jsonify({"message": "Bus pass not found"}), 404

            bus_pass.route = renewal.requested_route
            bus_pass.distance_km = renewal.requested_distance_km
            bus_pass.valid_to = renewal.new_expiry_date
            bus_pass.status = "PAID"
            bus_pass.is_active = 1

            db.session.commit()

            return jsonify({"message": "Renewal payment verified"}), 200

        # ====================================================
        # 2️⃣ CHECK NEW PASS PAYMENT
        # ====================================================
        bus_pass = BusPass.query.filter_by(
            razorpay_order_id=razorpay_order_id
        ).first()

        if not bus_pass:
            return jsonify({"message": "Order not found"}), 404

        bus_pass.razorpay_payment_id = razorpay_payment_id
        bus_pass.status = "PAID"
        bus_pass.is_active = 1

        db.session.commit()

        return jsonify({"message": "New pass payment verified"}), 200

    except razorpay.errors.SignatureVerificationError:
        return jsonify({"message": "Invalid payment signature"}), 400

    except Exception as e:
        print("🔥 PAYMENT VERIFY ERROR:", e)
        return jsonify({
            "message": "Server error during payment verification",
            "error": str(e)
        }), 500

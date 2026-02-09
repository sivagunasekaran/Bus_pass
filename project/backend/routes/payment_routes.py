import razorpay, hmac, hashlib
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import PassRenewal, BusPass
from extensions import db

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")

@payment_bp.route("/renewal/create-order", methods=["POST"])
@jwt_required()
def create_renewal_order():
    user_id = int(get_jwt_identity())
    data = request.json

    renewal = PassRenewal.query.get(data["renewal_id"])

    if not renewal or renewal.user_id != user_id:
        return {"message": "Invalid renewal"}, 400

    if renewal.status != "APPROVED":
        return {"message": "Renewal not approved"}, 400

    client = razorpay.Client(auth=(
        current_app.config["RAZORPAY_KEY_ID"],
        current_app.config["RAZORPAY_KEY_SECRET"]
    ))

    order = client.order.create({
        "amount": renewal.renewal_fare * 100,
        "currency": "INR",
        "receipt": f"renewal_{renewal.id}"
    })

    renewal.razorpay_order_id = order["id"]
    db.session.commit()

    return order

@payment_bp.route("/renewal/verify", methods=["POST"])
@jwt_required()
def verify_renewal_payment():
    data = request.json

    body = data["razorpay_order_id"] + "|" + data["razorpay_payment_id"]
    secret = current_app.config["RAZORPAY_KEY_SECRET"]

    expected_signature = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_signature != data["razorpay_signature"]:
        return {"message": "Payment verification failed"}, 400

    renewal = PassRenewal.query.filter_by(
        razorpay_order_id=data["razorpay_order_id"]
    ).first()

    renewal.status = "PAID"
    renewal.razorpay_payment_id = data["razorpay_payment_id"]

    # 🔥 UPDATE MAIN PASS EXPIRY
    bus_pass = BusPass.query.get(renewal.bus_pass_id)
    bus_pass.expiry_date = renewal.new_expiry_date

    db.session.commit()

    return {"message": "Payment successful"}

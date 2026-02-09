from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
from models import BusPass, PassRenewal, User
from extensions import db

renewal_bp = Blueprint("renewal", __name__, url_prefix="/api/renewal")

@renewal_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_renewal():
    user_id = int(get_jwt_identity())
    data = request.json

    bus_pass = BusPass.query.get(data["bus_pass_id"])
    if not bus_pass or bus_pass.user_id != user_id:
        return {"message": "Invalid pass"}, 400

    base_date = bus_pass.expiry_date or date.today()

    renewal = PassRenewal(
        bus_pass_id=bus_pass.id,
        user_id=user_id,
        old_expiry_date=bus_pass.expiry_date,
        new_expiry_date=base_date + timedelta(days=30),
        renewal_fare=data["renewal_fare"],
        status="PENDING"
    )


    db.session.add(renewal)
    db.session.commit()

    return {"message": "Renewal applied"}

@renewal_bp.route("/my-renewal", methods=["GET"])
@jwt_required()
def my_renewal():
    user_id = int(get_jwt_identity())

    renewal = PassRenewal.query.filter_by(user_id=user_id)\
                               .order_by(PassRenewal.id.desc())\
                               .first()

    if not renewal:
        return {"message": "No renewal found"}, 404

    return {
        "id": renewal.id,
        "status": renewal.status,
        "renewal_fare": renewal.renewal_fare,
        "new_expiry_date": str(renewal.new_expiry_date)
    }

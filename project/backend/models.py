from extensions import db
from datetime import datetime


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(255))
    role = db.Column(db.String(10), default="USER")
    
    # Relationships
    bus_passes = db.relationship("BusPass", back_populates="user")
    renewals = db.relationship("PassRenewal", back_populates="user")

    
class BusPass(db.Model):
    __tablename__ = "bus_pass"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    applicant_name = db.Column(db.String(100))
    route = db.Column(db.String(100))
    distance_km = db.Column(db.Numeric(6, 2))

    pass_duration_months = db.Column(db.Integer)
    valid_from = db.Column(db.Date)
    valid_to = db.Column(db.Date)

    fare = db.Column(db.Integer)

    status = db.Column(
        db.Enum("PENDING", "APPROVED", "REJECTED", "PAID"),
        default="PENDING"
    )

    # 🔥 REQUIRED FOR PAYMENT
    razorpay_order_id = db.Column(db.String(100))
    razorpay_payment_id = db.Column(db.String(100))

    is_active = db.Column(db.Boolean, default=False)

    id_proof = db.Column(db.String(255))
    
    # Relationships
    user = db.relationship("User", back_populates="bus_passes")



class PassRenewal(db.Model):
    __tablename__ = "pass_renewal"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    bus_pass_id = db.Column(db.Integer, db.ForeignKey("bus_pass.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    old_expiry_date = db.Column(db.Date, nullable=False)
    new_expiry_date = db.Column(db.Date, nullable=False)

    renewal_fare = db.Column(db.Integer, nullable=False)

    requested_route = db.Column(db.String(100))
    requested_distance_km = db.Column(db.Numeric(6, 2))

    route_changed = db.Column(db.Boolean, default=False)

    status = db.Column(
        db.Enum("PENDING", "APPROVED", "REJECTED", "PAID"),
        default="PENDING",
        nullable=False
    )

    is_active = db.Column(db.Boolean, default=True)

    razorpay_order_id = db.Column(db.String(100))
    razorpay_payment_id = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", back_populates="renewals")

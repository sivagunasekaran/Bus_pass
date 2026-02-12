
from extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(255))
    role = db.Column(db.String(10), default="USER")
    
class BusPass(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    route = db.Column(db.String(100))
    fare = db.Column(db.Integer)
    id_proof = db.Column(db.String(255))  # ✅ ADD THIS
    status = db.Column(db.String(20))


class PassRenewal(db.Model):
    __tablename__ = "pass_renewal"

    id = db.Column(db.Integer, primary_key=True)
    bus_pass_id = db.Column(db.Integer)
    user_id = db.Column(db.Integer)
    old_expiry_date = db.Column(db.Date)
    new_expiry_date = db.Column(db.Date)
    renewal_fare = db.Column(db.Integer)
    status = db.Column(db.String(20), default="PENDING")

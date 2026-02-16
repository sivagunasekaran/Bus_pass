from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import date
from dateutil.relativedelta import relativedelta
import os

from models import BusPass, User
from extensions import db
from utils.pass_utils import is_pass_active
from utils.email_utils import send_email

pass_bp = Blueprint("pass", __name__, url_prefix="/api/pass")


@pass_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_pass():
    try:
        # ==================================================
        # 1️⃣ AUTH
        # ==================================================
        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        # ==================================================
        # 2️⃣ BLOCK DUPLICATE ACTIVE PASS
        # ==================================================
        existing_passes = BusPass.query.filter_by(user_id=user_id).all()
        for p in existing_passes:
            if is_pass_active(p):
                return jsonify(
                    {"message": "You already have an active bus pass"}
                ), 400

        # ==================================================
        # 3️⃣ READ & VALIDATE FORM DATA
        # ==================================================
        try:
            applicant_name = request.form["applicant_name"]
            route = request.form["route"]
            distance_km = float(request.form["distance"])
            fare = int(request.form["fare"])
            duration_months = int(request.form["pass_duration"])
        except (KeyError, ValueError) as e:
            print(f"❌ Form data error: {str(e)}")
            return jsonify({"message": "Invalid or missing form data"}), 400

        if duration_months not in (1, 3):
            return jsonify({"message": "Invalid pass duration"}), 400

        # ==================================================
        # 4️⃣ VALIDITY CALCULATION
        # ==================================================
        valid_from = date.today()
        valid_to = valid_from + relativedelta(months=duration_months)

        # ==================================================
        # 5️⃣ FILE UPLOAD
        # ==================================================
        file = request.files.get("id_proof")
        if not file or file.filename == "":
            print("❌ ID proof missing")
            return jsonify({"message": "ID proof required"}), 400

        filename = secure_filename(file.filename).replace(" ", "_").lower()

        upload_dir = os.path.join("uploads", "id_proofs")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        print(f"✅ File saved: {file_path}")

        # ==================================================
        # 6️⃣ SAVE BUS PASS
        # ==================================================
        bus_pass = BusPass(
            user_id=user_id,
            applicant_name=applicant_name,
            route=route,
            distance_km=distance_km,
            pass_duration_months=duration_months,
            valid_from=valid_from,
            valid_to=valid_to,
            fare=fare,
            status="PENDING",
            is_active=0,
            id_proof=filename
        )

        db.session.add(bus_pass)
        db.session.commit()   # 🔥 COMMIT FIRST
        print(f"✅ Bus pass saved for user {user_id}")

        # ==================================================
        # 7️⃣ SEND EMAIL (AFTER SUCCESSFUL COMMIT)
        # ==================================================
        print(f"📧 Attempting to send email to {user.email}...")
        try:
            send_email(
                to=user.email,
                subject="Bus Pass Application Submitted",
                body=(
                    f"Hello {user.name},\n\n"
                    "Your bus pass application has been successfully submitted.\n"
                    "You will be notified after approval.\n\n"
                    "Thank you."
                )
            )
            print(f"✅ Email sent successfully to {user.email}")
        except Exception as e:
            print(f"⚠️  Email sending failed: {str(e)}")
            # Don't fail the entire request just because email failed

        # ==================================================
        # 8️⃣ RESPONSE
        # ==================================================
        response_data = {
            "message": "Pass applied successfully",
            "valid_from": valid_from.isoformat(),
            "valid_to": valid_to.isoformat(),
            "email_sent": True
        }
        print(f"✅ [200] Returning success response")
        return jsonify(response_data), 201

    except Exception as e:
        print(f"❌ CRITICAL ERROR in apply_pass: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Server error: " + str(e)}), 500

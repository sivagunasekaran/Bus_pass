from datetime import date
from extensions import db
from models import PassRenewal
from utils.email_utils import send_email

def enforce_expiry(bus_pass):
    """
    Enforce expiry for a PAID bus pass.
    - Sets is_active = 0
    - Sends expiry email ONCE
    """

    if not bus_pass:
        print("❌ [EXPIRE] No bus pass provided")
        return False

    print(f"🔍 [EXPIRE] Checking pass ID {bus_pass.id}: status={bus_pass.status}, valid_to={bus_pass.valid_to}, is_active={bus_pass.is_active}")

    # Only PAID passes can expire
    if bus_pass.status != "PAID":
        print(f"⏭️  [EXPIRE] Pass {bus_pass.id} status is {bus_pass.status}, not PAID - skipping expiry")
        return bus_pass.is_active == 1

    today = date.today()
    print(f"📅 [EXPIRE] Today: {today}, Pass expires: {bus_pass.valid_to}")

    # 🔥 Check if pass is actually expired
    if bus_pass.valid_to < today:
        print(f"⚠️  [EXPIRE] Pass {bus_pass.id} IS EXPIRED")
        
        # Deactivate if not already
        if bus_pass.is_active == 1:
            bus_pass.is_active = 0
            print(f"🔴 [EXPIRE] Deactivating pass {bus_pass.id}")

        # expire related renewals (optional but recommended)
        PassRenewal.query.filter(
            PassRenewal.bus_pass_id == bus_pass.id,
            PassRenewal.is_active == 1
        ).update(
            {"is_active": 0},
            synchronize_session=False
        )

        db.session.commit()
        print(f"💾 [EXPIRE] Database committed for pass {bus_pass.id}")

        # 🔔 SEND EMAIL ONCE
        try:
            if bus_pass.user:
                print(f"📧 [EXPIRE] Sending expiry email to {bus_pass.user.email}")
                send_email(
                    to=bus_pass.user.email,
                    subject="Bus Pass Expired",
                    body=(
                        f"Hello {bus_pass.applicant_name},\n\n"
                        f"Your bus pass expired on {bus_pass.valid_to.strftime('%Y-%m-%d')}.\n"
                        "Please renew your pass to continue travel.\n\n"
                        "Thank you."
                    )
                )
                print(f"✅ [EXPIRE] Expiry email sent successfully for pass {bus_pass.id}")
            else:
                print(f"⚠️  [EXPIRE] User not found for pass {bus_pass.id}, skipping email")
        except Exception as e:
            print(f"❌ [EXPIRE] Failed to send expiry email for pass {bus_pass.id}: {str(e)}")

        return False
    else:
        print(f"✅ [EXPIRE] Pass {bus_pass.id} is still valid (expires {bus_pass.valid_to})")
        return bus_pass.is_active == 1

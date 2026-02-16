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
        return False

    today = date.today()

    # Only PAID passes can expire
    if bus_pass.status != "PAID":
        return bus_pass.is_active == 1

    # Check if pass is actually expired
    if bus_pass.valid_to < today:
        # Deactivate if not already
        if bus_pass.is_active == 1:
            bus_pass.is_active = 0

        # expire related renewals (optional but recommended)
        PassRenewal.query.filter(
            PassRenewal.bus_pass_id == bus_pass.id,
            PassRenewal.is_active == 1
        ).update(
            {"is_active": 0},
            synchronize_session=False
        )

        db.session.commit()

        # Send expiry email once
        try:
            if bus_pass.user:
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
            else:
                pass
        except Exception as e:
            pass

        return False
    else:
        return bus_pass.is_active == 1

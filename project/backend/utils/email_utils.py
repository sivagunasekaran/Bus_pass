from flask_mail import Message
from extensions import mail

def send_email(to, subject, body):
    try:
        msg = Message(
            subject=subject,
            recipients=[to],
            body=body
        )
        mail.send(msg)
        return True
    except Exception as e:
        # Log but don't crash - email service might not be configured
        return False

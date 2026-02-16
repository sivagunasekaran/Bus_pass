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
        print(f"✅ Email sent successfully to {to}")
        return True
    except Exception as e:
        print(f"⚠️  Failed to send email to {to}: {str(e)}")
        # Log but don't crash - email service might not be configured
        return False

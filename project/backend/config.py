import os
class Config:
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:12345678@localhost/epass"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "change-this"
    RAZORPAY_KEY_ID = "rzp_test_SGLNt0lPcuz9Qc"
    RAZORPAY_KEY_SECRET = "d9QqYLHkcu60sxpByeCIrBtA"

    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = bool(int(os.getenv("MAIL_USE_TLS", 1)))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME")




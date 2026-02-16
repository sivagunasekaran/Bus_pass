class Config:
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:12345678@localhost/epass"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "change-this"
    RAZORPAY_KEY_ID = "rzp_test_SGLNt0lPcuz9Qc"
    RAZORPAY_KEY_SECRET = "d9QqYLHkcu60sxpByeCIrBtA"

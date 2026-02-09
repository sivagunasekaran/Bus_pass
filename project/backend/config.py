class Config:
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:1234@localhost/epass"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "change-this"
    RAZORPAY_KEY_ID = "rzp_test_xxxxx"
    RAZORPAY_KEY_SECRET = "xxxxxxxx"

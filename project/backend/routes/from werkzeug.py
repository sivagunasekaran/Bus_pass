from werkzeug.security import generate_password_hash

# password to encrypt
password = "admin123"

# generate hashed password
hashed_password = generate_password_hash(password)

# print hashed password
print("Hashed Password:", hashed_password)
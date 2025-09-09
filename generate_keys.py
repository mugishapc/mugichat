import secrets
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

# Generate a secure Flask SECRET_KEY
secret_key = secrets.token_hex(32)

# Generate VAPID keys (EC keys)
private_key = ec.generate_private_key(ec.SECP256R1())
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

public_key = private_key.public_key()
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# Encode keys in URL-safe base64 without padding
vapid_private_key = base64.urlsafe_b64encode(private_bytes).rstrip(b"=").decode("utf-8")
vapid_public_key = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode("utf-8")

# Print ready-to-use .env entries
print(f"SECRET_KEY={secret_key}")
print("DATABASE_URL=sqlite:///mugichat.db")
print(f"VAPID_PUBLIC_KEY={vapid_public_key}")
print(f"VAPID_PRIVATE_KEY={vapid_private_key}")
print("VAPID_CLAIM_EMAIL=admin@mugichat.com")

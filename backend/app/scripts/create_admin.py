import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User


def main() -> None:
    email = input("Administrator email: ").strip().lower()
    try:
        TypeAdapter(EmailStr).validate_python(email)
    except ValidationError as exc:
        raise SystemExit("Please enter a valid email address.") from exc
    full_name = input("Administrator name: ").strip()
    if not full_name:
        raise SystemExit("Name is required.")
    password = getpass.getpass("Password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12 or password != confirmation:
        raise SystemExit("Passwords must match and contain at least 12 characters.")

    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise SystemExit("An account with that email already exists.")
        db.add(User(email=email, full_name=full_name, password_hash=hash_password(password)))
        db.commit()
    print("Administrator account created.")


if __name__ == "__main__":
    main()

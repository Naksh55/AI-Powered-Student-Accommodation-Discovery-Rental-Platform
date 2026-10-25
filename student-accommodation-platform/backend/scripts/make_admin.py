"""
Promotes an existing account to admin. Admin accounts can't be created through
signup (that would let anyone make themselves an admin), so this is how you get one.

1. Sign up normally on the site (as a student or owner).
2. From the backend/ folder, with the venv's Python:

    .\\venv\\Scripts\\python.exe -m scripts.make_admin your@email.com

Log out and back in afterwards so the site picks up the new role.
"""
import sys

from app.db.session import SessionLocal
from app.models.user import User, UserRole


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m scripts.make_admin <email>")
    email = sys.argv[1].strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            sys.exit(f"No account with email {email!r}. Sign up on the site first.")
        user.role = UserRole.ADMIN
        db.commit()
        print(f"{user.full_name} <{user.email}> is now an admin.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

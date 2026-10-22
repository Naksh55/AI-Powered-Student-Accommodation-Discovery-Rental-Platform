"""add inquiries

Revision ID: 942fadca345e
Revises: 1bf8ff00caad
Create Date: 2026-10-21 19:58:48

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "942fadca345e"
down_revision: Union[str, None] = "1bf8ff00caad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("move_in_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inquiries_listing_id"), "inquiries", ["listing_id"], unique=False)
    op.create_index(op.f("ix_inquiries_student_id"), "inquiries", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_inquiries_student_id"), table_name="inquiries")
    op.drop_index(op.f("ix_inquiries_listing_id"), table_name="inquiries")
    op.drop_table("inquiries")

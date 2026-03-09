"""add is_approved to gym

Revision ID: 003
Revises: 002
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "gym",
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("gym", "is_approved")

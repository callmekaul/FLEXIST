"""add exercise_id to leaderboardentry

Revision ID: 002
Revises: 001
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leaderboardentry",
        sa.Column("exercise_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_leaderboardentry_exercise_id",
        "leaderboardentry",
        "exercise",
        ["exercise_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_leaderboardentry_exercise_id", "leaderboardentry", type_="foreignkey")
    op.drop_column("leaderboardentry", "exercise_id")

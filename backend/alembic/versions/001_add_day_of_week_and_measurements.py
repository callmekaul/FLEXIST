"""add day_of_week and body measurement fields

Revision ID: 001
Revises:
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add day_of_week to workoutplanexercise
    op.add_column(
        "workoutplanexercise",
        sa.Column("day_of_week", sa.Integer(), nullable=False, server_default="0"),
    )

    # Add day_of_week to workoutlog
    op.add_column(
        "workoutlog",
        sa.Column("day_of_week", sa.Integer(), nullable=True),
    )

    # Add body measurement fields to bodymeasurement
    for col in [
        "bicep_cm", "chest_cm", "waist_cm", "hip_cm",
        "thigh_cm", "calf_cm", "forearm_cm", "neck_cm",
    ]:
        op.add_column(
            "bodymeasurement",
            sa.Column(col, sa.Float(), nullable=True),
        )


def downgrade() -> None:
    for col in [
        "bicep_cm", "chest_cm", "waist_cm", "hip_cm",
        "thigh_cm", "calf_cm", "forearm_cm", "neck_cm",
    ]:
        op.drop_column("bodymeasurement", col)

    op.drop_column("workoutlog", "day_of_week")
    op.drop_column("workoutplanexercise", "day_of_week")

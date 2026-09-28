"""Add demo flags to habit and financial records.

Revision ID: 003_add_demo_flags
Revises: 002_add_work_sessions
Create Date: 2026-09-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_add_demo_flags"
down_revision: Union[str, None] = "002_add_work_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("habit_records", sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("financial_records", sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_habit_records_is_demo", "habit_records", ["is_demo"], unique=False)
    op.create_index("ix_financial_records_is_demo", "financial_records", ["is_demo"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_financial_records_is_demo", table_name="financial_records")
    op.drop_index("ix_habit_records_is_demo", table_name="habit_records")
    op.drop_column("financial_records", "is_demo")
    op.drop_column("habit_records", "is_demo")

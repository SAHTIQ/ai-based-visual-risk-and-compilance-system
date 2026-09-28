"""Add user roles and user_key to users table

Revision ID: 004_add_user_roles_and_keys
Revises: 003_add_demo_flags
Create Date: 2026-09-28
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_add_user_roles_and_keys"
down_revision: Union[str, None] = "003_add_demo_flags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add role column if not exists
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_cols = [c["name"] for c in insp.get_columns("users")]
    
    if "user_key" not in user_cols:
        op.add_column("users", sa.Column("user_key", sa.String(50), nullable=True))
        op.create_index("ix_users_user_key", "users", ["user_key"], unique=True)
    
    if "role" not in user_cols:
        op.add_column("users", sa.Column("role", sa.String(50), nullable=False, server_default="user"))
        op.create_index("ix_users_role", "users", ["role"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "role")

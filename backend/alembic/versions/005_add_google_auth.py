"""Add Google auth support to users table

Revision ID: 005_add_google_auth
Revises: 004_add_user_roles_and_keys
Create Date: 2026-10-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_add_google_auth"
down_revision: Union[str, None] = "004_add_user_roles_and_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_cols = [c["name"] for c in insp.get_columns("users")]

    # Allow nullable password_hash for OAuth users
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)

    if "google_id" not in user_cols:
        op.add_column("users", sa.Column("google_id", sa.String(255), nullable=True))
        op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    if "auth_provider" not in user_cols:
        op.add_column("users", sa.Column("auth_provider", sa.String(50), nullable=False, server_default="local"))
        op.create_index("ix_users_auth_provider", "users", ["auth_provider"], unique=False)

    if "avatar_url" not in user_cols:
        op.add_column("users", sa.Column("avatar_url", sa.String(1024), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_cols = [c["name"] for c in insp.get_columns("users")]

    if "avatar_url" in user_cols:
        op.drop_column("users", "avatar_url")
    if "auth_provider" in user_cols:
        op.drop_index("ix_users_auth_provider", table_name="users")
        op.drop_column("users", "auth_provider")
    if "google_id" in user_cols:
        op.drop_index("ix_users_google_id", table_name="users")
        op.drop_column("users", "google_id")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)

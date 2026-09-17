"""Add work_sessions table for behavior and productivity tracking

Revision ID: 002_add_work_sessions
Revises: 001_initial_schema
Create Date: 2026-09-04 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_work_sessions'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'work_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False, server_default='Coding'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='in_progress'),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('is_demo', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_work_sessions_activity_type'), 'work_sessions', ['activity_type'], unique=False)
    op.create_index(op.f('ix_work_sessions_id'), 'work_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_work_sessions_is_demo'), 'work_sessions', ['is_demo'], unique=False)
    op.create_index(op.f('ix_work_sessions_started_at'), 'work_sessions', ['started_at'], unique=False)
    op.create_index(op.f('ix_work_sessions_status'), 'work_sessions', ['status'], unique=False)
    op.create_index(op.f('ix_work_sessions_user_id'), 'work_sessions', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_table('work_sessions')

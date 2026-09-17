"""Initial schema for user profiling database

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-29 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=100), nullable=True),
        sa.Column('occupation', sa.String(length=255), nullable=True),
        sa.Column('education', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)

    # 3. financial_records table
    op.create_table(
        'financial_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('income', sa.Float(), nullable=False),
        sa.Column('expenses', sa.Float(), nullable=False),
        sa.Column('savings', sa.Float(), nullable=False),
        sa.Column('budget', sa.Float(), nullable=False),
        sa.Column('expense_category', sa.String(length=100), nullable=False),
        sa.Column('financial_goal', sa.String(length=255), nullable=True),
        sa.Column('recorded_at', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_financial_records_expense_category'), 'financial_records', ['expense_category'], unique=False)
    op.create_index(op.f('ix_financial_records_id'), 'financial_records', ['id'], unique=False)
    op.create_index(op.f('ix_financial_records_recorded_at'), 'financial_records', ['recorded_at'], unique=False)
    op.create_index(op.f('ix_financial_records_user_id'), 'financial_records', ['user_id'], unique=False)

    # 4. study_records table
    op.create_table(
        'study_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('course', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('study_hours', sa.Float(), nullable=False),
        sa.Column('study_goal', sa.Float(), nullable=False),
        sa.Column('academic_performance', sa.String(length=100), nullable=False),
        sa.Column('recorded_at', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_study_records_course'), 'study_records', ['course'], unique=False)
    op.create_index(op.f('ix_study_records_id'), 'study_records', ['id'], unique=False)
    op.create_index(op.f('ix_study_records_recorded_at'), 'study_records', ['recorded_at'], unique=False)
    op.create_index(op.f('ix_study_records_user_id'), 'study_records', ['user_id'], unique=False)

    # 5. habit_records table
    op.create_table(
        'habit_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('habit_name', sa.String(length=255), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('duration', sa.String(length=100), nullable=False),
        sa.Column('recorded_at', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_habit_records_id'), 'habit_records', ['id'], unique=False)
    op.create_index(op.f('ix_habit_records_recorded_at'), 'habit_records', ['recorded_at'], unique=False)
    op.create_index(op.f('ix_habit_records_user_id'), 'habit_records', ['user_id'], unique=False)

    # 6. activity_history table
    op.create_table(
        'activity_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_history_activity_type'), 'activity_history', ['activity_type'], unique=False)
    op.create_index(op.f('ix_activity_history_created_at'), 'activity_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_activity_history_id'), 'activity_history', ['id'], unique=False)
    op.create_index(op.f('ix_activity_history_user_id'), 'activity_history', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_table('activity_history')
    op.drop_table('habit_records')
    op.drop_table('study_records')
    op.drop_table('financial_records')
    op.drop_table('user_profiles')
    op.drop_table('users')

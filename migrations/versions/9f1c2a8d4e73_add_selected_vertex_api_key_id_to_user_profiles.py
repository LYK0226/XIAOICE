"""add selected_vertex_api_key_id to user_profiles

Revision ID: 9f1c2a8d4e73
Revises: 6aaf2723b26a
Create Date: 2026-03-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f1c2a8d4e73'
down_revision = '6aaf2723b26a'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_profiles_columns = {column['name'] for column in inspector.get_columns('user_profiles')}
    user_profiles_foreign_keys = inspector.get_foreign_keys('user_profiles')
    has_vertex_api_key_fk = any(
        fk.get('referred_table') == 'user_api_keys'
        and fk.get('constrained_columns') == ['selected_vertex_api_key_id']
        for fk in user_profiles_foreign_keys
    )

    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        if 'selected_vertex_api_key_id' not in user_profiles_columns:
            batch_op.add_column(sa.Column('selected_vertex_api_key_id', sa.Integer(), nullable=True))
        if not has_vertex_api_key_fk:
            batch_op.create_foreign_key(
                'fk_user_profiles_selected_vertex_api_key_id_user_api_keys',
                'user_api_keys',
                ['selected_vertex_api_key_id'],
                ['id']
            )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_profiles_columns = {column['name'] for column in inspector.get_columns('user_profiles')}
    user_profiles_foreign_keys = inspector.get_foreign_keys('user_profiles')

    fk_name = None
    for foreign_key in user_profiles_foreign_keys:
        if foreign_key.get('referred_table') == 'user_api_keys' and foreign_key.get('constrained_columns') == ['selected_vertex_api_key_id']:
            fk_name = foreign_key.get('name')
            break

    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        if fk_name:
            batch_op.drop_constraint(fk_name, type_='foreignkey')
        if 'selected_vertex_api_key_id' in user_profiles_columns:
            batch_op.drop_column('selected_vertex_api_key_id')

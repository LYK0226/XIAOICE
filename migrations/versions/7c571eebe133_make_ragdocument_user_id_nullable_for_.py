"""make RagDocument.user_id nullable for global RAG

Revision ID: 7c571eebe133
Revises: 05f47b96438f
Create Date: 2026-02-15 14:30:31.010888

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7c571eebe133'
down_revision = '05f47b96438f'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'rag_documents' not in inspector.get_table_names():
        return

    rag_document_columns = {column['name'] for column in inspector.get_columns('rag_documents')}
    if 'user_id' not in rag_document_columns:
        return

    existing_foreign_keys = inspector.get_foreign_keys('rag_documents')
    fk_to_drop = None
    has_set_null_fk = False

    for foreign_key in existing_foreign_keys:
        if foreign_key.get('constrained_columns') != ['user_id']:
            continue
        if foreign_key.get('referred_table') != 'users':
            continue

        ondelete = (foreign_key.get('options') or {}).get('ondelete', '').upper()
        if ondelete == 'SET NULL':
            has_set_null_fk = True
        else:
            fk_to_drop = foreign_key.get('name')

    with op.batch_alter_table('rag_documents', schema=None) as batch_op:
        batch_op.alter_column('user_id', existing_type=sa.INTEGER(), nullable=True)

        if fk_to_drop:
            batch_op.drop_constraint(fk_to_drop, type_='foreignkey')

        if not has_set_null_fk:
            batch_op.create_foreign_key(
                'fk_rag_documents_user_id_users_set_null',
                'users',
                ['user_id'],
                ['id'],
                ondelete='SET NULL',
            )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'rag_documents' not in inspector.get_table_names():
        return

    rag_document_columns = {column['name'] for column in inspector.get_columns('rag_documents')}
    if 'user_id' not in rag_document_columns:
        return

    existing_foreign_keys = inspector.get_foreign_keys('rag_documents')
    set_null_fk_name = None
    has_cascade_fk = False

    for foreign_key in existing_foreign_keys:
        if foreign_key.get('constrained_columns') != ['user_id']:
            continue
        if foreign_key.get('referred_table') != 'users':
            continue

        ondelete = (foreign_key.get('options') or {}).get('ondelete', '').upper()
        if ondelete == 'SET NULL':
            set_null_fk_name = foreign_key.get('name')
        if ondelete == 'CASCADE':
            has_cascade_fk = True

    with op.batch_alter_table('rag_documents', schema=None) as batch_op:
        if set_null_fk_name:
            batch_op.drop_constraint(set_null_fk_name, type_='foreignkey')

        if not has_cascade_fk:
            batch_op.create_foreign_key(
                'rag_documents_user_id_fkey',
                'users',
                ['user_id'],
                ['id'],
                ondelete='CASCADE',
            )

        batch_op.alter_column('user_id', existing_type=sa.INTEGER(), nullable=False)

"""recreate missing revision

Revision ID: 831f5b74bbc6
Revises: 
Create Date: 2026-02-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '831f5b74bbc6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Stub migration to satisfy missing revision.
    No schema changes are applied by this stub. If you intended to recreate
    a lost migration, replace this stub with the correct operations."""
    pass


def downgrade():
    pass

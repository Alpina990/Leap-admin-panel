"""Disposable real FastAPI server for BFF smoke. Never loads deployment dotenv."""
import os
import sys
import tempfile
from pathlib import Path

# Drop inherited integration settings before importing backend configuration.
for key in list(os.environ):
    if key.startswith('LEAP_'):
        del os.environ[key]

backend = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(backend / 'src'))
from leap_api.config import Settings
Settings.model_config['env_file'] = None
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from leap_api.main import create_app
from leap_api.admin import create_admin
from leap_api.models import Learner, Course, Section, PaymentOrder, LearnerNotification
import uvicorn

with tempfile.TemporaryDirectory(prefix='database-', dir=sys.argv[2]) as directory:
    db_url = 'sqlite:///' + str(Path(directory) / 'disposable.sqlite').replace('\\', '/')
    settings = Settings(_env_file=None, environment='test', database_url=db_url,
                        content_export_dir=Path(directory), admin_origin='https://localhost:3445')
    engine = create_engine(db_url, connect_args={'check_same_thread': False})
    # Legacy core revisions contain PostgreSQL-only JSONB. SQLite E2E uses
    # core metadata plus the REAL admin revisions, including audit triggers.
    # The full historical chain is separately exercised on disposable PostgreSQL.
    from leap_api.database import Base
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    import importlib.util
    Base.metadata.create_all(engine, tables=[table for table in Base.metadata.sorted_tables if not table.name.startswith('admin_')])
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            for filename in ('0a12b34c56de_create_admin_identity.py', '1b23c45d67ef_admin_notes.py', '2c34d56e78fa_admin_content.py'):
                spec = importlib.util.spec_from_file_location('fixture_admin_revision', backend / 'alembic/versions' / filename)
                revision = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(revision)
                revision.upgrade()
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory.begin() as db:
        create_admin(db, 'smoke_operator', 'disposable-test-only-password-92!').can_write_notes = True
        db.add_all([Learner(id=n, username=f'fixture_{n}', first_name='Disposable') for n in range(1, 27)])
        db.add(Learner(id=9007199254740993, username='Exact_Case', first_name='Large ID'))
    with factory.begin() as db:
        db.add(Course(id='fixture-course', slug='fixture-course', title='Disposable course'))
        db.flush()
        db.add(Section(id='fixture-section', course_id='fixture-course', slug='fixture-section', title='Disposable section', position=1))
        db.flush()
        from datetime import datetime, timezone
        db.add_all([PaymentOrder(id=f'fixture-order-{n:02}', learner_id=1, section_id='fixture-section',
            external_id=f'fixture-external-{n}', amount_tiyin=120000000, provider='payme', status='paid',
            paid_at=datetime.now(timezone.utc), wlcm_payment_id=f'fixture-wlcm-{n}') for n in range(27)])
    with factory.begin() as db:
        db.add_all([LearnerNotification(id=f'fixture-notification-{n:02}',learner_id=1,kind='lesson',title=f'Disposable notification {n}',body='Disposable inbox content',event_key=f'fixture-event-{n}',created_at=datetime(2026,1,n+1,tzinfo=timezone.utc)) for n in range(27)])
    from leap_api.models import Unit
    from leap_api.admin_content import AdminContentPermission
    with factory.begin() as db:
        db.add(Unit(id='fixture-unit',section_id='fixture-section',slug='fixture-unit',title='Disposable unit',subtitle='Disposable unit',position=1))
        db.add(AdminContentPermission(admin_id=1,can_write=True))
    app = create_app(settings=settings, engine=engine, session_factory=factory)
    uvicorn.run(app, host='127.0.0.1', port=8125, access_log=False, log_level='warning')
    engine.dispose()

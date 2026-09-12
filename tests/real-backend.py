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
from leap_api.database import Base
from leap_api.main import create_app
from leap_api.admin import create_admin
from leap_api.models import Learner
import uvicorn

with tempfile.TemporaryDirectory(prefix='database-', dir=sys.argv[2]) as directory:
    db_url = 'sqlite:///' + str(Path(directory) / 'disposable.sqlite').replace('\\', '/')
    settings = Settings(_env_file=None, environment='test', database_url=db_url,
                        content_export_dir=Path(directory), admin_origin='https://localhost:3443')
    engine = create_engine(db_url, connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)  # Fixture only; never a production migration.
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory.begin() as db:
        create_admin(db, 'smoke_operator', 'disposable-test-only-password-92!')
        db.add_all([Learner(id=n, username=f'fixture_{n}', first_name='Disposable') for n in range(1, 27)])
        db.add(Learner(id=9007199254740993, username='Exact_Case', first_name='Large ID'))
    app = create_app(settings=settings, engine=engine, session_factory=factory)
    uvicorn.run(app, host='127.0.0.1', port=8123, access_log=False, log_level='warning')
    engine.dispose()

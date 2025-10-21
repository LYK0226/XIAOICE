import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key')
    SQLALCHEMY_DATABASE_URI = 'postgresql://xiaoice_user:xiaoice_password@localhost:5432/xiaoice'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
    DEBUG = True

config = {'default': Config}

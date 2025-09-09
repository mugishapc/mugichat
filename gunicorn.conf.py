# gunicorn.conf.py
workers = 1
worker_class = 'eventlet'
bind = '0.0.0.0:10000'
preload_app = True
reload = False
timeout = 30
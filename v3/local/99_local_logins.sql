-- Local development only. Never use these credentials outside loopback development.
alter role electrasim_auth login password 'electrasim-auth-local';
alter role electrasim_app login password 'electrasim-app-local';
alter role electrasim_worker login password 'electrasim-worker-local';

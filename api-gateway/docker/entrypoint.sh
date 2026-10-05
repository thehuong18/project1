#!/bin/bash
set -Eeuo pipefail

cd /var/www

# Xử lý chứng chỉ CA cho Aiven MySQL
if [[ -n "${MYSQL_ATTR_SSL_CA:-}" ]]; then
    if [[ ! -f "$MYSQL_ATTR_SSL_CA" || ! -r "$MYSQL_ATTR_SSL_CA" ]]; then
        echo "Cannot read MySQL CA file. Check Render Secret Files and MYSQL_ATTR_SSL_CA." >&2
        exit 1
    fi
    umask 077
    mkdir -p /run/app-certificates
    chown root:www-data /run/app-certificates
    chmod 750 /run/app-certificates
    cp "$MYSQL_ATTR_SSL_CA" /run/app-certificates/mysql-ca.pem
    chown www-data:www-data /run/app-certificates/mysql-ca.pem
    chmod 400 /run/app-certificates/mysql-ca.pem
    export MYSQL_ATTR_SSL_CA=/run/app-certificates/mysql-ca.pem
    su-exec www-data php docker/check-ca.php || true
fi

if (( $# > 0 )); then
    exec su-exec www-data "$@"
fi

: "${APP_KEY:?Set a persistent APP_KEY before starting the application}"
: "${APP_URL:?Set APP_URL to the public HTTPS address}"
export PORT="${PORT:-10000}"
if [[ ! "$PORT" =~ ^[0-9]{1,5}$ ]] || (( 10#$PORT < 1 || 10#$PORT > 65535 )); then
    echo "PORT must be an integer between 1 and 65535" >&2
    exit 1
fi

envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/http.d/default.conf

mkdir -p storage/framework/{cache/data,sessions,views} storage/logs storage/app/public bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

su-exec www-data php artisan config:cache
su-exec www-data php artisan route:cache
su-exec www-data php artisan view:cache

case "${RUN_MIGRATIONS:-true}" in
    true) su-exec www-data php artisan migrate --force --no-interaction ;;
    false) ;;
    *) echo "RUN_MIGRATIONS must be true or false" >&2; exit 1 ;;
esac

case "${RUN_SEEDERS:-false}" in
    true) su-exec www-data php artisan db:seed --force --no-interaction ;;
    false) ;;
    *) echo "RUN_SEEDERS must be true or false" >&2; exit 1 ;;
esac

nginx -t
php-fpm -t

server_pids=()
cleanup() {
    trap - EXIT TERM INT
    if (( ${server_pids[0]} )); then
        kill -QUIT "${server_pids[0]}" 2>/dev/null || true
        wait "${server_pids[0]}" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 0' TERM INT

php-fpm -F &
server_pids+=("$!")
nginx -g 'daemon off;' &
server_pids+=("$!")

status=0
wait -n "${server_pids[0]}" || status=$?
echo "A web server exited (status $status); stopping container" >&2
exit 1

FROM postgres:18

RUN apt-get update \
  && apt-get install -y --no-install-recommends rclone cron ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backup.sh /scripts/backup.sh
COPY backup.cron /scripts/backup.cron
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /scripts/backup.sh /entrypoint.sh \
  && crontab /scripts/backup.cron

CMD ["/entrypoint.sh"]

from apscheduler.schedulers.background import BackgroundScheduler
from app import app, update_vehicle_positions

scheduler = BackgroundScheduler()

def job():
    with app.app_context():
        update_vehicle_positions()

scheduler.add_job(
    func=job,
    trigger="interval",
    seconds=5,
    max_instances=2,
    coalesce=True,
)

scheduler.start()

print("Scheduler worker started...")

# keep script alive
import time
while True:
    time.sleep(60)
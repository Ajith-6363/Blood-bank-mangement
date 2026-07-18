import asyncio
import logging
from app.core.database import SessionLocal
from app.background_tasks.tasks import check_expiring_stock, clean_expired_sessions_and_otps

logger = logging.getLogger("scheduler")

async def start_periodic_scheduler():
    logger.info("Starting background periodic scheduler...")
    while True:
        try:
            db = SessionLocal()
            try:
                check_expiring_stock(db)
                clean_expired_sessions_and_otps(db)
            except Exception as e:
                logger.error(f"Error in background task scheduler execution: {str(e)}")
            finally:
                db.close()
                
            # Sleep for 12 hours before running check again
            await asyncio.sleep(43200)
        except asyncio.CancelledError:
            logger.info("Periodic scheduler task cancelled.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in periodic scheduler loop: {str(e)}")
            await asyncio.sleep(60)

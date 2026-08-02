const createGracefulShutdown = ({ server, io, pubClient, subClient, otpStore, logger }) => {
  return async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(() => {
      logger.info('HTTP server closed.');
    });

    io.disconnectSockets(true);
    logger.info('Socket.IO connections severed.');

    try {
      if (otpStore) {
        await otpStore.close();
        logger.info('OTP Redis connection closed.');
      }

      if (pubClient) {
        try {
          await pubClient.quit();
        } catch (err) {
          logger.error('Error quitting Redis pubClient:', err);
        }
      }

      if (subClient) {
        try {
          await subClient.quit();
        } catch (err) {
          logger.error('Error quitting Redis subClient:', err);
        }
      }

      if (pubClient || subClient) {
        logger.info('Redis connections closed.');
      }
    } catch (err) {
      logger.error('Error during database teardown:', err);
    }

    logger.info('Shutdown complete. Exiting.');
    process.exit(0);
  };
};

module.exports = {
  createGracefulShutdown,
};
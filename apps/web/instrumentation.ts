/**
 * Next.js instrumentation hook
 * This runs before the application starts and allows us to configure Node.js settings
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Configure timezone from environment variable
    const timezone = process.env.TZ || 'America/Sao_Paulo';
    
    // Set TZ environment variable for Node.js
    process.env.TZ = timezone;
    
    // Log timezone configuration
    console.log(`🌍 Timezone configured: ${timezone}`);
    
    // Verify timezone is set correctly
    const testDate = new Date();
    const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`   Node.js timezone: ${tzString}`);
    console.log(`   Current time: ${testDate.toLocaleString('pt-BR', { timeZone: timezone })}`);
    
    // Initialize Redis connection
    try {
      const { initializeRedis } = await import('./src/lib/cache');
      const redisConnected = await initializeRedis();
      if (redisConnected) {
        console.log('✅ Redis initialized successfully');
      } else {
        console.warn('⚠️ Redis initialization failed - cache will be disabled');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
    }
  }
}


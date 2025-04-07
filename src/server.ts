import Fastify from 'fastify';
import mercurius from 'mercurius';
import { Pool } from 'pg';
import pino from 'pino';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { schema } from './schemas';
import { resolvers } from './controllers/resolvers';
import { authMiddleware } from './middleware/auth';
import { UserService } from './services/userService';

// Import to apply type augmentation
import './types/mercurius';

const logger = pino({ level: 'info' });
const app = Fastify({ logger });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const userService = new UserService(pool);

// Register CORS
app.register(cors, {
  origin: '*', // Adjust for production
  methods: ['GET', 'POST'],
  credentials: true,
});

// Register rate limiting
app.register(rateLimit, {
  max: 100,
  timeWindow: '1m',
});

// Register Mercurius
app.register(mercurius, {
  schema,
  resolvers,
  context: (request) => ({
    db: pool,
    logger,
    userService,
    user: authMiddleware(request, userService),
    headers: request.headers,
    app,              // Default MercuriusContext property
    reply: request.reply, // Default MercuriusContext property
    request: request.raw, // Default MercuriusContext property
  }),
});

app.listen({ port: 4000 }, (err) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  logger.info('Server running at http://localhost:4000/graphql');
});
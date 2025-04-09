import Fastify from 'fastify';
import mercurius from 'mercurius';
import { Pool } from 'pg';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { schema } from './schemas';
import { resolvers } from './controllers/resolvers';
import { UserService } from './services/userService';
import { verifyToken } from './utils/jwt';
import './types/mercurius';
import pino from 'pino';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/yourdb' });
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

const userService = new UserService(pool, logger);

app.log = logger;
app.register(cors, { origin: '*', methods: ['GET', 'POST'], credentials: true });
app.register(rateLimit, { max: 100, timeWindow: '1m' });

app.register(mercurius, {
  schema,
  resolvers,
  context: async (request, reply) => {
    const authHeader = request.headers.authorization;
    let user = null;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          user = verifyToken(token);
          await userService.updateLastActive(user.id);
        } catch (error: any) {
          app.log.warn(`Token verification failed: ${error.message}`);
        }
      }
    }

    return { db: pool, logger: app.log, userService, user, headers: request.headers, app, reply, request: request.raw };
  },
  graphiql: true,
});

const io = new Server(app.server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  try {
    const user = verifyToken(token);
    socket.join(user.id);
    app.log.info(`User ${user.id} connected via WebSocket`);
    userService.updateLastActive(user.id);

    socket.on('message', (msg) => {
      userService.updateLastActive(user.id);
      const recipientId = msg.recipientId;
      io.to(recipientId).emit('message', { senderId: user.id, text: msg.text, timestamp: Date.now() });
      userService.updateLastActive(recipientId);
    });
  } catch (error: any) {
    const reason = error.name === 'TokenExpiredError' ? 'Token expired' : 'Authentication failed';
    socket.emit('error', { message: 'Authentication failed', reason });
    socket.disconnect();
    app.log.warn(`WebSocket auth failed: ${error.message}`);
  }
});

app.decorate('io', io);

app.listen({ port: Number(process.env.PORT) || 4000 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server running at ${address}`);
});

export default app;
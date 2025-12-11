import { graphqlHTTP } from 'express-graphql';
import schema from './schema.js';
import resolvers from './resolvers.js';
import { buildContext } from './context.js';
import logger from '../config/logger.js';

const mapStatus = (code, originalStatus) => {
  if (originalStatus) return originalStatus;
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'BAD_USER_INPUT':
      return 400;
    case 'NOT_FOUND':
      return 404;
    default:
      return 500;
  }
};

const graphqlMiddleware = graphqlHTTP(async (req, res) => ({
  schema,
  rootValue: resolvers,
  context: await buildContext(req),
  graphiql:
    process.env.NODE_ENV !== 'production'
      ? {
          headerEditorEnabled: true
        }
      : false,
  customFormatErrorFn: (error) => {
    const code =
      error.originalError?.extensions?.code ||
      error.extensions?.code ||
      (error.message === 'Authentication required' ? 'UNAUTHENTICATED' : 'INTERNAL_SERVER_ERROR');

    const status =
      error.originalError?.extensions?.statusCode ||
      error.extensions?.statusCode ||
      mapStatus(code, error.originalError?.statusCode);

    if (!res.headersSent) {
      res.status(status);
    }

    if (status >= 500) {
      logger.error('GraphQL internal error', {
        message: error.message,
        code,
        status,
        path: error.path,
        stack: error.originalError?.stack
      });
    }

    return {
      message: error.message,
      code,
      status,
      path: error.path,
      locations: error.locations
    };
  }
}));

export default graphqlMiddleware;

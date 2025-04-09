// src/schemas/schema.graphql
import { MercuriusContext } from 'mercurius';

export const resolvers = {
  Query: {
    currentUser: async (_: any, __: any, context: MercuriusContext) => {
      const { user, userService } = context;
      if (!user) throw new Error('Unauthorized');
      return userService.getCurrentUser(user.id);
    },
  },
  Mutation: {
    signUp: async (_: any, { phone, username, fullName }: any, context: MercuriusContext) => {
      const { userService } = context;
      return userService.signUp(phone, username, fullName);
    },
    signInWithPhone: async (_: any, { phone, otp }: any, context: MercuriusContext) => {
      const { userService } = context;
      return userService.signInWithPhone(phone, otp);
    },
    refreshToken: async (_: any, { refreshToken }: any, context: MercuriusContext) => {
      const { userService } = context;
      return userService.refreshToken(refreshToken);
    },
    logout: async (_: any, __: any, context: MercuriusContext) => {
      const { user, userService } = context;
      if (!user) return true;
      await userService.logout(user.id);
      return true;
    },
    updateDeviceToken: async (_: any, { deviceToken }: any, { user, db }: MercuriusContext) => {
      if (!user) throw new Error('Unauthorized');
      await db.query('UPDATE Users SET device_token = $1 WHERE id = $2', [deviceToken, user.id]);
      return true;
    },
  },
};
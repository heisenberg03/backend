import { UserService } from '../services/userService';

export const resolvers = {
  Query: {
    currentUser: async (_: any, __: any, { user, userService }) => {
      if (!user) throw new Error('Unauthorized');
      return userService.getCurrentUser(user.id);
    },
  },
  Mutation: {
    signUp: async (_: any, { phone, username, fullName }, { userService }) => {
      return userService.signUp(phone, username, fullName);
    },
    signInWithPhone: async (_: any, { phone, otp }, { userService }) => {
      return userService.signInWithPhone(phone, otp);
    },
    logout: async (_: any, __: any, { user, userService, headers }) => {
      if (!user) return true;
      const token = headers.authorization?.split(' ')[1];
      if (token) await userService.logout(token);
      return true;
    },
  },
};
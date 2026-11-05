import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../lib/utils.js';
import { UnauthorizedError } from '../lib/errors.js';
import { deviceService } from '../services/device.service.js';

function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
}

export class AuthController {
  async requestRegistrationOtp(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await authService.requestRegistrationOtp(req.body || {}));
    } catch (err) {
      next(err);
    }
  }

  async verifyLoginOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens, signedOut } = await authService.verifyLoginOtp(req.body || {}, req);
      setSessionCookies(res, tokens);
      return sendSuccess(res, { user, accessToken: tokens.accessToken, signedOut });
    } catch (err) {
      next(err);
    }
  }

  async forgotPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await authService.forgotPasswordOtp(req.body?.identifier));
    } catch (err) {
      next(err);
    }
  }

  async resetPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, await authService.resetPasswordWithOtp(req.body || {}));
    } catch (err) {
      next(err);
    }
  }

  async listDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const devices = await deviceService.list(req.user!.userId);
      return sendSuccess(res, devices.map((d) => ({ ...d, isCurrent: d.id === req.user!.sid })));
    } catch (err) {
      next(err);
    }
  }

  async revokeDevice(req: Request, res: Response, next: NextFunction) {
    try {
      await deviceService.revokeForUser(req.user!.userId, String(req.params.id), 'Signed out by the account owner');
      return sendSuccess(res, { message: 'Device signed out' });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.register(req.body, req);
      setSessionCookies(res, tokens);
      return sendSuccess(res, { user, accessToken: tokens.accessToken }, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, req);
      if (result.otpRequired) {
        // New device: the client shows the OTP step, then calls /auth/login/verify-otp
        const { otpRequired, reason, challengeId, channel, maskedTarget, expiresAt, devCode } = result;
        return sendSuccess(res, { otpRequired, reason, challengeId, channel, maskedTarget, expiresAt, devCode });
      }
      setSessionCookies(res, result.tokens);
      return sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken, signedOut: result.signedOut });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.body;
      const result = await authService.forgotPassword(identifier);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('Authentication required');
      }
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const { user, tokens } = await authService.refreshToken(token);
      setSessionCookies(res, tokens);

      return sendSuccess(res, { user, accessToken: tokens.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      await authService.logout(token);
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async logoutEverywhere(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }
      const result = await authService.logoutEverywhere(req.user.userId);
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await authService.getMe(req.user.userId);
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

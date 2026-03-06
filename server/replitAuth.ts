import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log("[Auth] Upserting user with claims:", JSON.stringify(claims, null, 2));
  const userData: any = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  
  // Automatically assign admin role to designated testing admin emails
  const testingAdminEmails = [
    "frank.quesada@gmail.com",
    "binhaks@binhaklaw.com",
    "zoinertejada@gmail.com",
    "charliewhorton@gmail.com",
    "rjb@borgheselaw.com",
  ];
  
  if (testingAdminEmails.includes(claims["email"])) {
    userData.role = "admin";
    console.log("[Auth] Assigning admin role to testing admin:", claims["email"]);
  } else if (claims["role"]) {
    // Add role if provided in claims (for other testing purposes)
    userData.role = claims["role"];
  }
  
  console.log("[Auth] User data to upsert:", JSON.stringify(userData, null, 2));
  const result = await storage.upsertUser(userData);
  console.log("[Auth] Upserted user result:", JSON.stringify(result, null, 2));
  return result;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Replit OIDC Auth - only available when running on Replit
  let config: Awaited<ReturnType<typeof getOidcConfig>> | null = null;
  const registeredStrategies = new Set<string>();

  if (process.env.REPL_ID) {
    config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const dbUser = await upsertUser(tokens.claims());
      updateUserSession(dbUser, tokens);
      verified(null, dbUser);
    };

    // Helper function to ensure strategy exists for a domain
    const ensureStrategy = (domain: string) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config: config!,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };

    app.get("/api/login", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config!, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });

    console.log("[Auth] Replit OIDC auth configured");
  } else {
    console.log("[Auth] REPL_ID not found - Replit OIDC disabled, using Microsoft OAuth only");

    // Fallback login/logout routes when not on Replit
    app.get("/api/login", (req, res) => {
      if (process.env.MICROSOFT_CLIENT_ID) {
        res.redirect("/api/auth/microsoft");
      } else {
        res.status(501).json({ message: "No auth provider configured" });
      }
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
  }

  // Microsoft OAuth Strategy - works on any platform
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "/api/auth/microsoft/callback",
        scope: ['user.read']
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Check if user exists with this Microsoft ID
          let user = await storage.getUserByMicrosoftId(profile.id);

          if (!user) {
            // Check if a user with this email already exists (account linking)
            const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value);

            if (existingUser) {
              // Link Microsoft account to existing user
              user = await storage.updateUser(existingUser.id, {
                microsoftId: profile.id
              });
            } else {
              // Create new user
              const userData = {
                id: profile.id,
                email: profile.emails?.[0]?.value,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                microsoftId: profile.id,
                profileImageUrl: null,
              };
              user = await storage.createUser(userData);
            }
          }

          // Update session with Microsoft tokens
          const userWithTokens = {
            ...user,
            access_token: accessToken,
            refresh_token: refreshToken,
            claims: { sub: user.id, email: user.email },
            expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          };

          done(null, userWithTokens);
        } catch (error) {
          console.error('[Microsoft Auth] Error:', error);
          done(error as Error);
        }
      }
    ));

    app.get("/api/auth/microsoft",
      passport.authenticate("microsoft", {
        scope: ["user.read"]
      })
    );

    app.get("/api/auth/microsoft/callback",
      passport.authenticate("microsoft", {
        failureRedirect: "/api/login"
      }),
      (req, res) => {
        // Successful authentication, redirect to home
        res.redirect("/");
      }
    );

    console.log("[Auth] Microsoft OAuth configured");
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Ensure DB user exists (handles OIDC mock tests and missing users)
    try {
      const userId = user.claims?.sub || user.id;
      if (userId) {
        let dbUser = await storage.getUser(userId);
        
        // Auto-create user if authenticated but not in DB (e.g., OIDC mock tests)
        if (!dbUser && user.claims) {
          console.log("[Auth] isAuthenticated: User authenticated but not in DB, auto-upserting");
          dbUser = await upsertUser(user.claims);
        }
        
        // Attach DB user to request for downstream middleware
        (req as any).dbUser = dbUser;
      }
    } catch (error) {
      console.error("[Auth] isAuthenticated: Error ensuring user exists:", error);
    }
    
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based authorization middleware
export function requireRole(...roles: string[]): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    
    if (!req.isAuthenticated()) {
      console.log("[Auth] requireRole: User not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Use dbUser attached by isAuthenticated middleware, or fetch if missing
      let dbUser = (req as any).dbUser;
      
      if (!dbUser) {
        const userId = user.claims?.sub || user.id;
        console.log("[Auth] requireRole: dbUser not attached, fetching for user ID:", userId);
        dbUser = await storage.getUser(userId);
      }
      
      console.log("[Auth] requireRole: DB user found:", dbUser ? JSON.stringify(dbUser, null, 2) : "NULL");
      
      if (!dbUser) {
        console.log("[Auth] requireRole: User not found in database");
        return res.status(401).json({ message: "User not found" });
      }

      if (!roles.includes(dbUser.role)) {
        console.log("[Auth] requireRole: User role", dbUser.role, "not in allowed roles:", roles);
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      console.log("[Auth] requireRole: Authorization successful for user", dbUser.id, "with role", dbUser.role);
      next();
    } catch (error) {
      console.error("[Auth] requireRole: Error during authorization:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
}

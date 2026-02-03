# Authentication System

## Overview

Simple username/password authentication system for Lazy Cook. No email verification needed for this POC.

## Features

- **User Registration**: Create new accounts with username and password
- **Login**: Authenticate with username and password
- **Session Management**: JWT-based sessions stored in HTTP-only cookies
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Logout**: Clear session and redirect to login

## Technical Details

### Security
- Passwords are hashed using bcryptjs with 10 salt rounds
- JWT tokens signed with HS256 algorithm
- HTTP-only cookies prevent XSS attacks
- 7-day session expiration
- Secure cookies in production (HTTPS only)

### Database Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "username": "myusername",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "myusername"
  }
}
```

**Validation:**
- Username must be at least 3 characters
- Password must be at least 6 characters
- Username must be unique

#### POST /api/auth/login
Authenticate a user.

**Request:**
```json
{
  "username": "myusername",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "myusername"
  }
}
```

#### POST /api/auth/logout
Clear user session.

**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/check
Check if user is authenticated.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "myusername"
  }
}
```

### Middleware

The middleware (`src/middleware.ts`) handles:
- Redirecting unauthenticated users to `/auth/login`
- Redirecting authenticated users away from `/auth/*` pages
- Protecting all routes except auth pages and API endpoints

### Environment Variables

Optional JWT secret (defaults to development key):
```env
JWT_SECRET=your-secret-key-change-in-production
```

**Important:** Change this in production!

## Usage

### First Time Setup
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You'll be redirected to `/auth/login`
4. Click "Register here" to create an account
5. After registration, you'll be automatically logged in

### Accessing the App
- All routes require authentication
- Session persists for 7 days
- Click the logout button (top right) to sign out

## Files Created

### Core Authentication
- `src/lib/auth.ts` - Authentication utilities and helpers
- `src/middleware.ts` - Route protection middleware

### API Routes
- `src/app/api/auth/register/route.ts` - User registration
- `src/app/api/auth/login/route.ts` - User login
- `src/app/api/auth/logout/route.ts` - User logout
- `src/app/api/auth/check/route.ts` - Session check

### UI Pages
- `src/app/auth/login/page.tsx` - Login page
- `src/app/auth/register/page.tsx` - Registration page
- `src/app/auth/layout.tsx` - Auth pages layout

### Styling
- Updated `src/app/globals.css` - Added user menu styles

## Dependencies Added

```json
{
  "bcryptjs": "^2.4.3",
  "@types/bcryptjs": "^2.4.6",
  "jose": "^5.2.0"
}
```

- **bcryptjs**: Password hashing
- **jose**: JWT token creation and verification
- **@types/bcryptjs**: TypeScript types for bcryptjs

## Future Enhancements (Optional)

- Email verification
- Password reset functionality
- Remember me functionality
- Two-factor authentication
- User profile management
- Social login (Google, GitHub, etc.)
- Rate limiting on login attempts

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Middleware to verify Supabase JWT tokens and attach user data to request
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user metadata including role from the user table
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('id, email, nama, role, status')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      console.error('User data fetch failed:', userError);
      return res.status(401).json({ 
        error: 'User not found in system',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active (can be 'active' or 'aktif')
    if (userData.status !== 'active' && userData.status !== 'aktif') {
      return res.status(403).json({ 
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user data to request object
    req.user = {
      ...userData,
      supabaseId: user.id,
      email: user.email
    };
    
    console.log('🔐 USER AUTHENTICATED:', {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

/**
 * Middleware to check if user has manager role
 */
const requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({ 
      error: 'Manager access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

/**
 * Middleware to check if user has admin or manager role
 */
const requireAdminOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Admin or Manager access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireManager,
  requireAdminOrManager
};
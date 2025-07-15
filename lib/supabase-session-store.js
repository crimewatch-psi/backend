const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase-based session store for express-session
 * This provides a production-ready session store using Supabase as the backend
 */
class SupabaseSessionStore {
  constructor(options = {}) {
    this.options = {
      tableName: options.tableName || 'sessions',
      ttl: options.ttl || 1000 * 60 * 60 * 24 * 7, // 7 days default
      ...options
    };

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Create sessions table if it doesn't exist
    this.initializeTable();
  }

  /**
   * Initialize the sessions table in Supabase
   */
  async initializeTable() {
    try {
      // Check if table exists by trying to select from it
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, create it
        console.log('Creating sessions table...');
        // Note: You'll need to create this table manually in Supabase
        // or use a migration script
        console.warn('Sessions table needs to be created manually in Supabase');
      }
    } catch (error) {
      console.error('Error initializing sessions table:', error);
    }
  }

  /**
   * Get session by ID
   */
  async get(sessionId, callback) {
    try {
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .select('session_data, expires_at')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No session found
          return callback(null, null);
        }
        return callback(error);
      }

      // Check if session is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Session expired, delete it
        await this.destroy(sessionId, () => {});
        return callback(null, null);
      }

      // Parse session data
      const sessionData = JSON.parse(data.session_data);
      callback(null, sessionData);
    } catch (error) {
      console.error('Error getting session:', error);
      callback(error);
    }
  }

  /**
   * Set session
   */
  async set(sessionId, sessionData, callback) {
    try {
      const expiresAt = new Date(Date.now() + this.options.ttl);
      const sessionDataString = JSON.stringify(sessionData);

      const { error } = await this.supabase
        .from(this.options.tableName)
        .upsert({
          session_id: sessionId,
          session_data: sessionDataString,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error setting session:', error);
        return callback(error);
      }

      callback(null);
    } catch (error) {
      console.error('Error setting session:', error);
      callback(error);
    }
  }

  /**
   * Destroy session
   */
  async destroy(sessionId, callback) {
    try {
      const { error } = await this.supabase
        .from(this.options.tableName)
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error destroying session:', error);
        return callback(error);
      }

      callback(null);
    } catch (error) {
      console.error('Error destroying session:', error);
      callback(error);
    }
  }

  /**
   * Touch session (update expiration)
   */
  async touch(sessionId, sessionData, callback) {
    try {
      const expiresAt = new Date(Date.now() + this.options.ttl);

      const { error } = await this.supabase
        .from(this.options.tableName)
        .update({
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error touching session:', error);
        return callback(error);
      }

      callback(null);
    } catch (error) {
      console.error('Error touching session:', error);
      callback(error);
    }
  }

  /**
   * Get all sessions (optional method)
   */
  async all(callback) {
    try {
      const { data, error } = await this.supabase
        .from(this.options.tableName)
        .select('session_id, session_data, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        return callback(error);
      }

      const sessions = {};
      data.forEach(row => {
        sessions[row.session_id] = JSON.parse(row.session_data);
      });

      callback(null, sessions);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      callback(error);
    }
  }

  /**
   * Clear all sessions
   */
  async clear(callback) {
    try {
      const { error } = await this.supabase
        .from(this.options.tableName)
        .delete()
        .neq('session_id', 'dummy'); // Delete all

      if (error) {
        console.error('Error clearing sessions:', error);
        return callback(error);
      }

      callback(null);
    } catch (error) {
      console.error('Error clearing sessions:', error);
      callback(error);
    }
  }

  /**
   * Get session count
   */
  async length(callback) {
    try {
      const { count, error } = await this.supabase
        .from(this.options.tableName)
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());

      if (error) {
        return callback(error);
      }

      callback(null, count);
    } catch (error) {
      console.error('Error getting session count:', error);
      callback(error);
    }
  }
}

module.exports = SupabaseSessionStore;
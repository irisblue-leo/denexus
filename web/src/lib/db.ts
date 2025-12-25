import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_MODE === "require" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

// Initialize database tables
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        credits INTEGER DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video_tasks table (Generate Video)
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        product_images TEXT[],
        reference_video_url TEXT,
        selling_points TEXT,
        size VARCHAR(20) DEFAULT 'portrait',
        duration VARCHAR(20) DEFAULT '15s',
        quality VARCHAR(20) DEFAULT 'sd',
        language VARCHAR(10) DEFAULT 'en',
        credits_cost INTEGER DEFAULT 10,
        result_url TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sora2_tasks table (Sora2 Video Generation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sora2_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        product_image TEXT,
        prompt TEXT NOT NULL,
        size VARCHAR(20) DEFAULT 'portrait',
        duration VARCHAR(20) DEFAULT '15s',
        quality VARCHAR(20) DEFAULT 'sd',
        quantity INTEGER DEFAULT 1,
        credits_cost INTEGER DEFAULT 5,
        result_urls TEXT[],
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nano_banana_tasks table (Nano Banana Image)
    await client.query(`
      CREATE TABLE IF NOT EXISTS nano_banana_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        product_images TEXT[],
        prompt TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        credits_cost INTEGER DEFAULT 2,
        result_urls TEXT[],
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create gemini3_reverse_tasks table (Gemini3 Reverse Prompt)
    await client.query(`
      CREATE TABLE IF NOT EXISTS gemini3_reverse_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        mode VARCHAR(20) DEFAULT 'video',
        source_url TEXT NOT NULL,
        credits_cost INTEGER DEFAULT 2,
        result_prompt TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create runway_tasks table (Video-to-Video Generation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS runway_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        source_video_url TEXT NOT NULL,
        text_prompt TEXT,
        structure_transformation DECIMAL(3,2) DEFAULT 0.5,
        credits_cost INTEGER DEFAULT 5,
        result_url TEXT,
        error_message TEXT,
        external_task_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create influencer_tasks table (Create Task for influencer cooperation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS influencer_tasks (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'draft',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        requirements TEXT,
        budget DECIMAL(10,2),
        deadline TIMESTAMP,
        category VARCHAR(50),
        applications_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create influencer_applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS influencer_applications (
        id VARCHAR(50) PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL REFERENCES influencer_tasks(id),
        influencer_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create credit_packages table (pricing plans)
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_packages (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        description TEXT,
        description_en TEXT,
        credits INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        is_popular BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        package_id VARCHAR(50) REFERENCES credit_packages(id),
        credits INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(20) DEFAULT 'wechat',
        transaction_id VARCHAR(100),
        paid_at TIMESTAMP,
        expire_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        source VARCHAR(50),
        filename VARCHAR(255),
        url TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        mime_type VARCHAR(100),
        width INTEGER,
        height INTEGER,
        thumbnail_url TEXT,
        task_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create credit_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        description TEXT,
        task_id VARCHAR(50),
        task_type VARCHAR(50),
        order_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_video_tasks_user ON video_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sora2_tasks_user ON sora2_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nano_banana_tasks_user ON nano_banana_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gemini3_reverse_tasks_user ON gemini3_reverse_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_runway_tasks_user ON runway_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_influencer_tasks_user ON influencer_tasks(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_influencer_applications_task ON influencer_applications(task_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_source ON assets(source)`);

    // Insert default credit packages if not exist
    await client.query(`
      INSERT INTO credit_packages (id, name, name_en, description, description_en, credits, price, original_price, is_popular, sort_order, is_active)
      VALUES
        ('pkg_free', '免费版', 'Free', '适合体验与测试', 'For testing and exploration', 20, 0, 0, FALSE, 1, TRUE),
        ('pkg_starter', '初创版', 'Starter', '适合个人卖家与起步阶段', 'For individual sellers', 100, 49, 69, FALSE, 2, TRUE),
        ('pkg_pro', '专业版', 'Pro', '适合规模化运营团队', 'For scaling teams', 500, 199, 299, TRUE, 3, TRUE)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// ==================== User Operations ====================
export interface DbUser {
  id: string;
  phone?: string | null;
  email?: string | null;
  password?: string | null;
  credits: number;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(data: {
  id: string;
  phone?: string;
  email?: string;
  password?: string;
}): Promise<DbUser> {
  const result = await pool.query(
    `INSERT INTO users (id, phone, email, password, credits)
     VALUES ($1, $2, $3, $4, 20)
     RETURNING *`,
    [data.id, data.phone || null, data.email || null, data.password || null]
  );
  return result.rows[0];
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function findUserByPhone(phone: string): Promise<DbUser | null> {
  const result = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
  return result.rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
}

export async function findUserByEmailOrPhone(identifier: string): Promise<DbUser | null> {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR phone = $1",
    [identifier]
  );
  return result.rows[0] || null;
}

export async function updateUserCredits(userId: string, credits: number): Promise<void> {
  await pool.query(
    "UPDATE users SET credits = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [credits, userId]
  );
}

export async function deductUserCredits(userId: string, amount: number): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users SET credits = credits - $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND credits >= $1
     RETURNING credits`,
    [amount, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ==================== Video Task Operations ====================
export interface DbVideoTask {
  id: string;
  user_id: string;
  status: string;
  product_images: string[] | null;
  reference_video_url: string | null;
  selling_points: string | null;
  size: string;
  duration: string;
  quality: string;
  language: string;
  credits_cost: number;
  result_url: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createVideoTask(data: {
  id: string;
  userId: string;
  productImages?: string[];
  referenceVideoUrl?: string;
  sellingPoints?: string;
  prompt?: string;
  size?: string;
  duration?: string;
  quality?: string;
  language?: string;
  creditsCost?: number;
}): Promise<DbVideoTask> {
  // Use prompt if provided, otherwise fallback to sellingPoints
  const promptValue = data.prompt || data.sellingPoints || null;
  const result = await pool.query(
    `INSERT INTO video_tasks (id, user_id, product_images, reference_video_url, selling_points, size, duration, quality, language, credits_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.productImages || null,
      data.referenceVideoUrl || null,
      promptValue,
      data.size || 'portrait',
      data.duration || '5s',
      data.quality || 'std',
      data.language || 'en',
      data.creditsCost || 3,
    ]
  );
  return result.rows[0];
}

export async function getVideoTasksByUser(userId: string, limit = 20, offset = 0): Promise<DbVideoTask[]> {
  const result = await pool.query(
    `SELECT * FROM video_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateVideoTaskStatus(id: string, status: string, resultUrls?: string[], errorMessage?: string): Promise<void> {
  // Store first URL in result_url field for compatibility, or JSON array if multiple
  const resultUrl = resultUrls && resultUrls.length > 0 ? resultUrls[0] : null;
  await pool.query(
    `UPDATE video_tasks SET status = $1, result_url = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [status, resultUrl, errorMessage || null, id]
  );
}

// ==================== Sora2 Task Operations ====================
export interface DbSora2Task {
  id: string;
  user_id: string;
  status: string;
  product_image: string | null;
  prompt: string;
  size: string;
  duration: string;
  quality: string;
  quantity: number;
  credits_cost: number;
  result_urls: string[] | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createSora2Task(data: {
  id: string;
  userId: string;
  productImage?: string;
  prompt: string;
  size?: string;
  duration?: string;
  quality?: string;
  quantity?: number;
  creditsCost?: number;
}): Promise<DbSora2Task> {
  const result = await pool.query(
    `INSERT INTO sora2_tasks (id, user_id, product_image, prompt, size, duration, quality, quantity, credits_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.productImage || null,
      data.prompt,
      data.size || 'portrait',
      data.duration || '15s',
      data.quality || 'sd',
      data.quantity || 1,
      data.creditsCost || 5,
    ]
  );
  return result.rows[0];
}

export async function getSora2TasksByUser(userId: string, limit = 20, offset = 0): Promise<DbSora2Task[]> {
  const result = await pool.query(
    `SELECT * FROM sora2_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateSora2TaskStatus(id: string, status: string, resultUrls?: string[], errorMessage?: string): Promise<void> {
  await pool.query(
    `UPDATE sora2_tasks SET status = $1, result_urls = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [status, resultUrls || null, errorMessage || null, id]
  );
}

// ==================== Nano Banana Task Operations ====================
export interface DbNanoBananaTask {
  id: string;
  user_id: string;
  status: string;
  product_images: string[] | null;
  prompt: string;
  quantity: number;
  credits_cost: number;
  result_urls: string[] | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createNanoBananaTask(data: {
  id: string;
  userId: string;
  productImages?: string[];
  prompt: string;
  quantity?: number;
  creditsCost?: number;
}): Promise<DbNanoBananaTask> {
  const result = await pool.query(
    `INSERT INTO nano_banana_tasks (id, user_id, product_images, prompt, quantity, credits_cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.productImages || null,
      data.prompt,
      data.quantity || 1,
      data.creditsCost || 2,
    ]
  );
  return result.rows[0];
}

export async function getNanoBananaTasksByUser(userId: string, limit = 20, offset = 0): Promise<DbNanoBananaTask[]> {
  const result = await pool.query(
    `SELECT * FROM nano_banana_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateNanoBananaTaskStatus(id: string, status: string, resultUrls?: string[], errorMessage?: string): Promise<void> {
  await pool.query(
    `UPDATE nano_banana_tasks SET status = $1, result_urls = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [status, resultUrls || null, errorMessage || null, id]
  );
}

// ==================== Gemini3 Reverse Task Operations ====================
export interface DbGemini3ReverseTask {
  id: string;
  user_id: string;
  status: string;
  mode: string;
  source_url: string;
  credits_cost: number;
  result_prompt: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createGemini3ReverseTask(data: {
  id: string;
  userId: string;
  mode: string;
  sourceUrl: string;
  creditsCost?: number;
}): Promise<DbGemini3ReverseTask> {
  const result = await pool.query(
    `INSERT INTO gemini3_reverse_tasks (id, user_id, mode, source_url, credits_cost)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.id, data.userId, data.mode, data.sourceUrl, data.creditsCost || 2]
  );
  return result.rows[0];
}

export async function getGemini3ReverseTasksByUser(userId: string, limit = 20, offset = 0): Promise<DbGemini3ReverseTask[]> {
  const result = await pool.query(
    `SELECT * FROM gemini3_reverse_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateGemini3ReverseTaskStatus(id: string, status: string, resultPrompt?: string, errorMessage?: string): Promise<void> {
  await pool.query(
    `UPDATE gemini3_reverse_tasks SET status = $1, result_prompt = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [status, resultPrompt || null, errorMessage || null, id]
  );
}

// ==================== Task Delete Operations ====================
export async function deleteVideoTask(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM video_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteSora2Task(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM sora2_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteNanoBananaTask(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM nano_banana_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteGemini3ReverseTask(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM gemini3_reverse_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ==================== Influencer Task Operations ====================
export interface DbInfluencerTask {
  id: string;
  user_id: string;
  status: string;
  title: string;
  description: string | null;
  requirements: string | null;
  budget: number | null;
  deadline: Date | null;
  category: string | null;
  applications_count: number;
  created_at: Date;
  updated_at: Date;
}

export async function createInfluencerTask(data: {
  id: string;
  userId: string;
  title: string;
  description?: string;
  requirements?: string;
  budget?: number;
  deadline?: Date;
  category?: string;
}): Promise<DbInfluencerTask> {
  const result = await pool.query(
    `INSERT INTO influencer_tasks (id, user_id, title, description, requirements, budget, deadline, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.title,
      data.description || null,
      data.requirements || null,
      data.budget || null,
      data.deadline || null,
      data.category || null,
    ]
  );
  return result.rows[0];
}

export async function getInfluencerTasksByUser(userId: string, limit = 20, offset = 0): Promise<DbInfluencerTask[]> {
  const result = await pool.query(
    `SELECT * FROM influencer_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateInfluencerTaskStatus(id: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE influencer_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [status, id]
  );
}

// ==================== Helper Functions ====================
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateOrderNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `DN${dateStr}${random}`;
}

// ==================== Credit Package Operations ====================
export interface DbCreditPackage {
  id: string;
  name: string;
  name_en: string;
  description: string | null;
  description_en: string | null;
  credits: number;
  price: number;
  original_price: number | null;
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getActivePackages(): Promise<DbCreditPackage[]> {
  const result = await pool.query(
    `SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY sort_order ASC`
  );
  return result.rows;
}

export async function getPackageById(id: string): Promise<DbCreditPackage | null> {
  const result = await pool.query(
    `SELECT * FROM credit_packages WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ==================== Order Operations ====================
export interface DbOrder {
  id: string;
  order_no: string;
  user_id: string;
  package_id: string | null;
  credits: number;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  paid_at: Date | null;
  expire_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function createOrder(data: {
  id: string;
  orderNo: string;
  userId: string;
  packageId?: string;
  credits: number;
  amount: number;
  paymentMethod?: string;
}): Promise<DbOrder> {
  // Order expires in 30 minutes
  const expireAt = new Date(Date.now() + 30 * 60 * 1000);
  const result = await pool.query(
    `INSERT INTO orders (id, order_no, user_id, package_id, credits, amount, payment_method, expire_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.id,
      data.orderNo,
      data.userId,
      data.packageId || null,
      data.credits,
      data.amount,
      data.paymentMethod || "wechat",
      expireAt,
    ]
  );
  return result.rows[0];
}

export async function getOrderByOrderNo(orderNo: string): Promise<DbOrder | null> {
  const result = await pool.query(
    `SELECT * FROM orders WHERE order_no = $1`,
    [orderNo]
  );
  return result.rows[0] || null;
}

export async function getOrderById(id: string): Promise<DbOrder | null> {
  const result = await pool.query(
    `SELECT * FROM orders WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getOrdersByUser(userId: string, limit = 20, offset = 0): Promise<DbOrder[]> {
  const result = await pool.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateOrderStatus(
  orderNo: string,
  status: string,
  transactionId?: string
): Promise<DbOrder | null> {
  const paidAt = status === "paid" ? new Date() : null;
  const result = await pool.query(
    `UPDATE orders
     SET status = $1, transaction_id = $2, paid_at = $3, updated_at = CURRENT_TIMESTAMP
     WHERE order_no = $4
     RETURNING *`,
    [status, transactionId || null, paidAt, orderNo]
  );
  return result.rows[0] || null;
}

export async function addUserCredits(userId: string, credits: number): Promise<void> {
  await pool.query(
    `UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [credits, userId]
  );
}

// ==================== Asset Operations ====================
export interface DbAsset {
  id: string;
  user_id: string;
  type: string;
  source: string | null;
  filename: string | null;
  url: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  task_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createAsset(data: {
  id: string;
  userId: string;
  type: string;
  source?: string;
  filename?: string;
  url: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  taskId?: string;
}): Promise<DbAsset> {
  const result = await pool.query(
    `INSERT INTO assets (id, user_id, type, source, filename, url, file_path, file_size, mime_type, width, height, thumbnail_url, task_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.type,
      data.source || null,
      data.filename || null,
      data.url,
      data.filePath || null,
      data.fileSize || null,
      data.mimeType || null,
      data.width || null,
      data.height || null,
      data.thumbnailUrl || null,
      data.taskId || null,
    ]
  );
  return result.rows[0];
}

export interface GetAssetsOptions {
  userId: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetAssetsResult {
  assets: DbAsset[];
  total: number;
}

export async function getAssetsByUser(
  options: GetAssetsOptions
): Promise<GetAssetsResult> {
  const { userId, type, startDate, endDate, limit = 20, offset = 0 } = options;

  // Build WHERE conditions
  const conditions: string[] = ["user_id = $1"];
  const params: (string | number)[] = [userId];
  let paramIndex = 2;

  if (type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    // Add one day to include the end date fully
    conditions.push(`created_at < $${paramIndex}::date + interval '1 day'`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM assets WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  const result = await pool.query(
    `SELECT * FROM assets WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    assets: result.rows,
    total,
  };
}

export async function getAssetById(id: string): Promise<DbAsset | null> {
  const result = await pool.query(`SELECT * FROM assets WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function deleteAsset(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM assets WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getAssetCountByUser(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM assets WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// ==================== Credit Transaction Operations ====================
export interface DbCreditTransaction {
  id: string;
  user_id: string;
  type: string; // 'purchase' | 'usage' | 'refund' | 'bonus'
  amount: number; // positive for credit, negative for debit
  balance_after: number;
  description: string | null;
  task_id: string | null;
  task_type: string | null;
  order_id: string | null;
  created_at: Date;
}

export async function createCreditTransaction(data: {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  taskId?: string;
  taskType?: string;
  orderId?: string;
}): Promise<DbCreditTransaction> {
  const result = await pool.query(
    `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, task_id, task_type, order_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.type,
      data.amount,
      data.balanceAfter,
      data.description || null,
      data.taskId || null,
      data.taskType || null,
      data.orderId || null,
    ]
  );
  return result.rows[0];
}

export async function getCreditTransactionsByUser(
  userId: string,
  limit = 20,
  offset = 0
): Promise<DbCreditTransaction[]> {
  const result = await pool.query(
    `SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function getCreditTransactionCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM credit_transactions WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// Refund credits to user and create a transaction record
export async function refundCredits(data: {
  userId: string;
  amount: number;
  description: string;
  taskId: string;
  taskType: string;
}): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add credits back to user
    const userResult = await client.query(
      `UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING credits`,
      [data.amount, data.userId]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const newBalance = userResult.rows[0].credits;

    // Create transaction record
    await client.query(
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, task_id, task_type)
       VALUES ($1, $2, 'refund', $3, $4, $5, $6, $7)`,
      [
        generateId("txn"),
        data.userId,
        data.amount,
        newBalance,
        data.description,
        data.taskId,
        data.taskType,
      ]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to refund credits:", error);
    return false;
  } finally {
    client.release();
  }
}

// Deduct credits with transaction record
export async function deductCreditsWithTransaction(data: {
  userId: string;
  amount: number;
  description: string;
  taskId: string;
  taskType: string;
}): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Deduct credits from user
    const userResult = await client.query(
      `UPDATE users SET credits = credits - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND credits >= $1 RETURNING credits`,
      [data.amount, data.userId]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const newBalance = userResult.rows[0].credits;

    // Create transaction record
    await client.query(
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, task_id, task_type)
       VALUES ($1, $2, 'usage', $3, $4, $5, $6, $7)`,
      [
        generateId("txn"),
        data.userId,
        -data.amount, // negative for debit
        newBalance,
        data.description,
        data.taskId,
        data.taskType,
      ]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to deduct credits:", error);
    return false;
  } finally {
    client.release();
  }
}

// ==================== Task Count Operations ====================
export async function getSora2TaskCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM sora2_tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getNanoBananaTaskCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM nano_banana_tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getGemini3ReverseTaskCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM gemini3_reverse_tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getVideoTaskCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM video_tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// ==================== Batch Delete Operations ====================
export async function deleteSora2Tasks(ids: string[], userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM sora2_tasks WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  );
  return result.rowCount || 0;
}

export async function deleteNanoBananaTasks(ids: string[], userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM nano_banana_tasks WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  );
  return result.rowCount || 0;
}

export async function deleteGemini3ReverseTasks(ids: string[], userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM gemini3_reverse_tasks WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  );
  return result.rowCount || 0;
}

export async function deleteVideoTasks(ids: string[], userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM video_tasks WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  );
  return result.rowCount || 0;
}

// Get task by ID for refund check
export async function getSora2TaskById(id: string): Promise<DbSora2Task | null> {
  const result = await pool.query(`SELECT * FROM sora2_tasks WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function getNanoBananaTaskById(id: string): Promise<DbNanoBananaTask | null> {
  const result = await pool.query(`SELECT * FROM nano_banana_tasks WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function getGemini3ReverseTaskById(id: string): Promise<DbGemini3ReverseTask | null> {
  const result = await pool.query(`SELECT * FROM gemini3_reverse_tasks WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

// ==================== Runway Task Operations ====================
export interface DbRunwayTask {
  id: string;
  user_id: string;
  status: string;
  source_video_url: string;
  text_prompt: string | null;
  structure_transformation: number;
  credits_cost: number;
  result_url: string | null;
  error_message: string | null;
  external_task_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createRunwayTask(data: {
  id: string;
  userId: string;
  sourceVideoUrl: string;
  textPrompt?: string;
  structureTransformation?: number;
  creditsCost?: number;
  externalTaskId?: string;
}): Promise<DbRunwayTask> {
  const result = await pool.query(
    `INSERT INTO runway_tasks (id, user_id, source_video_url, text_prompt, structure_transformation, credits_cost, external_task_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.id,
      data.userId,
      data.sourceVideoUrl,
      data.textPrompt || null,
      data.structureTransformation || 0.5,
      data.creditsCost || 5,
      data.externalTaskId || null,
    ]
  );
  return result.rows[0];
}

export async function getRunwayTasksByUser(userId: string, limit = 20, offset = 0): Promise<DbRunwayTask[]> {
  const result = await pool.query(
    `SELECT * FROM runway_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function getRunwayTaskCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM runway_tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function updateRunwayTaskStatus(
  id: string,
  status: string,
  resultUrl?: string,
  errorMessage?: string,
  externalTaskId?: string
): Promise<void> {
  await pool.query(
    `UPDATE runway_tasks SET status = $1, result_url = $2, error_message = $3, external_task_id = COALESCE($4, external_task_id), updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
    [status, resultUrl || null, errorMessage || null, externalTaskId || null, id]
  );
}

export async function deleteRunwayTask(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM runway_tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteRunwayTasks(ids: string[], userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM runway_tasks WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  );
  return result.rowCount || 0;
}

export async function getRunwayTaskById(id: string): Promise<DbRunwayTask | null> {
  const result = await pool.query(`SELECT * FROM runway_tasks WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

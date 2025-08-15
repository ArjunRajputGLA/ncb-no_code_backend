const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const chokidar = require('chokidar');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active project watchers
const projectWatchers = new Map();

// API Routes
app.post('/api/create-project', async (req, res) => {
  try {
    const { projectName, location, workflow, framework, database, language } = req.body;
    const projectPath = path.join(location, projectName);

    // Create project directory
    await fs.ensureDir(projectPath);

    // Generate project structure based on workflow and selections
    await generateProjectStructure(projectPath, { workflow, framework, database, language });

    // Install dependencies
    await installDependencies(projectPath);

    // Start watching the project for changes
    startProjectWatcher(projectPath, projectName);

    res.json({ 
      success: true, 
      message: 'Project created successfully',
      projectPath 
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/update-workflow', async (req, res) => {
  try {
    const { projectPath, workflow } = req.body;
    
    // Update project files based on new workflow
    await updateProjectFiles(projectPath, workflow);
    
    res.json({ 
      success: true, 
      message: 'Workflow updated successfully' 
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/project-status/:projectName', (req, res) => {
  const { projectName } = req.params;
  const isWatching = projectWatchers.has(projectName);
  
  res.json({ 
    isWatching,
    projectName 
  });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-project', (projectName) => {
    socket.join(projectName);
    console.log(`Client ${socket.id} joined project: ${projectName}`);
  });

  socket.on('workflow-change', async (data) => {
    try {
      const { projectPath, workflow, projectName } = data;
      await updateProjectFiles(projectPath, workflow);
      
      // Notify all clients in this project room
      socket.to(projectName).emit('project-updated', {
        message: 'Project files updated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function generateProjectStructure(projectPath, projectData) {
  const { workflow, framework, database, language } = projectData;
  
  // Create package.json with framework and database specific dependencies
  const packageJson = {
    name: path.basename(projectPath),
    version: "1.0.0",
    description: "Auto-generated no-code backend",
    main: "index.js",
    scripts: {
      start: "node index.js",
      dev: "nodemon index.js",
      test: "echo \"Error: no test specified\" && exit 1"
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      dotenv: "^16.3.1"
    },
    devDependencies: {
      nodemon: "^3.0.1"
    }
  };

  // Add framework-specific dependencies
  const frameworkDeps = getFrameworkDependencies(framework, language);
  Object.assign(packageJson.dependencies, frameworkDeps);

  // Add database-specific dependencies
  const databaseDeps = getDatabaseDependencies(database);
  Object.assign(packageJson.dependencies, databaseDeps);

  // Analyze workflow to add specific dependencies
  const workflowDeps = analyzeWorkflowDependencies(workflow);
  Object.assign(packageJson.dependencies, workflowDeps);

  await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  // Create main server file
  const serverCode = generateServerCode(workflow, framework, database, language);
  await fs.writeFile(path.join(projectPath, 'index.js'), serverCode);

  // Create .env file
  const envContent = generateEnvFile(workflow, database);
  await fs.writeFile(path.join(projectPath, '.env'), envContent);

  // Create additional files based on workflow and framework
  await generateWorkflowFiles(projectPath, workflow, framework, language);
}

function analyzeWorkflowDependencies(workflow) {
  const dependencies = {};
  
  workflow.nodes?.forEach(node => {
    switch (node.type) {
      case 'database':
        if (node.data.dbType === 'mongodb') {
          dependencies.mongoose = '^7.5.0';
        } else if (node.data.dbType === 'mysql') {
          dependencies.mysql2 = '^3.6.0';
        } else if (node.data.dbType === 'postgresql') {
          dependencies.pg = '^8.11.3';
        }
        break;
      case 'auth':
        dependencies.jsonwebtoken = '^9.0.2';
        dependencies.bcryptjs = '^2.4.3';
        break;
      case 'api':
        // Express is already included
        break;
      case 'storage':
        dependencies.multer = '^1.4.5-lts.1';
        if (node.data.storageType === 'aws') {
          dependencies['aws-sdk'] = '^2.1467.0';
        }
        break;
      case 'email':
        dependencies.nodemailer = '^6.9.5';
        break;
      case 'payment':
        if (node.data.provider === 'stripe') {
          dependencies.stripe = '^13.5.0';
        }
        break;
    }
  });

  return dependencies;
}

function getFrameworkDependencies(framework, language) {
  const dependencies = {};
  
  if (language === 'javascript' || language === 'typescript') {
    switch (framework) {
      case 'express':
        dependencies.express = '^4.18.2';
        dependencies['express-rate-limit'] = '^7.1.5';
        dependencies.helmet = '^7.1.0';
        break;
      case 'fastify':
        dependencies.fastify = '^4.24.3';
        dependencies['@fastify/cors'] = '^8.4.0';
        dependencies['@fastify/helmet'] = '^11.1.1';
        break;
      case 'nestjs':
        dependencies['@nestjs/core'] = '^10.2.7';
        dependencies['@nestjs/common'] = '^10.2.7';
        dependencies['@nestjs/platform-express'] = '^10.2.7';
        dependencies['reflect-metadata'] = '^0.1.13';
        dependencies.rxjs = '^7.8.1';
        break;
      case 'koa':
        dependencies.koa = '^2.14.2';
        dependencies['@koa/cors'] = '^4.0.0';
        dependencies['@koa/router'] = '^12.0.1';
        break;
      default:
        // Default to Express
        dependencies.express = '^4.18.2';
        break;
    }
    
    if (language === 'typescript') {
      dependencies.typescript = '^5.2.2';
      dependencies['@types/node'] = '^20.8.6';
      dependencies['ts-node'] = '^10.9.1';
      dependencies['@types/express'] = '^4.17.21';
    }
  }

  return dependencies;
}

function getDatabaseDependencies(database) {
  const dependencies = {};
  
  switch (database) {
    case 'mongodb':
      dependencies.mongoose = '^7.5.0';
      dependencies['connect-mongo'] = '^5.1.0';
      break;
    case 'mysql':
      dependencies.mysql2 = '^3.6.0';
      dependencies.sequelize = '^6.33.0';
      break;
    case 'postgresql':
      dependencies.pg = '^8.11.3';
      dependencies.sequelize = '^6.33.0';
      dependencies['@types/pg'] = '^8.10.7';
      break;
    case 'sqlite':
      dependencies.sqlite3 = '^5.1.6';
      dependencies.sequelize = '^6.33.0';
      break;
    case 'redis':
      dependencies.redis = '^4.6.10';
      dependencies['connect-redis'] = '^7.1.0';
      break;
    default:
      // No database selected
      break;
  }

  return dependencies;
}

function generateServerCode(workflow, framework = 'express', database, language = 'javascript') {
  let code = '';
  
  // Generate framework-specific server code
  switch (framework) {
    case 'express':
      code = generateExpressServer(workflow, database, language);
      break;
    case 'fastify':
      code = generateFastifyServer(workflow, database, language);
      break;
    case 'nestjs':
      code = generateNestJSServer(workflow, database, language);
      break;
    case 'koa':
      code = generateKoaServer(workflow, database, language);
      break;
    default:
      code = generateExpressServer(workflow, database, language);
      break;
  }
  
  return code;
}

function generateExpressServer(workflow, database, language) {
  let code = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

`;

  // Add database connection code
  if (database) {
    code += generateDatabaseConnection(database);
  }

  // Add database connections from workflow nodes
  const dbNodes = workflow.nodes?.filter(node => node.type === 'database') || [];
  dbNodes.forEach(node => {
    code += generateDatabaseConnection(node);
  });

  // Add route handlers
  const apiNodes = workflow.nodes?.filter(node => node.type === 'api') || [];
  apiNodes.forEach(node => {
    code += generateApiRoutes(node);
  });

  // Add auth middleware
  const authNodes = workflow.nodes?.filter(node => node.type === 'auth') || [];
  if (authNodes.length > 0) {
    code += generateAuthMiddleware(authNodes[0]);
  }

  code += `
// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});
`;

  return code;
}

function generateDatabaseConnection(dbConfig) {
  // Handle both string database types and node objects
  const dbType = typeof dbConfig === 'string' ? dbConfig : dbConfig.data?.dbType;
  const dbName = typeof dbConfig === 'string' ? 'myapp' : (dbConfig.data?.dbName || 'myapp');
  
  switch (dbType) {
    case 'mongodb':
      return `
// MongoDB Connection
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/${dbName}')
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

`;
    case 'mysql':
      return `
// MySQL Connection
const mysql = require('mysql2/promise');
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '${dbName}'
};

const mysqlConnection = mysql.createConnection(dbConfig);
console.log('📦 MySQL connection configured');

`;
    case 'postgresql':
      return `
// PostgreSQL Connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/${dbName}'
});

pool.connect()
  .then(() => console.log('📦 Connected to PostgreSQL'))
  .catch(err => console.error('PostgreSQL connection error:', err));

`;
    case 'sqlite':
      return `
// SQLite Connection
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_PATH || './database.sqlite'
});

sequelize.authenticate()
  .then(() => console.log('📦 Connected to SQLite'))
  .catch(err => console.error('SQLite connection error:', err));

`;
    case 'redis':
      return `
// Redis Connection
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect()
  .then(() => console.log('📦 Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

`;
    default:
      return '';
  }
}

function generateApiRoutes(apiNode) {
  const { endpoints } = apiNode.data;
  let routes = '\n// API Routes\n';
  
  endpoints?.forEach(endpoint => {
    const method = endpoint.method.toLowerCase();
    const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
    
    routes += `app.${method}('${path}', (req, res) => {
  // TODO: Implement ${endpoint.name}
  res.json({ message: '${endpoint.name} endpoint', method: '${method.toUpperCase()}', path: '${path}' });
});

`;
  });
  
  return routes;
}

function generateAuthMiddleware(authNode) {
  return `
// Authentication Middleware
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/auth/login', async (req, res) => {
  // TODO: Implement login logic
  const { email, password } = req.body;
  res.json({ message: 'Login endpoint - implement your logic here' });
});

app.post('/auth/register', async (req, res) => {
  // TODO: Implement registration logic
  const { email, password } = req.body;
  res.json({ message: 'Register endpoint - implement your logic here' });
});

`;
}

function generateEnvFile(workflow, database) {
  let envContent = `# Environment Configuration
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

`;

  // Add main database environment variables
  if (database) {
    envContent += generateDatabaseEnv(database);
  }

  // Add database environment variables from workflow nodes
  const dbNodes = workflow.nodes?.filter(node => node.type === 'database') || [];
  dbNodes.forEach(node => {
    envContent += generateDatabaseEnv(node.data.dbType, node.data.dbName);
  });

  return envContent;
}

function generateDatabaseEnv(dbType, dbName = 'myapp') {
  switch (dbType) {
    case 'mongodb':
      return `# MongoDB
MONGODB_URI=mongodb://localhost:27017/${dbName}

`;
    case 'mysql':
      return `# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=${dbName}

`;
    case 'postgresql':
      return `# PostgreSQL
DATABASE_URL=postgresql://localhost:5432/${dbName}

`;
    case 'sqlite':
      return `# SQLite
SQLITE_PATH=./database.sqlite

`;
    case 'redis':
      return `# Redis
REDIS_URL=redis://localhost:6379

`;
    default:
      return '';
  }
}

async function generateWorkflowFiles(projectPath, workflow) {
  // Create routes directory
  const routesDir = path.join(projectPath, 'routes');
  await fs.ensureDir(routesDir);

  // Create models directory if database nodes exist
  const dbNodes = workflow.nodes?.filter(node => node.type === 'database') || [];
  if (dbNodes.length > 0) {
    const modelsDir = path.join(projectPath, 'models');
    await fs.ensureDir(modelsDir);
  }

  // Create middleware directory
  const middlewareDir = path.join(projectPath, 'middleware');
  await fs.ensureDir(middlewareDir);

  // Create README
  const readmeContent = generateReadme(workflow);
  await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
}

function generateReadme(workflow) {
  return `# Auto-Generated No-Code Backend

This backend was automatically generated based on your workflow design.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Setup

Copy the environment variables from \`.env\` and update them with your actual values.

## API Endpoints

Your server will run on http://localhost:3000

### Health Check
- GET /health - Check if server is running

## Generated Components

${workflow.nodes?.map(node => `- ${node.type}: ${node.data.name || node.type}`).join('\n') || 'No components'}

## Next Steps

1. Update environment variables in \`.env\`
2. Implement your business logic in the generated route files
3. Set up your database connections
4. Test your API endpoints

Happy coding! 🚀
`;
}

async function updateProjectFiles(projectPath, workflow) {
  // Regenerate main files when workflow changes
  const serverCode = generateServerCode(workflow);
  await fs.writeFile(path.join(projectPath, 'index.js'), serverCode);

  const envContent = generateEnvFile(workflow);
  await fs.writeFile(path.join(projectPath, '.env'), envContent);

  // Update package.json dependencies
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  const newDeps = analyzeWorkflowDependencies(workflow);
  Object.assign(packageJson.dependencies, newDeps);
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  console.log(`✅ Updated project files for: ${projectPath}`);
}

function startProjectWatcher(projectPath, projectName) {
  if (projectWatchers.has(projectName)) {
    projectWatchers.get(projectName).close();
  }

  const watcher = chokidar.watch(projectPath, {
    ignored: /node_modules|\.git/,
    persistent: true
  });

  watcher.on('change', (filePath) => {
    io.to(projectName).emit('file-changed', {
      filePath,
      projectName,
      timestamp: new Date().toISOString()
    });
  });

  projectWatchers.set(projectName, watcher);
  console.log(`👀 Started watching project: ${projectName}`);
}

async function installDependencies(projectPath) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    exec(`${command} install`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error('npm install error:', error);
        reject(error);
      } else {
        console.log('✅ Dependencies installed successfully');
        resolve(stdout);
      }
    });
  });
}

const PORT = process.env.SERVER_PORT || 5000;
server.listen(PORT, () => {
  console.log(`🌐 Backend server running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:3000`);
});

# Laravel 12, React, and TypeScript (Vite-Powered)

A modern web application built with Laravel 12 backend and React frontend admin dashboard. This platform provides user authentication, role-based access control, activity logging, and a comprehensive API for data operations.

## 🚀 Features

-   **Authentication System**: Secure login, registration, and password management
-   **Role-Based Access Control**: Granular permissions and user roles
-   **Activity Logging**: Comprehensive audit trail of user actions
-   **RESTful API**: Clean, versioned API endpoints
-   **Modern Frontend**: React with TypeScript, Tailwind CSS, and Material-UI
-   **Real-time Features**: Queue processing and background jobs
-   **Internationalization**: Multi-language support
-   **Responsive Design**: Mobile-friendly interface

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   **PHP 8.2+** with extensions: `bcmath`, `ctype`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`
-   **Composer** (PHP package manager)
-   **Node.js 18+** and **npm** or **pnpm**
-   **MySQL 8.0+** or **PostgreSQL 13+**
-   **Git**

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd folder_name
```

### 2. Install PHP Dependencies

```bash
composer install
```

### 3. Install Node.js Dependencies

```bash
npm install
# or if using pnpm
pnpm install
```

### 4. Environment Configuration

Copy the environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your database and application settings:

```env
APP_NAME="Start Kit"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8001

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# For production, set these appropriately
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS="noreply@yourapp.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### 5. Generate Application Key

```bash
php artisan key:generate
```

### 6. Database Setup

Create your database and run migrations:

```bash
php artisan migrate
```

Seed the database with initial data:

```bash
php artisan db:seed
```

### 7. Build Frontend Assets

For development:

```bash
npm run dev
```

For production:

```bash
npm run build
```

## 🚀 Running the Application

### Development Mode

The easiest way to run the application in development mode is using the provided composer script:

```bash
# For Unix/Linux/macOS
composer run dev

# For Windows
composer run dev:windows
```

This command will start:

-   Laravel development server on `http://localhost:8001`
-   Queue worker for background jobs
-   Vite development server for frontend assets
-   Pail log viewer (if available)

### Manual Setup

If you prefer to run services manually:

1. **Start Laravel Server**:

    ```bash
    php artisan serve
    ```

2. **Start Queue Worker** (in a separate terminal):

    ```bash
    php artisan queue:work
    ```

3. **Start Frontend Development Server** (in a separate terminal):
    ```bash
    npm run dev
    ```

## 📚 API Documentation

### Base URL

```
http://localhost:8001/api/v1
```

### Authentication Endpoints

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| POST   | `/auth/register`        | Register a new user    |
| POST   | `/auth/login`           | User login             |
| POST   | `/auth/admin/login`     | Admin login            |
| POST   | `/auth/google/login`    | Google OAuth login     |
| POST   | `/auth/verify`          | Verify email address   |
| POST   | `/auth/forgot-password` | Request password reset |
| POST   | `/auth/reset-password`  | Reset password         |
| POST   | `/auth/logout`          | Logout user            |

### Protected Endpoints

All protected endpoints require authentication via Bearer token.

#### User Management

-   `GET /users` - List users
-   `POST /users` - Create user
-   `GET /users/{id}` - Get user details
-   `PUT /users/{id}` - Update user
-   `DELETE /users/{id}` - Delete user

#### Role Management

-   `GET /roles` - List roles
-   `POST /roles` - Create role
-   `GET /roles/{id}` - Get role details
-   `PUT /roles/{id}` - Update role
-   `DELETE /roles/{id}` - Delete role

#### Settings

-   `GET /settings` - Get application settings
-   `PUT /settings` - Update settings

#### Activity Logs

-   `GET /logs` - Get activity logs
-   `GET /logs/{id}` - Get specific log entry

### Example API Usage

```bash
# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Get user profile (with token)
curl -X GET http://localhost:8001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🏗️ Project Structure

```
folder-name/
├── app/
│   ├── Http/Controllers/Api/    # API Controllers
│   ├── Models/                  # Eloquent Models
│   ├── Services/                # Business Logic
│   ├── Jobs/                    # Queue Jobs
│   └── Enums/                   # PHP Enums
├── resources/
│   └── js/
│       └── src/
│           ├── components/      # React Components
│           ├── pages/           # Page Components
│           ├── services/        # API Services
│           ├── store/           # Redux Store
│           └── utils/           # Utility Functions
├── routes/
│   └── api/v1/                 # API Route Files
├── database/
│   ├── migrations/              # Database Migrations
│   └── seeders/                # Database Seeders
└── tests/                      # Test Files
```

## 🧪 Testing

Run the test suite:

```bash
composer test
```

Or run specific test files:

```bash
php artisan test --filter=UserTest
```

## 🔧 Configuration

### Database Configuration

The application supports multiple database drivers. Configure in `.env`:

```env
DB_CONNECTION=mysql  # or pgsql, sqlite
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=data_exchange
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Queue Configuration

Configure queue driver in `.env`:

```env
QUEUE_CONNECTION=database  # or redis, sync
```

### Cache Configuration

```env
CACHE_STORE=database  # or redis, file
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**:

    ```bash
    cp .env.example .env
    # Edit .env with production values
    ```

2. **Optimize for Production**:

    ```bash
    composer install --optimize-autoloader --no-dev
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    ```

3. **Build Frontend**:

    ```bash
    npm run build
    ```

4. **Set Up Queue Worker**:
    ```bash
    # Using Supervisor (recommended)
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl start worker
    ```

### Docker Deployment

Create a `docker-compose.yml` file:

```yaml
version: "3.8"
services:
    app:
        build: .
        ports:
            - "8000:8000"
        environment:
            - DB_HOST=mysql
        depends_on:
            - mysql
            - redis

    mysql:
        image: mysql:8.0
        environment:
            MYSQL_DATABASE: data_exchange
            MYSQL_ROOT_PASSWORD: secret
        volumes:
            - mysql_data:/var/lib/mysql

    redis:
        image: redis:alpine

volumes:
    mysql_data:
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Developer Setup (Required)

To enforce `.agent` context updates on every meaningful code change, install the local pre-commit hook once after cloning:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-agent-hook.ps1
```

This hook blocks commits when important project files changed but `.agent` was not updated.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🔄 Updates

To update the application:

```bash
# Update dependencies
composer update
npm update

# Run migrations
php artisan migrate

# Clear caches
php artisan config:clear
php artisan cache:clear
```

---

**Happy Coding! 🎉**

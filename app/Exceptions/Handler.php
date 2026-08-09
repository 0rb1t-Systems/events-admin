<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
        'password_confirmation',
        'token',
        'api_token',
        'remember_token',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // Log the exception for debugging
            if (app()->environment('production')) {
                // In production, only log critical errors
                if ($e instanceof QueryException ||
                    $e instanceof \Error ||
                    $e instanceof \ErrorException ||
                    !($e instanceof HttpException)) {
                    logger()->error('Exception caught', [
                        'exception' => get_class($e),
                        'message' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }
        });

        // Helper closure to determine if the request is for the API
        $isApiRequest = function (Request $request) {
            return $request->is('api/*') || $request->routeIs('api.*');
        };

        // Handle validation exceptions
        $this->renderable(function (ValidationException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatValidationError($e);
            }
            return null;
        });

        // Handle authentication exceptions
        $this->renderable(function (AuthenticationException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatAuthenticationError($e);
            }
            return null;
        });

        // Handle permission/authorization exceptions
        $this->renderable(function (UnauthorizedException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatPermissionError($e);
            }
            return null;
        });

        // Handle access denied exceptions
        $this->renderable(function (AccessDeniedHttpException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatAccessDeniedError($e);
            }
            return null;
        });

        // Handle not found exceptions
        $this->renderable(function (NotFoundHttpException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatNotFoundError($e);
            }
            return null;
        });

        // Handle method not allowed exceptions
        $this->renderable(function (MethodNotAllowedHttpException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatMethodNotAllowedError($e);
            }
            return null;
        });

        // Handle rate limiting exceptions
        $this->renderable(function (TooManyRequestsHttpException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatRateLimitError($e);
            }
            return null;
        });

        // Handle database query exceptions
        $this->renderable(function (QueryException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatDatabaseError($e);
            }
            return null;
        });

        // Handle general HTTP exceptions
        $this->renderable(function (HttpException $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatHttpError($e);
            }
            return null;
        });

        // Handle all other exceptions
        $this->renderable(function (Throwable $e, Request $request) use ($isApiRequest) {
            if ($request->expectsJson() || $isApiRequest($request)) {
                return $this->formatGeneralError($e);
            }
            return null;
        });
    }

    /**
     * Format validation errors
     */
    private function formatValidationError(ValidationException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $e->errors(),
            'status_code' => 422
        ], 422);
    }

    /**
     * Format authentication errors
     */
    private function formatAuthenticationError(AuthenticationException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Authentication required',
            'errors' => [
                'auth' => ['You must be authenticated to access this resource.']
            ],
            'status_code' => 401
        ], 401);
    }

    /**
     * Format permission/authorization errors
     */
    private function formatPermissionError(UnauthorizedException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Permission denied',
            'errors' => [
                'permission' => ['You do not have the required permissions to perform this action.']
            ],
            'status_code' => 403
        ], 403);
    }

    /**
     * Format access denied errors
     */
    private function formatAccessDeniedError(AccessDeniedHttpException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Access denied',
            'errors' => [
                'access' => [$e->getMessage() ?: 'Access to this resource is forbidden.']
            ],
            'status_code' => 403
        ], 403);
    }

    /**
     * Format not found errors
     */
    private function formatNotFoundError(NotFoundHttpException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Resource not found',
            'errors' => [
                'resource' => ['The requested resource could not be found.']
            ],
            'status_code' => 404
        ], 404);
    }

    /**
     * Format method not allowed errors
     */
    private function formatMethodNotAllowedError(MethodNotAllowedHttpException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Method not allowed',
            'errors' => [
                'method' => ['The HTTP method used is not allowed for this endpoint.']
            ],
            'status_code' => 405
        ], 405);
    }

    /**
     * Format rate limit errors
     */
    private function formatRateLimitError(TooManyRequestsHttpException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Rate limit exceeded',
            'errors' => [
                'rate_limit' => ['You have exceeded the rate limit. Please try again later.']
            ],
            'status_code' => 429,
            'retry_after' => $e->getHeaders()['Retry-After'] ?? null
        ], 429);
    }

    /**
     * Format database errors
     */
    private function formatDatabaseError(QueryException $e): JsonResponse
    {
        // Handle integrity constraint violations (unique key violations)
        if ($e->getCode() == 23000) {
            // Check if it's a uniqueness constraint violation
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
                // Try to extract the duplicate value and the column name
                preg_match("/Duplicate entry '(.*?)' for key '(.*?)'/", $e->getMessage(), $matches);

                $duplicateValue = $matches[1] ?? 'a value';
                $keyName = $matches[2] ?? 'unknown';

                // Convert DB key name to a more readable format
                $keyParts = explode('_', $keyName);
                $tableName = $keyParts[0] ?? '';
                $columnName = isset($keyParts[1]) ? str_replace('_unique', '', $keyParts[1]) : 'field';

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => [
                        $columnName => ["The $columnName '$duplicateValue' already exists."]
                    ],
                    'status_code' => 422
                ], 422);
            }

            // Handle foreign key constraint violations
            if (str_contains($e->getMessage(), 'foreign key constraint')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Operation failed',
                    'errors' => [
                        'reference' => ['This operation would violate data integrity constraints.']
                    ],
                    'status_code' => 422
                ], 422);
            }
        }

        // Handle connection errors
        if (str_contains($e->getMessage(), 'Connection refused') ||
            str_contains($e->getMessage(), 'Connection timed out')) {
            return response()->json([
                'success' => false,
                'message' => 'Database connection failed',
                'errors' => [
                    'database' => ['Unable to connect to the database. Please try again later.']
                ],
                'status_code' => 503
            ], 503);
        }

        // For all other database errors, return a generic error message
        $message = app()->environment('production')
            ? 'A database error occurred. Please try again later.'
            : $e->getMessage();

        return response()->json([
            'success' => false,
            'message' => 'Database operation failed',
            'errors' => [
                'database' => [$message]
            ],
            'status_code' => 500
        ], 500);
    }

    /**
     * Format HTTP errors
     */
    private function formatHttpError(HttpException $e): JsonResponse
    {
        $statusCode = $e->getStatusCode();
        $message = $e->getMessage() ?: $this->getDefaultHttpErrorMessage($statusCode);

        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => [
                'http' => [$message]
            ],
            'status_code' => $statusCode
        ], $statusCode);
    }

    /**
     * Format general errors
     */
    private function formatGeneralError(Throwable $e): JsonResponse
    {
        // Determine the appropriate status code
        $statusCode = 500;
        if ($e instanceof HttpException) {
            $statusCode = $e->getStatusCode();
        }

        // Determine the error message
        $message = app()->environment('production')
            ? 'An unexpected error occurred. Please try again later.'
            : $e->getMessage();

        return response()->json([
            'success' => false,
            'message' => 'Server error',
            'errors' => [
                'server' => [$message]
            ],
            'status_code' => $statusCode,
            'debug' => app()->environment('production') ? null : [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]
        ], $statusCode);
    }

    /**
     * Get default HTTP error messages
     */
    private function getDefaultHttpErrorMessage(int $statusCode): string
    {
        return match ($statusCode) {
            400 => 'Bad request. Please check your request and try again.',
            401 => 'Authentication required.',
            403 => 'Access denied.',
            404 => 'Resource not found.',
            405 => 'Method not allowed.',
            408 => 'Request timeout.',
            409 => 'Conflict in request.',
            410 => 'Resource no longer available.',
            422 => 'Validation failed.',
            429 => 'Too many requests.',
            500 => 'Internal server error.',
            501 => 'Not implemented.',
            502 => 'Bad gateway.',
            503 => 'Service unavailable.',
            504 => 'Gateway timeout.',
            default => 'An error occurred.',
        };
    }
}

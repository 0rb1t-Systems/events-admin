<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', config('app.name'))</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: @yield('header-color', '#4F46E5');
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px 20px;
            background-color: #f9f9f9;
        }
        .content h2 {
            color: #333;
            margin-top: 0;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            background-color: #f8f8f8;
            border-top: 1px solid #e0e0e0;
        }
        .footer a {
            color: #4F46E5;
            text-decoration: none;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: @yield('button-color', '#4F46E5');
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .code-box {
            font-size: 28px;
            font-weight: bold;
            color: @yield('code-color', '#4F46E5');
            text-align: center;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            margin: 20px 0;
            border: 2px solid @yield('code-color', '#4F46E5');
        }
        .warning {
            background-color: #FEF3C7;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #F59E0B;
        }
        .success {
            background-color: #D1FAE5;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #10B981;
        }
    </style>
</head>
<body>
    <div class="container">
        @include('mail.partials.header')

        <div class="content">
            @yield('content')
        </div>

        @include('mail.partials.footer')
    </div>
</body>
</html>

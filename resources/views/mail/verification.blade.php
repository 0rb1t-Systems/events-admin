@extends('mail.layout')

@section('title', 'Verify Your Email Address')
@section('header-color', '#4F46E5')
@section('header-title', config('app.name'))
@section('header-subtitle', 'Email Verification')
@section('code-color', '#4F46E5')

@section('content')
<h2>Hello {{ $user_name }},</h2>

<p>Thank you for registering with {{ config('app.name') }}! To complete your account setup, please verify your email address using the verification code below:</p>

<div class="code-box">
    {{ $verification_code }}
</div>

<div class="warning">
    <strong>Important:</strong> This code will expire in 30 minutes for security purposes.
</div>

<p>If you did not create an account, please ignore this email.</p>

@endsection

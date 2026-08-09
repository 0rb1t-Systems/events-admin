@extends('mail.layout')

@section('title', 'Welcome to ' . config('app.name'))
@section('header-color', '#10B981')
@section('header-title', 'Welcome to ' . config('app.name') . '!')
@section('button-color', '#10B981')

@section('content')
<h2>Hello {{ $user_name }},</h2>

<p>Welcome to {{ config('app.name') }}! We are excited to have you as part of our community.</p>

<p>Your account has been successfully created and verified. You can now access all the features available in our platform.</p>

<div class="success">
    <strong>What's next?</strong> Explore our platform and discover all the amazing features we have to offer!
</div>

<p>If you have any questions or need assistance, feel free to contact our support team.</p>

<p>Thank you for choosing {{ config('app.name') }}!</p>

@endsection

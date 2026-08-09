<div class="header">
    <h1>@yield('header-title', config('app.name'))</h1>
    @hasSection('header-subtitle')
        <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">@yield('header-subtitle')</p>
    @endif
</div>

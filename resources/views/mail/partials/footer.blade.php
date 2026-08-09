<div class="footer">
    <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
    <p>Visit us at <a href="www.ifiyedigital.com">www.ifiyedigital.com</a></p>
    @hasSection('footer-extra')
        @yield('footer-extra')
    @endif
</div>

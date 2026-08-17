<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Concerns\SignsApiClientRequests;

abstract class TestCase extends BaseTestCase
{
    use SignsApiClientRequests;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpApiClient();
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public static function pageProvider(): array
    {
        return [
            'chat' => ['/'],
            'documents' => ['/documents'],
            'questions' => ['/questions'],
            'analytics' => ['/analytics'],
        ];
    }

    /**
     * @dataProvider pageProvider
     */
    public function test_the_application_returns_a_successful_response(string $path): void
    {
        $response = $this->get($path);

        $response->assertStatus(200);
        $response->assertSee('<div id="app">', false);
    }
}

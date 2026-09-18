<?php

namespace Tests\Feature;

use Tests\TestCase;

class WidgetTest extends TestCase
{
    public function test_the_demo_page_embeds_the_widget_script(): void
    {
        $response = $this->get('/widget-demo');

        $response->assertStatus(200);
        $response->assertSee('src="/widget.js"', false);
    }

    public function test_the_widget_script_is_published(): void
    {
        $this->assertFileExists(public_path('widget.js'));
    }

    /**
     * The widget runs on somebody else's domain, so the chat endpoint has to
     * answer cross-origin requests. Nothing in the app depends on that today,
     * which is exactly why it needs a test.
     */
    public function test_the_chat_endpoint_allows_cross_origin_requests(): void
    {
        $response = $this->call('OPTIONS', '/api/chat/stream', server: [
            'HTTP_ORIGIN' => 'https://example.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $response->assertStatus(204);
        $response->assertHeader('Access-Control-Allow-Origin', '*');
    }
}

<?php

namespace Tests\Feature;

use App\Jobs\ChunkDocument;
use App\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class QuestionReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_questions_can_be_filtered_for_review(): void
    {
        Question::create(['question' => 'Unanswered question', 'status' => 'needs_review']);
        Question::create(['question' => 'Answered question', 'status' => 'answered']);

        $this->getJson('/api/questions?status=needs_review')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.question', 'Unanswered question');
    }

    public function test_review_question_creates_and_queues_knowledge_document(): void
    {
        Queue::fake();
        $question = Question::create([
            'question' => 'How are ETFs taxed?',
            'status' => 'needs_review',
        ]);

        $response = $this->postJson("/api/questions/{$question->id}/resolve", [
            'title' => 'ETF taxation',
            'content' => 'ETFs are taxed according to the applicable local rules.',
        ]);

        $response->assertOk()
            ->assertJsonPath('question.status', 'resolved')
            ->assertJsonPath('document.title', 'ETF taxation');
        $this->assertDatabaseHas('documents', [
            'title' => 'ETF taxation',
            'indexing_status' => 'queued',
        ]);
        Queue::assertPushed(ChunkDocument::class);
        $this->assertSame('resolved', $question->refresh()->status);
    }
}

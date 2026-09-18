<?php

namespace Tests\Feature;

use App\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_positive_feedback_is_saved(): void
    {
        $question = Question::create([
            'question' => 'What is an ETF?',
            'answer' => 'An ETF tracks an index.',
        ]);

        $response = $this->postJson("/api/questions/{$question->id}/feedback", [
            'rating' => 1,
        ]);

        $response->assertOk()->assertJsonPath('rating', 1);
        $this->assertDatabaseHas('questions', [
            'id' => $question->id,
            'status' => 'answered',
        ]);
    }

    public function test_negative_feedback_marks_question_for_review(): void
    {
        $question = Question::create([
            'question' => 'How are ETFs taxed?',
            'answer' => 'The answer is incomplete.',
        ]);

        $response = $this->postJson("/api/questions/{$question->id}/feedback", [
            'rating' => 0,
            'feedback' => 'The answer needs a source about taxes.',
        ]);

        $response->assertOk()->assertJsonPath('status', 'needs_review');
        $this->assertDatabaseHas('questions', [
            'id' => $question->id,
            'rating' => 0,
            'feedback' => 'The answer needs a source about taxes.',
            'status' => 'needs_review',
        ]);
    }
}

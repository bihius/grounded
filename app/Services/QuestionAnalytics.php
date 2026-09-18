<?php

namespace App\Services;

use App\Models\Question;
use Illuminate\Support\Facades\DB;

class QuestionAnalytics
{
    public function __construct(private EmbeddingGenerator $embeddings) {}

    public function report(): array
    {
        $questions = Question::query()->get(['id', 'question', 'status', 'rating']);
        $statusCounts = $questions->countBy('status');
        $ratingCounts = $questions->whereNotNull('rating')->countBy('rating');

        return [
            'summary' => [
                'total' => $questions->count(),
                'answered' => $statusCounts->get('answered', 0),
                'needs_review' => $statusCounts->get('needs_review', 0),
                'resolved' => $statusCounts->get('resolved', 0),
                'positive_ratings' => $ratingCounts->get(1, 0),
                'negative_ratings' => $ratingCounts->get(0, 0),
                'unrated' => $questions->whereNull('rating')->count(),
            ],
            'most_asked' => $this->mostAsked($questions),
            'similar_groups' => $this->similarGroups(),
            'needs_review' => Question::where('status', 'needs_review')->latest()->limit(10)->get(),
        ];
    }

    private function mostAsked($questions): array
    {
        return $questions->groupBy('question')->map(fn ($items, $question) => [
            'question' => $question,
            'count' => $items->count(),
        ])->sortByDesc('count')->take(10)->values()->all();
    }

    private function similarGroups(): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            return [];
        }

        $this->generateMissingEmbeddings();
        $questions = DB::table('questions')
            ->whereNotNull('embedding')
            ->select('id', 'question', 'embedding')
            ->get();
        $groups = [];
        $threshold = config('services.rag.question_similarity', 0.8);

        foreach ($questions as $question) {
            $vector = $this->parseVector($question->embedding);
            $groupIndex = collect($groups)->search(
                fn ($group) => $this->similarity($vector, $group['vector']) >= $threshold
            );

            if ($groupIndex === false) {
                $groups[] = ['vector' => $vector, 'questions' => [$question]];

                continue;
            }

            $groups[$groupIndex]['questions'][] = $question;
        }

        return collect($groups)->filter(fn ($group) => count($group['questions']) > 1)
            ->map(fn ($group) => [
                'count' => count($group['questions']),
                'questions' => collect($group['questions'])->map(fn ($question) => [
                    'id' => $question->id,
                    'question' => $question->question,
                ])->values(),
            ])->values()->all();
    }

    private function generateMissingEmbeddings(): void
    {
        Question::whereNull('embedding')->each(function (Question $question): void {
            $vector = '['.implode(',', $this->embeddings->generate($question->question)).']';
            DB::table('questions')->where('id', $question->id)->update(['embedding' => $vector]);
        });
    }

    private function parseVector(string $vector): array
    {
        return array_map('floatval', explode(',', trim($vector, '[]')));
    }

    private function similarity(array $left, array $right): float
    {
        $dot = $leftLength = $rightLength = 0;
        foreach ($left as $index => $value) {
            $dot += $value * $right[$index];
            $leftLength += $value ** 2;
            $rightLength += ($right[$index] ?? 0) ** 2;
        }

        return $dot / (sqrt($leftLength) * sqrt($rightLength));
    }
}
